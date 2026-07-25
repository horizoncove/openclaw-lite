# 微短剧产业会员协作中枢 · SaaS 技术架构总册

> 版本：**T1.0**  
> 日期：2026-07-25  
> 状态：**目标架构 + 现行实现对照**  
> 需求入口：[REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md) R1.1  
> 结算：[DECISION_TOKEN_SETTLEMENT.md](./DECISION_TOKEN_SETTLEMENT.md) D1.3  
> 现行 HTTP：[API_CONTRACT.md](./API_CONTRACT.md) · 差距：[P1_BOUNDARY.md](./P1_BOUNDARY.md)  
> 模块级旧稿：[ARCHITECTURE.md](./ARCHITECTURE.md)（保留；以本文为准做总览）

---

## 0. 架构一句话

> 单仓 **Web + API** 的多租户会员 SaaS：以 **撮合适配 × 信任保障** 为核（需求/应征/订单托管放款），中枢体验与结算域围核运转；**XD-Router** / **Compute** 为履约产能卫星；出海工单与官方回收为出口卫星。详见 [CORE_VALUE_MATCHING.md](./CORE_VALUE_MATCHING.md) C1.1。

---

## 1. 系统上下文

```
┌──────────── 会员浏览器 ────────────┐     ┌──── 上游 LLM/算力 ────┐
│  /app 中枢  · 演示壳(/overseas等)   │     │ OpenAI兼容 Provider等 │
└─────────────────┬──────────────────┘     └──────────▲───────────┘
                  │ HTTPS                              │
                  ▼                                    │
┌─────────────────────────────────────────────────────┴──────────┐
│                    会员协作中枢 SaaS                            │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Platform API │  │  XD-Router  │  │ Compute Scheduler    │  │
│  │ 业务+结算    │  │ /v1/chat…   │  │ jobs / transition    │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         └─────────────────┼────────────────────┘               │
│                           ▼                                    │
│              PostgreSQL · (Redis) · Object Storage             │
└────────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
   联盟秘书处运营动作                    对公打款/账期应收
   (通知·仲裁·审批回收)                  (出纳，可先半人工)
```

**边界外：** 真正银行打款网关、税务开票系统、司法存证链 —— 本期接口预留或人工出纳，不伪称已全自动合规。

---

## 2. 逻辑架构（分层）

```
┌─────────────────────────────────────────────────────────┐
│ 体验层  Experience                                       │
│  React SPA：工作台/项目/需求/订单/钱包/算力/通知/进件     │
│  演示壳：出海/联盟/五中心（只进件，不持账本）             │
└───────────────────────────┬─────────────────────────────┘
                            │ /api/v1  ·  /v1
┌───────────────────────────▼─────────────────────────────┐
│ 应用层  Application Services                             │
│  Identity · Workspace · Project · Demand · MatchOrder    │
│  Wallet/Settlement · RouterBilling · Compute · Notice    │
│  ServiceRequest · Admin · Redeem（回收）                 │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 领域层  Domain                                           │
│  多租户 Org · 撮合状态机 · Tokens 分桶账本 · 作业状态机   │
│  规则：禁互转、购入不可兑、托管放款、冷却回收            │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 基础设施  Infrastructure                                 │
│  JSON Store(P1) → PostgreSQL · 文件/对象存储 · 队列(后)  │
│  Provider Adapter · 审计日志 · 配置/密钥                 │
└─────────────────────────────────────────────────────────┘
```

### 2.1 有界上下文（Bounded Contexts）

| 上下文 | 职责 | 关键聚合 |
|--------|------|----------|
| **Identity** | 用户、机构、角色、会话 | User, Org, Membership |
| **Collaboration** | 项目、任务、工作台 | Project, Task |
| **Marketplace** | 需求、应征、撮合订单 | Demand, Application, MatchOrder |
| **Settlement** | 购额、分桶、托管、回收、账期 | Wallet, Ledger, RedeemRequest, Receivable |
| **Capacity** | 网关计量、算力作业 | ApiKey, UsageRecord, ComputeJob |
| **Engagement** | 通知已读跳转 | Notice, NoticeReceipt |
| **ProService** | 出海等工单 | ServiceRequest |
| **Governance** | 秘书协助、调账、审批 | AuditLog, Moderation |

结算上下文是**唯一**允许变更会员 Tokens 余额的写入口（Router/Compute 经其扣减）。

---

## 3. 部署与运行时（现行 → 目标）

### 3.1 现行（Phase 1 演示）

| 组件 | 实现 |
|------|------|
| 前端 | Vite + React 19 + React Router，静态由 Express 同服或分离 |
| API | Node `server/index.mjs` + `server/p1/*` |
| 数据 | 默认 JSON seed store；可选 `pg` 迁移 |
| 进程 | `npm run dev` = API + Web 并发；`npm start` 生产同仓 |

```
[Browser] → [Express: static + /api/v1 + /v1] → [p1/store JSON | PostgreSQL]
```

### 3.2 目标（可运营）

| 组件 | 建议 |
|------|------|
| Web | CDN / 静态托管 |
| API | 无状态水平扩展；会话 JWT/Session |
| DB | PostgreSQL 主库；Redis 限流/队列 |
| Worker | Compute lease 独立进程 |
| 对象存储 | 译制交付物/附件（P1.1+） |
| 观测 | 结构化日志 + 计量指标（RPM、402 率、作业失败率） |

```
CDN(Web) ──► API(N) ──► PostgreSQL
                │            ▲
                ├── Redis ───┘
                └── Worker(Compute) ──► Provider / GPU池
```

---

## 4. 前端信息架构

```
/app/login
/app/workspace          工作台
/app/projects           项目
/app/demands            广场 | 我发布的 | 我应征的
/app/orders             撮合订单
/app/wallet             购额 · 分桶 · 流水 · 回收（P1.1）
/app/compute            算力作业
/app/notices            通知
/app/services           专业服务进件（P1）
```

演示壳 `/overseas` `/alliance` `/center`：**只读营销 + 进件**，不复制钱包账本。

权限感知导航：秘书处见协助/发通知；运维见作业 transition；管理员见购额与 Key。

---

## 5. 后端模块与 API 平面

### 5.1 双平面

| 平面 | 前缀 | 鉴权 | 用途 |
|------|------|------|------|
| Platform | `/api/v1/*` | 用户会话（目标 JWT；现行 `x-user-id`） | 中枢业务 |
| Router | `/v1/*` | `Authorization: Bearer <org_api_key>` | 模型调用 |

### 5.2 模块 ↔ 路由（目标）

| 模块 | 主要路径 |
|------|----------|
| Auth | `/auth/login` `/me` |
| Workspace | `/workspace/summary` |
| Projects/Tasks | `/projects` `/tasks` |
| Demands | `/demands?scope=` `/apply` `/confirm` |
| Orders | `/match-orders` `/match-orders/:id/release|dispute` |
| Wallet | `/wallet` `/wallet/purchase` `/wallet/ledger` |
| Redeem | `/wallet/redeems` （申请/列表；审批管理端） |
| Compute | `/compute/jobs` `/transition` `/internal/lease…` |
| Notices | `/notices` |
| Services | `/service-requests` |
| Admin | `/admin/models|policies|pools|packages|adjust|redeems` |
| Router | `/v1/chat/completions` `/v1/models` |

现行有无见 [API_CONTRACT.md](./API_CONTRACT.md)。

---

## 6. 结算域设计（D1.3 落地）

### 6.1 钱包分桶

```
wallets (
  org_id,
  purchased, earned, frozen, bonus,   -- 非负；单位 Tokens
  api_key_hash,
  status
)
```

**可用** = purchased + earned + bonus(若允许) ；下单/消耗不得动 frozen。

扣减顺序：`bonus → purchased → earned`（写入 ledger 明细可带 `bucket`）。

### 6.2 撮合订单资金流

```
confirm deal
  → match_orders.status = escrowed
  → 需求方：available 按扣序转入 frozen（或托管池账户）
  → in_progress …
  → release:
        frozen -= amount
        platform_fee → platform_org（不可 redeem）
        supplier.earned += (amount - fee)
        ledger: freeze / release / fee / earn_release
  → dispute/cancel: 解冻规则按仲裁
```

**禁止** `transfer(orgA, orgB)` 无订单接口。

### 6.3 官方回收

```
redeem_requests: requested → under_review → approved → burning → payout_pending → paid
                                                                  ↘ rejected / payout_failed
```

- 校验：仅 earned、冷却、月帽、对公、信用、应收冲抵  
- `burn_redeem` 销毁 T；`fiat_payout` 记出纳（可先人工标记 paid）  

### 6.4 账本类型

`purchase` `freeze` `unfreeze` `consume` `earn_release` `fee`  
`burn_redeem` `fiat_payout_offset` `refund` `adjust`

任一余额变化必须落 ledger。

---

## 7. 产能平面

### 7.1 XD-Router 流水线（目标）

```
Auth(Key) → RateLimit → Quote/Estimate → BalancePrecheck
  → Route → ProviderInvoke
  → Success: usage_records + consume(ledger)
  → Fail: no charge / auto refund
```

错误：`402 INSUFFICIENT_BALANCE` · `429` · 上游 5xx 默认不扣。

### 7.2 Compute 状态机

```
queued ──► running ──► succeeded
   │           │
   └cancelled  └──► failed ──(retry)──► queued
```

- 创建：预扣（frozen 或 hold 记录）  
- succeeded：预扣转消耗  
- failed/cancelled：释放预扣 + 通知  

Phase 1 可用运维 `transition` 模拟 Worker；其后 `/internal/compute/lease`。

---

## 8. 数据模型总览

```
orgs ──< memberships >── users
  │
  ├── projects ──< tasks
  │       │
  │       ├── demands ──< demand_applications
  │       │       └── match_orders
  │       ├── service_requests
  │       └── usage_records / compute_jobs (project_id 可选)
  │
  ├── wallets ──< token_ledger
  │       ├── token_orders (购额)
  │       └── redeem_requests ── redeem_payouts
  ├── credit_profiles / receivables
  ├── api_keys
  └── notice_receipts

notices (global or targeted)
llm_models / routing_policies / compute_pools
audit_logs
```

索引建议：`demands(status, visibility)` · `match_orders(orgs, status)` · `ledger(org_id, created_at)` · `jobs(status, org_id)`。

---

## 9. 安全架构

| 项 | 要求 |
|----|------|
| 身份 | 生产废弃可伪造 `x-user-id`；JWT/Session + CSRF 策略 |
| API Key | 仅存 hash；明文一次性展示；范围 `router:invoke` |
| 租户 | 所有查询默认带 `org_id`；秘书/运维显式提权 |
| 危险接口 | `/reset` 仅 development 或受保护 |
| 审计 | 购额、调账、放款、回收审批、改路由、撤 Key |
| 演示 | 对外标明「演示身份模型 ≠ 生产」 |

---

## 10. 多租户与权限

**隔离键：** `org_id`（机构）。联盟广场为数据上的**受控共享读**（published 需求），不是弱隔离。

| 角色 | 能力摘要 |
|------|----------|
| `org_admin` | 购额、Key、成员、确认成交、看本机构全部 |
| `member` | 项目任务、应征、调用、本机构读 |
| `secretariat` | 通知、协助、争议、（可选）回收审批 |
| `ops` | 作业推进、池与模型运维 |

逻辑权限名见旧 ARCH §3；**删除** `token:resell`。

---

## 11. 技术选型

| 层 | 选型 | 说明 |
|----|------|------|
| 前端 | React 19 · Vite · React Router | 中枢 SPA |
| 后端 | Node.js · Express 5 | 与现仓一致 |
| 语言 | JS(API) + TS(Web) | 可逐步 TS 化 API |
| DB | PostgreSQL | 目标真源；P1 可以 JSON 过渡 |
| 缓存/限流 | Redis | 目标 |
| 对象存储 | S3 兼容 | 附件/交付物 |
| 部署 | Docker / Railway 等 | 已有 Dockerfile、railway.toml |

---

## 12. 目录与代码映射（现行仓库）

```
xian-drama-saas/
├── src/                 # 前端（pages/p1 中枢，演示壳）
├── server/
│   ├── index.mjs        # 入口：挂载 /api/v1 /v1 与静态
│   ├── p1/
│   │   ├── routes.mjs   # P1 API
│   │   └── store.mjs    # JSON 领域存储
│   ├── db/              # pg 迁移与 repo（可选）
│   └── data/*-seed.json
├── docs/                # 需求与架构真源
└── scripts/             # smoke / 验收辅助
```

新领域（match_orders 托管、分桶、redeem）应优先落在 `server/p1` 领域函数，避免页面直接改余额。

---

## 13. 关键时序

### 13.1 成交并托管

```
Client → POST /demands/:id/confirm
API → 校验应征 → 创建 match_order
    → Settlement.freeze(publisher, amount)
    → 通知双方
← order
```

### 13.2 Chat 计费

```
Client → POST /v1/chat/completions (Bearer Key)
Router → precheck → provider → consume → usage_records
← completion | 402
```

### 13.3 回收（目标）

```
Client → POST /wallet/redeems { amount_t }
API → 校验 earned/冷却/帽 → redeem_requests
Admin → approve → burn → payout_pending
Ops/Finance → mark paid (bank_ref)
```

---

## 14. 演进路线（工程）

| 阶段 | 架构动作 |
|------|----------|
| **Now / MVP** | JSON/PG 存储；订单最小状态；单余额可先映射为 purchased+earned 字段；Router 预检扣费；Compute transition |
| **P1.1** | 分桶强制；托管放款账本；redeem 状态机；service_requests 回写；JWT；Key hash；禁裸 reset |
| **P2** | Worker 租赁协议；Redis 限流队列；账期应收；多模态路由；只读副本/备份 |

验收与放行以 [ACCEPTANCE.md](./ACCEPTANCE.md) 为准；契约变更必须回写 API_CONTRACT。

---

## 15. 质量与运维

| 项 | 做法 |
|----|------|
| 契约测试 | `p1-smoke` / Playwright 主路径 |
| 种子数据 | 多角色演示账号（管理员/执行/供给/秘书/运维） |
| 配置 | 环境变量：数据库、Provider Key、`P_buy`/`P_redeem`、回收帽 |
| 备份 | PG 日备；ledger 只追加不物理删 |
| 演示隔离 | 演示租户与生产库分离 |

---

## 16. 与需求的追溯

| 需求模块（SRS） | 架构落点 |
|-----------------|----------|
| AC / WS / PJ / TK | Identity + Collaboration |
| DM / MO | Marketplace + Settlement.freeze/release |
| WA / 回收 | Settlement |
| RT / CP | Capacity |
| NT | Engagement |
| SV | ProService |
| 禁转售/自由兑 | Domain 规则 + 无 API + 前端不建入口 |

---

## 变更记录

| 版本 | 说明 |
|------|------|
| **T1.0** | 首版 SaaS 技术架构总册：上下文、分层、结算域 D1.3、产能平面、部署演进、代码映射 |
