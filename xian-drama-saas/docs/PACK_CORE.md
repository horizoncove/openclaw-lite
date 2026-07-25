# 微短剧会员协作中枢 · 核心外发包（需求+技术）

> **PACK_CORE P2.1** · 给 MiniMax / Trae 优先阅读  
> 含：REQUIREMENTS R2.0 + TECHNICAL T2.0（已含监督视角）

## 口令

- 北极星：撮合适配保障 × 信任保障  
- A 撮合主轮 · B 产能 · C 法币服务 · D 治理+监督 · R 回收  
- 会员 `/app` · 监管 `/app/supervision`  
- 禁：挂单 / 互兑 / 兑换所 / 购入即兑  

更多索引见 `PACK_MINIMAX_TRAE.md`。

---


---

# 【需求文档整合版 R2.0】

> 源：`docs/REQUIREMENTS.md`

# 微短剧会员协作中枢 · 需求文档（整合版）

> 版本：**R2.0**  
> 日期：2026-07-25  
> 状态：**需求主入口（整合）**  
> 取代分散阅读：原 SRS R1.x + 北极星 + 飞轮 + 监督视角 + 结算摘要  
> 技术对照：[TECHNICAL.md](./TECHNICAL.md) T2.0  
> 深度研究：[BUSINESS_MODEL_RESEARCH.md](./BUSINESS_MODEL_RESEARCH.md) · 拍板细则仍见 DECISION / FLYWHEEL / SUPERVISION_VIEW

---

## 0. 怎么用这份文档

| 读者 | 读哪些 |
|------|--------|
| 商务 / 联盟 / MiniMax·Trae | §1–§4、§8 |
| 产品 | 全文 |
| 研发 | §4–§7、§9 → 再读 TECHNICAL |
| 秘书处 / 监管 | §3.4、§5.9、§9 监督验收 |

冲突裁决：北极星 C1.1 → 结算 D1.3 → **本文 R2.0** → PRD → 现行 API。

---

## 1. 产品定义

### 1.1 一句话

> **西安微短剧产业联盟 · 会员协作中枢（SaaS）**  
> 以 **撮合适配保障 × 信任保障** 为核：找人对得上、谈妥有 T 托管单据、做完能结清；  
> 工作台、产能、出海、回收、**监管监督视角** 均为卫星，不另做第二套「唯一平台」，不做 Token 交易所。

### 1.2 北极星（两根柱子）

| 柱子 | 含义 | 用户体感 |
|------|------|----------|
| **撮合适配保障** | 需求可被看见、应征可跟踪、确认可成交 | 「找得到对的人」 |
| **信任保障** | 订单 + T 冻结托管 + 验收放款 + 争议可裁 | 「敢成交、做完能拿到」 |

最小核闭环：

```
发布 → 应征 → 确认 → T 托管冻结 → 履约可见 → 验收放款 → 双方再来
```

### 1.3 生态环 A/B/C/D/R（必懂）

| 环 | 名称 | 飞轮角色 | 用户价值 |
|----|------|----------|----------|
| **A** | 匹配撮合 | **主发动机** | 找人 + 托管成交 |
| **B** | 产能用量 | 卫星·加油 | 购 T、网关/算力、账单可信 |
| **C** | 专业服务 | 卫星·旁路 | 出海等**法币合同**，回写中枢 |
| **D** | 治理监督 | 护栏 | 通知、仲裁、禁兑、**监督视角** |
| **R** | 官方回收 | 卫星·出口 | earned 销毁 → 对公退 ¥ |

口令：**先转 A；B/C/D/R 挂上 A；卫星不得反客为主。**

### 1.4 明确不做

- C 端看剧 / 硬币  
- Token 挂单、会员互兑、浮动汇率、购入即兑  
- 出海营销站替代 `/app` 日常入口  
- 司法级版权链 / 热度生产当 MVP 主路径  

---

## 2. 用户与成功标准

| 角色 | Jobs | 成功标准 |
|------|------|----------|
| 机构管理员 | 预算、额度、全局 | 1 分钟看清待办；购额/回收有据 |
| 执行人 | 任务、发/应征、调 AI | 待办清；失败知是否扣费 |
| 供给方 | 接单、履约、结算 | 订单节点清；earned 可回收或走 C |
| **监管者（秘书处）** | 主轮是否转、哪里介入、护栏是否破 | **每日打开监督视角**，不靠翻群 |
| 运维 | 作业队列、故障 | 失败可推进/释放预扣 |
| 服务专员 | 出海工单 | 进度会员可见并回写项目 |

---

## 3. 业务规则总纲

### 3.1 Tokens：进 / 转 / 出（D1.3）

```
进  ¥/账期 → 官方购 T → purchased
转  订单托管放款 → earned；或耗网关/算力；撮合费归平台
出  C 法币合同  |  R：仅 earned 销毁 → P_redeem 打对公
```

| 规则 | 要求 |
|------|------|
| 分桶 | `purchased` / `earned` / `frozen` / `bonus` |
| 扣序 | `bonus → purchased → earned` |
| 双价 | `P_redeem ≤ P_buy`；非市价、非用户议价 |
| 禁止 | 互兑、挂单、购入兑出、兑换所 UI |
| 账期 | 赊购应收，与回收分轨 |

### 3.2 撮合成交

- 需求发布后全联盟可见（`visibility=alliance`）  
- 确认成交 **必须** 生成撮合订单并冻结 T  
- 无订单不得机构间划转余额  

### 3.3 专业服务（C）

- 主计费 = 法币项目/年框  
- 工单回写项目/工作台  
- 不另持会员钱包账本  

### 3.4 监管监督（D）

会员工作台问「我做什么」；监督视角问「场子健不健康」。

监管者必须能看见：

1. 主轮健康（适配 / 信任指标）  
2. 待介入队列：待确认、无应征、争议、逾期、失败作业  
3. 护栏灯：转售/互兑/汇率/购入兑出 = 关闭  
4. 行动跳转：催确认、发通知、进算力/需求  

入口：`/app/supervision`；角色：`secretariat` / `ops`。

---

## 4. 功能需求（整合清单）

优先级：P0 MVP · P1 紧随 · P2 展望。

### 4.1 账号与机构

| ID | 需求 | 优先级 |
|----|------|--------|
| AC-01 | 机构/用户/角色（含 secretariat、ops） | P0 |
| AC-02 | 不可伪造的生产会话（演示可标注） | P0 |
| AC-03 | org 隔离；广场与监管为显式例外 | P0 |
| AC-04 | 成员邀请停用 | P1 |
| AC-05–07 | 机构资料、对公备案、KYC | P1 |
| AC-08 | 新手引导 | P1 |

### 4.2 工作台 / 项目 / 任务（仪表盘）

| ID | 需求 | 优先级 |
|----|------|--------|
| WS-01 | 工作台：逾期、待确认、未读、作业、钱包 | P0 |
| WS-02 | 摘要可跳转业务对象 | P0 |
| PJ-01 | 项目 CRUD | P0 |
| PJ-05 | 项目成本（订单 T + 工具消耗） | P1 |
| TK-01 | 任务状态/截止/阻塞 | P0 |

### 4.3 A 环 · 需求与撮合订单

| ID | 需求 | 优先级 |
|----|------|--------|
| DM-01–03 | 发布、广场/我的/我应征的、应征确认 | P0 |
| DM-04 | 筛选搜索 | P1 |
| MO-01 | 订单状态机：冻结→进行→放款/争议/关闭 | P0 |
| MO-04 | 验收放款至 earned（扣撮合费） | P0 |
| MO-05–06 | 争议单、时间线 | P1 |

### 4.4 钱包 · 回收 · 信用

| ID | 需求 | 优先级 |
|----|------|--------|
| WA-01–03 | 购额、分桶流水、冻结/放款账本 | P0 |
| WA-06 | 禁转售/互兑（无 API/无 UI） | P0 |
| WA-04 | 官方回收全流程 | P1 |
| WA-05 | 账期应收 | P1 |
| WA-07–09 | 低余额提醒、对账单、可回收预览 | P1 |

### 4.5 B 环 · 网关与算力

| ID | 需求 | 优先级 |
|----|------|--------|
| RT-01–04 | Chat 兼容、模型价、Key、usage | P0 |
| CP-01–02 | 作业状态机、预扣/释放 | P0 |
| RT-05–07 | 试玩台、绑定项目、限流 | P1 |

### 4.6 C 环 · 专业服务

| ID | 需求 | 优先级 |
|----|------|--------|
| SV-01–03 | 进件、工单状态、回写中枢 | P1 |
| SV-04–05 | 服务目录、法币报价字段 | P1 |

### 4.7 通知与机会

| ID | 需求 | 优先级 |
|----|------|--------|
| NT-01–02 | 公告/业务通知、已读跳转 | P0 |
| OP-01 | 联盟机会意向 | P1 |

### 4.8 D 环 · 监管监督视角（整合重点）

| ID | 需求 | 优先级 |
|----|------|--------|
| **GV-S01** | **监督概览页 + API** | **P0** |
| GV-S02 | 主轮健康分（可解释） | P1 |
| GV-S03 | 待确认 / 无应征队列 | P0 |
| GV-S04 | 争议订单队列 | P1 |
| GV-S05 | 护栏状态灯（只读） | P0 |
| GV-S06 | 行动条跳转 | P0 |
| GV-S07 | 回收审批进监督 | P1.1 |
| GV-01 | 仲裁台 | P1 |
| GV-02 | 违规处置策略 | P2 |

### 4.9 报表与管理端

| ID | 需求 | 优先级 |
|----|------|--------|
| RP-T01–04 | 用量/成交/回收报表与导出 | P1 |
| AD-01–05 | 模型、池、双价、调账、回收审批 | P1 |
| AD-06 | 禁止公网裸 reset | P0 |

---

## 5. 信息架构

### 5.1 会员端 `/app`

工作台 · 项目 · 工作需求 ·（订单）· 钱包/API · 算力 · 通知 · 设置  
二级：专业服务进件  

### 5.2 监管端（秘书处/运维）

**监督视角（默认置顶）** · 需求/订单只读深潜 · 通知发布 · 算力运维 ·（P1）仲裁/回收审批  

会员角色不显示监督导航；直链 API → 403。

### 5.3 演示壳

`/overseas` 等：营销 + 进件，**不持钱包账本**。

---

## 6. 关键旅程

| ID | 旅程 | 经过的环 |
|----|------|----------|
| J1 | 缺译者→成交→放款 | A（+B 可选） |
| J2 | 购额→调用→再购额 | B |
| J3 | 出海进件→法币履约→回写 | C |
| J4 | 供给 earned→官方回收 | R←A |
| J5 | 争议→秘书裁决 | D←A |
| J6 | **监管晨会：打开监督视角处理队列** | D |
| J7 | 反用例：挂单/互兑/购入兑出 → 必须失败 | 护栏 |

---

## 7. 非功能需求

| 类 | 要求 |
|----|------|
| 安全 | 会话不可伪造；Key hash；审计购额/调账/放款/回收；无裸 reset |
| 多租户 | org 隔离；监管提权显式 |
| 可审计 | 凡 T 变动必有 ledger |
| 体验 | 工作台与监督页移动端可完成关键确认/催办 |
| 话术 | Token=工作积分；回收≠提现盘/汇率 |
| 可观测 | 托管放款数、再来率、402 率、监督队列积压 |

---

## 8. 分期

| 阶段 | 必达 | 出口 |
|------|------|------|
| **MVP** | A 核（含托管放款）+ 工作台 + 购额流水 + Chat/算力最小 + 通知 + **监督视角 P0** + 禁兑 | 完整托管放款发生；监管能看见待确认队列 |
| **P1.1** | 分桶完善、回收、争议、服务回写、JWT/Key hash、报表 | D1.3 回收用例绿 |
| **P2** | 账期、互评、推荐、多模态 | 单独立项 |

---

## 9. 验收要点（整合）

**会员侧**

1. 确认成交必有订单且 T 冻结  
2. 放款只增对方 earned；无转让 API  
3. 购入不可兑；余额不足 402 不调上游  
4. 作业失败释放预扣  

**监管侧**

5. 秘书处/运维可进 `/app/supervision`；会员 403  
6. 可见待确认、无应征、护栏全关  
7. 行动条可跳到需求/通知/算力  

**生态**

8. 无兑换所 UI；出海从中枢进件可回写（P1.1）  

---

## 10. 文档关系

```
本文 REQUIREMENTS R2.0  ← 需求主入口
TECHNICAL T2.0          ← 技术主入口
CORE_VALUE / FLYWHEEL / DECISION / SUPERVISION / BM 研究 ← 专题深挖
PRD / API_CONTRACT / ACCEPTANCE ← 字段、契约、放行
```

---

## 变更记录

| 版本 | 说明 |
|------|------|
| R1.x | 分册演进 |
| **R2.0** | **整合版**：北极星 + A/B/C/D/R + D1.3 + 全功能清单 + **监督视角一等公民** + 分期验收 |


---

# 【技术文档整合版 T2.0】

> 源：`docs/TECHNICAL.md`

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


---

# 【PACK_CORE 结束】
