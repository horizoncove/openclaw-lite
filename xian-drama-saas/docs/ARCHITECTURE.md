# 微短剧产业服务 SaaS · 技术设计文档

> 版本：V1.2 Draft  
> 日期：2026-07-24  
> 对应需求：[PRD.md](./PRD.md) V1.2  
> 决策：工作需求全联盟可见；**无转售**；建设 **API 聚合网关 + 算力调度**。  
>  
> **注意：** 本文描述**目标架构**。现行实现以 [API_CONTRACT.md](./API_CONTRACT.md) 为准，差距见 [P1_BOUNDARY.md](./P1_BOUNDARY.md)。

---

## 1. 设计目标

1. 会员主路径：项目、全联盟需求、进度、撮合、通知  
2. **XD-Router**：OpenAI 兼容的多模型 API 聚合与计量  
3. **Compute Scheduler**：异步算力作业队列与状态机  
4. 钱包仅支持官方充值/消耗/退款，不支持机构间转让  
5. 出海等专业能力通过 `service_requests` 挂接项目  

---

## 2. 逻辑架构

```
                    ┌──────── Member Web ────────┐
                    │ 项目/需求/进度/通知/钱包    │
                    └─────────────┬──────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
   Platform API              XD-Router                 Scheduler
   (CRUD/RBAC)            (同步推理网关)              (异步算力)
         │                        │                        │
         │                        ├─ Provider Adapters ────┤
         │                        │  DeepSeek/Qwen/...     │
         │                        │  GPU Workers           │
         ▼                        ▼                        ▼
                    PostgreSQL · Redis · Object Storage
```

---

## 3. 权限与可见性

- `tenant_id` + `org_id` 隔离私有数据  
- `demands`：**发布后 `visibility = alliance` 固定**；列表接口对所有认证会员可读  
- 草稿仅创建机构可见  

权限：

- `project:*` `demand:publish|apply|confirm`  
- `wallet:purchase` `wallet:read`  
- `router:invoke` `router:admin`  
- `compute:submit` `compute:operate`  
- `notice:*` `match:facilitate`  

**删除** `token:resell` 及相关表。

---

## 4. 数据模型（增量要点）

### 4.1 需求

`demands.visibility` 默认 `alliance`；发布动作校验并锁定。

### 4.2 钱包与账本（无转售表）

```
wallets(org_id, balance, api_key_hash, status)
token_packages
token_orders              -- 官方购买
token_ledger              -- 充值/消耗/退款/调账
```

禁止：`token_resale_*`

### 4.3 API 聚合

```
llm_providers(id, name, base_url, auth_ref, status)
llm_models(id, provider_id, model_key, modality, price_in, price_out, status, tags)
routing_policies(id, name, rules jsonb)   -- 任务类型→候选模型
api_keys(id, org_id, key_hash, name, scopes, revoked_at)
usage_records(id, org_id, project_id, model_id, req_id,
              prompt_tokens, completion_tokens, cost, latency_ms, status, created_at)
```

### 4.4 算力调度

```
compute_pools(id, name, type, capacity, status)
compute_nodes(id, pool_id, endpoint, heartbeat_at, status)
compute_jobs(id, org_id, project_id, pool_id, job_type, priority,
             payload jsonb, status, cost, error, created_at, started_at, finished_at)
compute_job_events(id, job_id, from_status, to_status, at, note)
```

作业状态机：

```
queued → running → succeeded
                → failed → (retry) queued
queued/running → cancelled
```

---

## 5. XD-Router（API 聚合）设计

### 5.1 对外协议

兼容：

- `POST /v1/chat/completions`  
- `GET /v1/models`  
- Phase 2：`/v1/images/generations` 等  

鉴权：`Authorization: Bearer <org_api_key>`

### 5.2 请求处理流水线

1. 鉴权 → 解析 org  
2. 限流（Redis token bucket：RPM/TPM）  
3. 估费/余额预检  
4. 路由：显式 `model` 或 policy 选择  
5. 调用 Provider Adapter（超时、重试、熔断）  
6. 计量写入 `usage_records` + `token_ledger` 扣费  
7. 返回上游结果（可剥离上游品牌头）  

### 5.3 Adapter 接口

```ts
interface LlmProviderAdapter {
  chat(req: ChatRequest, cfg: ProviderConfig): Promise<ChatResponse & { usage: Usage }>;
  health(): Promise<"ok" | "degraded" | "down">;
}
```

上游 Key 存 KMS/环境密钥，不进前端。

### 5.4 失败与计费

- 上游 5xx：不扣费或按策略半价（配置项），记失败用量  
- 余额不足：`402` + `INSUFFICIENT_BALANCE`  
- 限流：`429`

---

## 6. 算力调度设计

### 6.1 提交

`POST /api/v1/compute/jobs`

```json
{
  "projectId": "...",
  "jobType": "subtitle_batch",
  "priority": "normal",
  "payload": { "assetId": "...", "targetLang": "en" }
}
```

### 6.2 Worker 协议（Phase 1 可简化）

- 平台将 job 置 `queued`  
- Worker `POST /internal/compute/lease` 领取  
- 心跳 `POST /internal/compute/jobs/:id/heartbeat`  
- 完成 `POST /internal/compute/jobs/:id/complete`（结果 URI + 用量）  

Phase 1 允许「运维台人工点完成」模拟 Worker，保证产品闭环。

### 6.3 调度策略（P0）

- 单池 FIFO + priority 插队  
- 并发槽位 = pool.capacity  
- 超时回收 lease  

Phase 2：多池、亲和性、失败转移到备池。

---

## 7. 平台 API 摘要

| 区域 | 路径 |
|------|------|
| 项目/任务 | `/projects`, `/tasks` |
| 需求广场 | `/demands`（联盟可读）, `/demands/:id/apply` |
| 工作台 | `/workspace/summary` |
| 通知 | `/notices` |
| 钱包 | `/wallet`, `/wallet/purchase`, `/wallet/ledger` |
| 路由管理 | `/admin/models`, `/admin/policies` |
| 算力 | `/compute/jobs`, `/admin/compute/pools` |
| 兼容网关 | `/v1/chat/completions`, `/v1/models` |

---

## 8. 前端信息架构

会员端增加 **「API 与算力」**：

- Key 管理、模型目录与价格  
- 用量图表与流水  
- 作业列表（提交/取消/日志）  
- 充值套餐  

**不出现**转售/挂单页面。

---

## 9. Phase 1 工程顺序

1. Org/User/RBAC  
2. Project/Task/Workspace  
3. Demand 广场（alliance 可见）  
4. Wallet + Purchase + Ledger  
5. XD-Router Chat 网关 + usage  
6. Compute Job 最小队列 + 人工/模拟 Worker  
7. Notices + Opportunities  
8. E2E：PRD §8  

---

## 10. 安全

- API Key 仅哈希存储；创建时展示一次  
- 上游 Provider 密钥与租户隔离  
- 管理接口与推理接口域名/路径隔离（可用同域不同前缀）  
- 全量 `audit_logs`：购额、调账、改路由、撤 Key  

---

## 11. 明确删除的设计

- `token_resale_listings` / `token_resale_trades`  
- 任何「余额转让」API  
- 需求 `visibility=private` 作为已发布选项  

---

## 变更记录

| 版本 | 说明 |
|------|------|
| V1.1 | 会员中枢；含转售 |
| V1.2 | 全联盟需求；砍转售；XD-Router + Compute Scheduler |
| V1.2-doc | 标明目标架构 vs 现行契约；联调改以 API_CONTRACT 为准 |
