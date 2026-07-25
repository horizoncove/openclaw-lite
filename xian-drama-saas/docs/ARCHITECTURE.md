# 微短剧产业服务 SaaS · 技术设计文档（模块详规）

> 版本：**V1.3.1**  
> 日期：2026-07-25  
> **整体架构请先读：[SAAS_ARCHITECTURE.md](./SAAS_ARCHITECTURE.md) T1.0**  
> 需求总册：[REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md) R1.0 · 功能详规：[PRD.md](./PRD.md)  
> 结算：**D1.3 进/转/出**（订单 T 托管 + 官方回收）；无转售；XD-Router + Compute  
>  
> **注意：** 本文保留模块级细节。与 T1.0 冲突时以 **SAAS_ARCHITECTURE** 与 **D1.3** 为准。现行实现以 [API_CONTRACT.md](./API_CONTRACT.md) 为准，差距见 [P1_BOUNDARY.md](./P1_BOUNDARY.md)。

---

## 1. 设计目标

1. 会员主路径：项目、需求、**撮合订单**、进度、通知  
2. **XD-Router**：OpenAI 兼容聚合 + **Tokens** 计量  
3. **Compute Scheduler**：异步作业 + 预扣/释放  
4. 钱包仅官方购额/消耗/退款/调账  
5. 出海等通过 `service_requests` 挂项目  
6. 对外演示壳可对接沙箱 API，但不得伪造生产合规能力  

---

## 2. 逻辑架构

```
                 ┌──────── Member Web / Demo Shell ────────┐
                 │ 工作台 需求 订单 钱包 网关 算力 通知      │
                 └──────────────────┬──────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  Platform API                 XD-Router                   Scheduler
  projects/demands             /v1/chat/*                  compute jobs
  match_orders/notices         计量 Tokens                 预扣/释放
  service_requests             usage_records               job_events
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                                    ▼
                     PostgreSQL · Redis · Object Storage
```

专业服务营销站 → 仅 `POST service_requests`（或等价进件），不单独持有钱包账本。

---

## 3. 权限与可见性

- `tenant_id` + `org_id` 隔离  
- `demands`：发布后 `visibility=alliance` 锁定  
- 草稿仅本机构；广场：`published|matching|deal`  
- 「我应征的」= 当前用户/机构的 `demand_applications`  

权限（逻辑名）：

`project:*` `demand:publish|apply|confirm` `order:read`  
`wallet:purchase|read` `router:invoke|admin`  
`compute:submit|operate` `notice:*` `match:facilitate`  
`service:request|operate`

**删除** `token:resell` 及任何 org→org 余额转移。

---

## 4. 数据模型（V1.3 要点）

### 4.1 需求与应征

```
demands(..., category, status, visibility, budget_text, budget_tokens null)
demand_applications(..., status: pending|accepted|rejected)
```

`category ∈ {翻译,配音,IP授权,海外发行,算力协助,其他}`  
`status ∈ {draft,published,matching,deal,closed}`

### 4.2 撮合订单（新增）

```
match_orders(
  id, demand_id, publisher_org_id, applicant_org_id,
  amount_text,          -- 展示用（可含分账描述）
  amount_tokens null,   -- 可选 Tokens 报价快照
  currency_amount null, -- 可选法币托管金额
  node,                 -- escrowed|...
  status,               -- escrowed|in_progress|released|disputed|closed
  created_at, updated_at
)
```

**约束：** 不提供无订单 `transfer_tokens(from_org, to_org)`。放款必须经 `match_orders`：需求方冻结 → 托管 → 供给方 `earned`（扣平台撮合费）。禁止「直接改两家余额」伪装转让。

### 4.3 Tokens 钱包（D1.3）

```
wallets(org_id, purchased, earned, frozen, bonus, api_key_hash, status)
token_packages(id, cny_price, tokens, bonus, ...)
token_orders(id, org_id, package_id, cny_paid, tokens_credited, status)
token_ledger(id, org_id, type, bucket, amount_tokens, balance_after, note, ref, created_at)
redeem_requests / redeem_payouts
```

`type ∈ {purchase,freeze,unfreeze,consume,earn_release,fee,burn_redeem,refund,adjust,…}`  
禁止：`token_resale_*`、会员互兑 API

### 4.4 API 聚合

```
llm_providers / llm_models / routing_policies
api_keys(org_id, key_hash, name, scopes, revoked_at)
usage_records(org_id, project_id, model_id, req_id,
              prompt_tokens, completion_tokens, cost_tokens, latency_ms, status, ...)
```

### 4.5 算力

```
compute_pools / compute_nodes
compute_jobs(..., cost_tokens, status, ...)
compute_job_events(...)
```

状态机同 PRD；**failed / cancelled → 释放预扣并写 ledger 退款**。

### 4.6 出海工单

```
service_requests(id, org_id, project_id, service_code, status, payload, ...)
```

`service_code` 示例：`OS-TRANSLATE` `OS-DISTRIBUTE` …

### 4.7 通知

`notices` + `notice_receipts`；`link_type/link_id` 支持跳转。

---

## 5. XD-Router

### 5.1 协议

- P0：`POST /v1/chat/completions` `GET /v1/models`  
- P2：`/v1/images` `/v1/audio/speech` `/v1/translations` 等  

鉴权：`Authorization: Bearer <org_api_key>`

### 5.2 流水线（目标）

1. 鉴权 → org  
2. 限流 RPM/TPM  
3. **估费 + 余额预检**（不足则 402，结束）  
4. 路由  
5. Provider 调用  
6. **成功** → `usage_records` + ledger 扣 Tokens；失败 → 不扣或自动退（配置）  
7. 返回结果  

### 5.3 错误

- `402` `INSUFFICIENT_BALANCE`  
- `429` 限流  
- 上游 5xx：默认不扣费  

---

## 6. 算力调度

- `POST /api/v1/compute/jobs` 预扣  
- Phase 1：`POST .../transition`（ops）  
- Phase 1.1：`/internal/compute/lease|heartbeat|complete`  
- 成功通知：`notices` 或 project event  

---

## 7. 平台 API 摘要（目标前缀 `/api/v1`）

| 区域 | 路径 |
|------|------|
| 项目/任务 | `/projects` `/tasks` |
| 需求 | `/demands?scope=plaza\|mine\|applied` `/demands/:id/apply` `/confirm` |
| 订单 | `/match-orders` |
| 工作台 | `/workspace/summary` |
| 通知 | `/notices` |
| 钱包 | `/wallet` `/wallet/purchase` |
| 算力 | `/compute/jobs` `/compute/jobs/:id/transition` |
| 出海 | `/service-requests` |
| 管理 | `/admin/models` `/admin/policies` `/admin/compute/pools` |
| 网关 | `/v1/chat/completions` `/v1/models` |

现行实现若缺路径，见 API_CONTRACT「缺口」；实现后必须回写契约。

---

## 8. 前端 IA

对齐 PRD §5 V1.3。钱包/网关展示单位为 **Tokens**；购额区展示 `¥ → T`。  
订单页脚注：**托管放款 = 订单内 T 结算，≠ 自由互转/兑换所**。

---

## 9. Phase 1 工程顺序（修订）

1. Org/User  
2. Project/Task/Workspace（含逾期 seed）  
3. Demand + applied scope + confirm  
4. **Match orders**  
5. Wallet Tokens + Purchase + Ledger  
6. XD-Router（预检后扣费）+ usage_records（可先最小表）  
7. Compute + failed 退款 + 成功通知  
8. Notices  
9. 安全：reset 保护、弱化可伪造身份  
10. E2E / `p1-smoke.sh` = ACCEPTANCE  

---

## 10. 安全

- API Key 只存 hash；明文仅创建/轮换响应  
- 推理与管理权限分离  
- `audit_logs`：购额、调账、改路由、撤 Key、订单放款操作  
- 公网演示：禁止无鉴权 reset  

---

## 11. 明确删除

- `token_resale_*`、余额转让 API  
- 已发布需求的 private 可见性  
- MVP 一级导航中的版权链 / 热度生产话术  

---

## 变更记录

| 版本 | 说明 |
|------|------|
| V1.1 | 会员中枢；含转售 |
| V1.2 | 全联盟；砍转售；Router+Scheduler |
| V1.2-doc | 契约分栏 |
| **V1.3** | match_orders；service_requests；计费流水线纠偏；延期域划界 |
| **V1.3.1** | 指向 SAAS_ARCHITECTURE T1.0；钱包分桶与订单 T 托管对齐 D1.3 |
