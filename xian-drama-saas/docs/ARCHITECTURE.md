# 微短剧产业服务 SaaS · 技术设计文档

> 版本：V1.1 Draft  
> 日期：2026-07-24  
> 对应需求：[PRD.md](./PRD.md) V1.1  
> 变更：架构中心从「出海后台」转为「会员经营中枢」；出海降为 bounded context。

---

## 1. 设计目标

1. 支撑会员六大主路径：项目、需求对接、进度、Token、撮合、通知  
2. 机构级数据隔离 + 可配置的联盟可见范围  
3. Token 账本可审计（购买/消耗/转售过户）  
4. 专业中心（出海等）通过「服务工单」与项目解耦集成  
5. 可从现有演示与 PR#11 Token/作品能力迁移，而不是推倒重来 UI 壳

---

## 2. 逻辑架构

```
┌──────────────────────────────────────────────┐
│ Web：会员端 / 秘书处 / 中心专员 / 超管        │
└───────────────────────┬──────────────────────┘
                        │
┌───────────────────────▼──────────────────────┐
│ API：Auth · RBAC · OrgScope · Audit           │
└───────────────────────┬──────────────────────┘
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Member BC        Commerce BC     Service BC
   项目/需求/进度    Token/订单/转售   出海/审批/...
   撮合/通知         钱包/流水         中心工单
        └───────────────┬───────────────┘
                        ▼
                 PostgreSQL + Object Storage
```

BC = Bounded Context（限界上下文）

---

## 3. 多租户与权限

- `tenant_id`：服务中心实例  
- `org_id`：会员机构  
- 会员用户必须绑定 org；秘书处/中心账号无 org 或绑定运营主体 org  
- 可见范围枚举：`private` | `org` | `alliance` | `public_limited`

RBAC 权限示例：

- `project:*` `demand:*` `opportunity:respond`
- `token:purchase` `token:resell` `token:admin`
- `notice:publish` `notice:read`
- `match:facilitate`（秘书处）
- `service:submit` `service:handle`（中心）

---

## 4. 核心数据模型

### 4.1 身份

`tenants` `orgs` `users` `org_members` `roles` `permissions`

### 4.2 项目与进度

`projects`  
`project_members`  
`milestones`  
`tasks`（assignee、due_at、status、project_id）  
`timeline_events`

项目状态建议：

```
planning → in_production → post → distributing → closed
```

任务状态：`todo → doing → blocked → done → cancelled`

### 4.3 工作需求与撮合

`demands`（need/offer、visibility、budget、due）  
`demand_applications`（应征）  
`match_cases`（秘书处撮合单，关联 demand 与候选 org）  
`opportunities`（机会广场：活动位/征集/精选）  
`opportunity_interests`（意向）

### 4.4 通知

`notices`（title、body、audience_rule、force_read）  
`notice_receipts`（user_id、read_at）  
`notifications`（个人铃铛：type、ref_type、ref_id）

### 4.5 Token 账本（关键）

```
wallets (org_id, balance, api_key_hash)
token_packages
token_orders          -- 官方购买
token_ledger          -- 不可变流水
token_resale_listings -- 挂单
token_resale_trades   -- 成交
token_usage_records   -- 模型调用消耗（可异步入账）
```

**账本规则：**

1. 任何余额变更必须插入 `token_ledger`（双分录或有向流水）  
2. 转售：`listing → lock buyer funds/seller tokens → trade → ledger x2`  
3. API Key 只存哈希；展示用时仅创建时明文一次  

### 4.6 专业服务（出海等）

`service_requests`（project_id、product_code P07/P08…、center、status）  
出海细节表可挂在 service_request 下（评分、译制任务、渠道 deal、结算），避免污染会员主模型。

---

## 5. 关键用例 API（/api/v1）

### 会员主路径

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/projects` | 我的项目 |
| POST | `/projects/:id/tasks` | 任务 |
| GET | `/workspace/summary` | 待办+进度+未读 |
| GET/POST | `/demands` | 工作需求 |
| POST | `/demands/:id/apply` | 应征 |
| POST | `/demands/:id/confirm` | 成交确认 |
| GET | `/opportunities` | 机会广场 |
| POST | `/opportunities/:id/interest` | 意向 |
| GET | `/notices` | 通知列表 |
| POST | `/notices/:id/read` | 已读 |
| GET | `/wallet` | Token 钱包 |
| POST | `/wallet/purchase` | 购买套餐 |
| GET | `/wallet/ledger` | 流水 |
| POST | `/resale/listings` | 挂单（P1） |
| POST | `/resale/trades` | 买入（P1） |
| POST | `/services` | 从项目发起中心服务 |

### 秘书处

- `/admin/matches/*` 撮合工作台  
- `/admin/notices` 发布公告  
- `/admin/opportunities` 机会上下架  
- `/admin/kpi`

---

## 6. 进度聚合

`GET /workspace/summary` 聚合：

- 我的逾期任务  
- 我负责的阻塞需求  
- 待我确认的撮合  
- 未读通知数  
- 进行中项目完成率  

实现：应用服务并行查询 + 短缓存（可选 Redis）。

---

## 7. Token 技术要点

1. **购买：** 先做「模拟支付成功回调」+ 账本入账；真实支付（微信/支付宝）P2  
2. **消耗：** 网关扣费接口 `POST /v1/chat/completions` 先行计费校验余额  
3. **转售：** 状态机 `listed → locked → settled / cancelled`；超时自动解锁  
4. **并发：** 余额更新用 `UPDATE wallets SET balance = balance - $1 WHERE id AND balance >= $1`  
5. **审计：** 转售与大额购买进 `audit_logs`

---

## 8. 通知投递

Phase 1：写库 + 铃铛轮询/SSE  
Phase 2：Outbox → 邮件/企微  

`audience_rule` JSON 示例：

```json
{ "tiers": ["核心会员"], "tags": ["出海"], "orgIds": [] }
```

---

## 9. 前端信息架构落地

优先改会员端为默认主站：

```
/app                  工作台
/app/projects
/app/demands
/app/opportunities
/app/wallet
/app/notices
/app/settings
/secretariat/...
/center/...
```

现有 `/alliance/member/*`、`/overseas/*` 可重定向兼容。

---

## 10. Phase 1 工程顺序

1. Org/User/RBAC/Audit  
2. Project + Task + Timeline  
3. Demand + Apply + Confirm  
4. Workspace summary  
5. Notice + Receipt  
6. Wallet + Purchase + Ledger + API Key  
7. Opportunity + Interest  
8. Service request 回写进度（打通出海最小状态）  
9. E2E：PRD §8 用例  

Token 转售放 Phase 2，但表结构 Phase 1 可预留。

---

## 11. 与现有代码迁移

| 现有 | 迁到 |
|------|------|
| `matches` / MemberNeeds | `demands` + applications |
| PR#11 `tokenWallet` 等 | `wallets` + packages + ledger |
| PR#11 works/venues | opportunities/showcase 子模块 |
| overseas JSON portal | `service_requests` + overseas 子域 |
| 联盟/中心双入口 | 保留，会员端升为主入口 |

---

## 12. 非目标（技术）

- Phase 1 不上链、不做法币交易所级撮合引擎  
- Phase 1 不做复杂推荐模型（规则匹配即可）  
- 不把微信群消息双向同步当依赖  

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2026-07-24 | 出海主线技术设计 |
| V1.1 | 2026-07-24 | 改为会员六大主路径 + Token 账本 + 通知/撮合 |
