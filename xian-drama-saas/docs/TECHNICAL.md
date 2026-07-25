# 微短剧会员协作中枢 · 技术文档（整合版）

> 版本：**T2.0**  
> 日期：2026-07-25  
> 状态：**技术主入口（整合）**  
> 需求对照：[REQUIREMENTS.md](./REQUIREMENTS.md) **R2.0**  
> 现行契约：[API_CONTRACT.md](./API_CONTRACT.md) · 差距：[P1_BOUNDARY.md](./P1_BOUNDARY.md)  
> 专题：结算 D1.3 · 监督 [SUPERVISION_VIEW.md](./SUPERVISION_VIEW.md) · 模块旧稿 ARCHITECTURE.md

---

## 0. 架构一句话

> 单仓 **Web + API** 多租户 SaaS：  
> **撮合域（A）+ 结算域（Token 进/转/出）** 为核；  
> **产能域（B）**、**服务域（C）**、**治理/监督域（D）**、**回收（R）** 为卫星；  
> 会员看工作台，监管看监督视角，账本只允许经结算域改余额。

---

## 1. 系统上下文

```
┌──────── 会员浏览器 /app ────────┐    ┌──── 上游 LLM / 算力 ────┐
│ 工作台 需求 订单 钱包 算力 通知   │    │ OpenAI 兼容 Provider    │
│ 监管：/app/supervision           │    └──────────▲─────────────┘
└────────────────┬────────────────┘               │
                 │ HTTPS                          │
                 ▼                                │
┌────────────────┴────────────────────────────────┴────────────┐
│                 会员协作中枢 SaaS                               │
│  Platform API (/api/v1)   XD-Router (/v1)   Compute Scheduler │
│  业务·结算·监督概览        Chat 计量          作业预扣/释放      │
│                         ▼                                      │
│              PostgreSQL（目标）· JSON Store（现行 P1）· Redis    │
└────────────┬───────────────────────────────┬───────────────────┘
             ▼                               ▼
     秘书处仲裁 / 监督催办              对公出纳（回收可半人工）
```

边界外（本期不伪称全自动）：银行网关、税务开票引擎、司法存证链。

---

## 2. 逻辑分层与有界上下文

```
体验层   React SPA：会员 IA + 监管监督页 + 演示壳进件
应用层   Identity · Workspace · Demand · MatchOrder · Wallet
         RouterBilling · Compute · Notice · ServiceRequest
         Supervision · Admin · Redeem
领域层   多租户 · 撮合状态机 · 分桶账本 · 作业状态机 · 护栏规则
基础设施 JSON/PG · Provider Adapter · 审计日志 · 对象存储（后）
```

| 上下文 | 职责 | 关键对象 |
|--------|------|----------|
| Identity | 用户机构角色会话 | User, Org, Membership |
| Collaboration | 项目任务工作台 | Project, Task |
| Marketplace (A) | 需求应征订单 | Demand, Application, MatchOrder |
| Settlement | 购额分桶托管回收账期 | Wallet, Ledger, RedeemRequest |
| Capacity (B) | 网关算力 | ApiKey, UsageRecord, ComputeJob |
| ProService (C) | 出海工单 | ServiceRequest |
| Governance (D) | 通知仲裁监督护栏 | Notice, AuditLog, SupervisionOverview |
| Redeem (R) | 销毁兑出 | RedeemRequest, RedeemPayout |

**硬规则：** 只有 Settlement 可写会员 T 余额；Router/Compute 经其扣减；Supervision **只读聚合**（动作跳转业务写接口）。

---

## 3. A/B/C/D/R 技术映射

| 环 | 技术落点 | 关键 API（目标/现行） |
|----|----------|----------------------|
| **A** | demands / applications / match_orders + freeze/release | `/demands*` `/match-orders*` |
| **B** | wallet purchase + router + jobs | `/wallet*` `/v1/chat/*` `/compute/jobs*` |
| **C** | service_requests | `/service-requests*` |
| **D** | notices + **supervision/overview** + 仲裁 | `/notices*` `/supervision/overview` |
| **R** | redeem_requests / payouts | `/wallet/redeems*`（P1.1） |

---

## 4. 结算域（Token 进/转/出）

### 4.1 分桶

```
wallets(org_id, purchased, earned, frozen, bonus, api_key_hash, status)
```

扣序：`bonus → purchased → earned`  
展示：可用 / 冻结 / 可回收（earned 过冷却部分）

### 4.2 撮合托管

```
confirm → match_order(escrowed)
       → freeze(publisher)
       → in_progress
       → release: earned(supplier) += T−fee; platform_fee_bucket += fee
       → disputed | closed
```

禁止：`transfer(orgA,orgB)` 无订单接口。

### 4.3 回收

```
requested → under_review → approved → burning → payout_pending → paid
```

仅 earned；`amount_¥ = amount_t × P_redeem`；逾期应收先冲或阻断。

### 4.4 账本类型

`purchase` `freeze` `unfreeze` `consume` `earn_release` `fee`  
`burn_redeem` `refund` `adjust` `fiat_payout_offset`

---

## 5. 监管监督子系统（D）

### 5.1 目标

把飞轮健康与例外队列产品化，供 `secretariat` / `ops` 每日操作。

### 5.2 API

```
GET /api/v1/supervision/overview
Auth: 登录用户且 role ∈ {secretariat, ops}
Else: 403 FORBIDDEN
```

响应骨架：

```json
{
  "flywheel": { "score": 0, "openDemands": 0, "pendingApplications": 0, "deals": 0, "escrowedOrders": 0, "disputedOrders": 0 },
  "queues": {
    "pendingConfirm": [],
    "silentDemands": [],
    "disputedOrders": [],
    "overdueTasks": [],
    "failedJobs": []
  },
  "capacity": { "activeJobs": 0, "failedJobs": 0, "memberOrgCount": 0, "totalWalletBalance": 0, "totalUsedThisMonth": 0 },
  "guardrails": {
    "tokenResaleEnabled": false,
    "peerTransferEnabled": false,
    "freeFxEnabled": false,
    "purchasedRedeemEnabled": false,
    "notes": []
  },
  "actions": [{ "id": "", "label": "", "href": "", "count": 0 }]
}
```

### 5.3 前端

- 路由：`/app/supervision`  
- 布局：监管角色侧栏置顶「监督视角」；深色监管壳  
- 组成：健康分 Hero · 三柱指标 · 行动条 · 队列栅格 · 护栏灯  
- **只读**；催办 = 跳转已有写接口页面  

### 5.4 健康分（现行启发式，可配置化）

加分：有开放需求、有应征、有成交/放款痕迹、无静默需求  
减分：争议单、失败作业过多  
输出 0–100，监督页展示，不作计费依据。

### 5.5 演进

| 阶段 | 能力 |
|------|------|
| 已落地 | overview API + 页面 + 护栏灯 + 待确认/无应征队列 |
| P1.1 | 争议/回收队列接入真实 match_orders / redeem |
| P2 | 周报导出、异常对敲规则、订阅告警 |

---

## 6. 产能平面（B）

### 6.1 XD-Router

```
Key 鉴权 → 限流 → 估费预检 → Provider → 成功 consume + usage_records
                              → 失败不扣/自动退
```

`402 INSUFFICIENT_BALANCE` 时不调上游。

### 6.2 Compute

```
queued → running → succeeded | failed
         ↘ cancelled；failed 可 retry→queued
```

创建预扣；成功实扣；失败/取消释放。

---

## 7. 前端 IA 与权限

| 角色 | 导航要点 |
|------|----------|
| org_admin / member | 工作台…通知；无监督 |
| secretariat | **监督视角** + 通知发布 + 业务只读深潜 |
| ops | **监督视角** + 作业 transition |

权限逻辑名（摘要）：

`demand:*` `order:*` `wallet:*` `router:invoke` `compute:*` `notice:*`  
`supervision:read` `match:facilitate` `redeem:approve`  

删除：`token:resell`。

---

## 8. 数据模型总览

```
orgs ──< users
  ├── projects ──< tasks
  │       ├── demands ──< applications ── match_orders
  │       ├── service_requests
  │       └── usage_records / compute_jobs
  ├── wallets ──< ledger
  │       ├── token_orders
  │       └── redeem_requests ── payouts
  └── …

notices + receipts
supervision 为聚合读模型（可物化缓存，P1 起）
audit_logs
llm_models / routing_policies / compute_pools
```

---

## 9. 部署与代码映射

### 9.1 现行

| 组件 | 实现 |
|------|------|
| Web | Vite + React 19 + RR |
| API | Express `server/index.mjs` + `server/p1/*` |
| 数据 | JSON seed store；可选 pg |
| 监督 | `store.supervisionOverview` + `SupervisionPage` |

### 9.2 目标

无状态 API 水平扩展 · PG 真源 · Redis 限流/队列 · Compute Worker · 对象存储  

### 9.3 目录

```
xian-drama-saas/
├── src/pages/app/SupervisionPage.tsx
├── src/layouts/AppLayout.tsx
├── server/p1/store.mjs · routes.mjs
└── docs/REQUIREMENTS.md · TECHNICAL.md
```

---

## 10. 关键时序

### 10.1 成交托管

`POST /demands/:id/confirm` → 建单 → Settlement.freeze → 通知  

### 10.2 监管巡检

`GET /supervision/overview` → 渲染队列 → 用户点行动 → 既有业务 API  

### 10.3 Chat 计费

`POST /v1/chat/completions` → precheck → provider → consume  

### 10.4 回收（目标）

`POST /wallet/redeems` → 审 → burn → payout  

---

## 11. 安全

| 项 | 要求 |
|----|------|
| 身份 | 生产废弃可伪造 `x-user-id` |
| 监督 | 角色门禁；审计「谁打开了监督/导出」 |
| Key | 只存 hash |
| reset | 非 development 禁用 |
| 护栏 | 代码层无转售/互兑路由，不仅靠前端隐藏 |

---

## 12. 工程分期

| 阶段 | 架构动作 |
|------|----------|
| **MVP** | A 托管放款账本；监督 overview；购额+Router+Compute 最小；禁兑 |
| **P1.1** | 分桶强制；redeem；JWT；Key hash；service_requests 回写；争议 |
| **P2** | Worker lease；Redis；账期；监督告警规则 |

验收以 [ACCEPTANCE.md](./ACCEPTANCE.md) + REQUIREMENTS §9 为准。

---

## 13. 与需求追溯

| REQUIREMENTS 模块 | 技术落点 |
|-------------------|----------|
| AC / WS / PJ / TK | Identity + Collaboration |
| DM / MO | Marketplace + Settlement |
| WA / R | Settlement + Redeem |
| RT / CP | Capacity |
| SV | ProService |
| NT / OP / GV-S* | Governance + Supervision |
| 禁转售 | 无路由 + guardrails 字段 |

---

## 变更记录

| 版本 | 说明 |
|------|------|
| T1.0 | 首版架构总册 |
| **T2.0** | **整合版**：A/B/C/D/R 映射、结算域、**监督子系统专章**、权限 IA、分期与追溯对齐 REQUIREMENTS R2.0 |
