# 西安微短剧产业生态 · MVP 技术文档

> **对象**：Trae / Minimax 工程验证与二次开发  
> **基线**：`xian-drama-saas` v1.6.0  
> **配套**：[`PRD.md`](./PRD.md) · [`MVP-VALIDATION.md`](./MVP-VALIDATION.md)

---

## 1. 系统概览

```
Browser (React/Vite)
    │  /api/*
    ▼
Express (server/index.mjs)
    ├── Alliance portal  → store → JSON file 或 PostgreSQL
    └── Center portal    → store → JSON file 或 PostgreSQL
```

- **双门户隔离**：路由、Store、种子、持久化键均分离  
- **闭环关联键**：`DealProject.id` ↔ `MatchNeed.dealId` ↔ `WorkOrder.dealId`  
- **Token 两层**：  
  - 机构钱包 `orgWallets`（联盟侧，项目开预算/激励）  
  - 中心网关钱包 `tokenWallet`（中心侧，套餐购买/用量叙事）

---

## 2. 目录地图

```
xian-drama-saas/
├── src/
│   ├── App.tsx                 # 路由
│   ├── types.ts                # 领域类型
│   ├── api/client.ts           # allianceApi / centerApi
│   ├── store/
│   │   ├── allianceStore.tsx
│   │   └── centerStore.tsx
│   ├── utils/
│   │   ├── dealLoop.ts         # 成交/扣费/场景包（前端同源逻辑）
│   │   ├── memberContext.ts
│   │   └── centerPanorama.ts
│   ├── pages/alliance/         # 秘书处 + member/
│   ├── pages/centers/          # 五大中心
│   └── data/seed.ts            # 从 server/data/*.json 导入
└── server/
    ├── index.mjs               # HTTP API
    ├── store.mjs               # 存储门面
    ├── dealLoop.mjs            # 成交/扣费（后端）
    ├── db/
    │   ├── schema.sql
    │   ├── migrate.mjs         # DATA_SEED_VERSION
    │   ├── repo.mjs
    │   └── pool.mjs
    └── data/
        ├── alliance-seed.json
        └── center-seed.json
```

---

## 3. 核心数据模型

### 3.1 MatchNeed（供需）

```ts
{
  id, org, need, offer,
  status: "开放" | "撮合中" | "已成交" | "关闭",
  owner, updatedAt,
  suggestedPartner?, sceneId?, dealId?
}
```

### 3.2 ScenePackage（场景包）

```ts
{
  id, name, tokens, center,
  brokerFeeRate, supplierShare, desc,
  forBuyer, forSupplier, forBroker, forCenter
}
```

### 3.3 OrgWallet（机构钱包）

```ts
{ org, balance, role: "buyer" | "supplier" | "broker" | "mixed" }
```

### 3.4 DealProject（项目）

```ts
{
  id, matchId, title, sceneId, sceneName,
  buyerOrg, supplierOrg, broker, center,
  status: "预算已开" | "履约中" | "已结算" | "暂停",
  budget, spent, brokerEarned, supplierEarned,
  orderId?, createdAt, updatedAt,
  nextActionBuyer, nextActionSupplier, nextActionBroker, nextActionCenter,
  ledger: DealLedgerEntry[]
}
```

### 3.5 DealLedgerEntry

```ts
{
  id,
  type: "开预算" | "消耗" | "撮合费" | "供给激励" | "补预算" | "退款",
  amount, actor, actorRole, model?, note, createdAt
}
```

### 3.6 WorkOrder（扩展）

增加可选字段：`dealId?: string`

### 3.7 Center TokenWallet

```ts
{
  balance, usedThisMonth, monthlyQuota, apiKey,
  transactions: { id, type, amount, balance, model?, note, createdAt, dealId? }[]
}
```

---

## 4. API 契约（MVP 必测）

Base：`/api`  
健康检查：

```http
GET /api/health
→ { ok, service, version, storage, portals }
```

### 4.1 联盟

| Method | Path | Body / 说明 |
|--------|------|-------------|
| GET | `/alliance/state` | 完整联盟状态（含 deals/orgWallets/scenePackages） |
| POST | `/alliance/reset` | 重置为种子 |
| POST | `/alliance/auth/login` | `{ role: "alliance"\|"member" }` |
| GET/POST | `/alliance/matches` | 供需列表/新建 |
| PUT | `/alliance/matches/:id` | 状态补丁 |
| **POST** | **`/alliance/deals/close`** | `{ matchId, supplierOrg?, sceneId? }` → 新 state |
| **POST** | **`/alliance/deals/:id/consume`** | `{ amount, actor?, note?, model? }` → 新 state |
| **POST** | **`/alliance/wallets/topup`** | `{ org, amount }` → `{ org, balance, credited }` |
| GET/POST/PUT | `/alliance/works` | 作品 |
| GET/PUT | `/alliance/venues` | 场地 |

### 4.2 中心

| Method | Path | 说明 |
|--------|------|------|
| GET | `/center/state` | 含 tokenModels/packages/wallet |
| POST | `/center/reset` | 重置 |
| POST | `/center/auth/login` | `{ role }` |
| GET | `/center/tokens` | 模型/套餐/钱包 |
| POST | `/center/tokens/purchase` | `{ packageId }` |
| POST | `/center/tokens/regenerate-key` | 轮换 API Key |
| GET/PUT | `/center/approvals/:id` 等 | 业务模块 |

### 4.3 错误约定

- HTTP 4xx/5xx + `{ error: string }`  
- 成交余额不足：`需求方「xxx」Token 余额不足...`  
- 重复成交：`该供需已成交并开立项目`

---

## 5. 关键算法（实现对照）

前端：`src/utils/dealLoop.ts`  
后端：`server/dealLoop.mjs`（保持规则一致）

### closeMatchDeal

1. 找 match；若已有 dealId → 抛错  
2. `findScene(scenePackages, sceneId)`  
3. `debitWallet(orgWallets, buyer, scene.tokens)`；失败则抛错  
4. `buildDealFromMatch` → deal + order  
5. 更新 matches / deals / orders / orgWallets  
6. 若 order.center ≠ 联盟，尝试镜像写入中心 orders（演示增强）  
7. 返回完整 alliance state  

### consumeDealTokens

1. 找 deal；已结算则抛错  
2. `applyConsume` 计算 spend / 分账  
3. 贷记秘书处、供给方钱包  
4. 更新 deal、关联 order 状态文案  
5. 尽力同步中心 `tokenWallet.usedThisMonth` 与流水（`dealId`）  

---

## 6. 持久化策略

| 环境 | 行为 |
|------|------|
| 无 `DATABASE_URL` 或 `STORAGE=json` | `server/data/alliance-db.json`、`center-db.json` |
| 有 `DATABASE_URL` | PostgreSQL；结构化表 + `alliance_extras` / `center_extras` JSONB |

关键表：`members, events, matches, work_orders, approvals, ...`  
扩展键（JSONB）：

- `alliance_extras`: `works`, `venues`, `deals`, `orgWallets`  
- `center_extras`: `tokenWallet`  
- `scenePackages` 主要来自 seed 合并（配置型）

迁移：`npm run db:migrate`  
种子刷新版本：`DATA_SEED_VERSION`（当前期望 ≥ 6）。版本未写入时 migrate 会 reset 灌数。

---

## 7. 前端状态

### AllianceStore

关键字段：`user, members, events, matches, orders, works, venues, deals, orgWallets, scenePackages`  
关键动作：`closeDeal`, `consumeDeal`, `topUpWallet`, `addMatch`, `resetDemo`, ...

离线降级：API 失败时用 `allianceSeed()` 本地演算（`dealLoop.ts`）。

### CenterStore

`tokenWallet` / `purchaseTokens` / `regenerateApiKey`  
与联盟闭环弱耦合：扣费主路径在联盟 Deal；中心钱包记录用量叙事。

---

## 8. 路由表（MVP）

见 `src/App.tsx`：

- Alliance auth → `/alliance/console/*`（秘书处）或 `/alliance/member/*`（会员，按 role 分流）  
- Center auth → `/center/console/*`

Layout 内若 role 不匹配会 `replace` 跳转，验证时注意。

---

## 9. 本地与验证环境

```bash
cd xian-drama-saas
npm install
npm run dev          # web :5173 + api :3001
npm run build        # 必过
npm run db:migrate   # 仅 PG
```

环境变量见 `.env.example`：

- `PORT`  
- `DATABASE_URL`  
- `STORAGE=json|postgres`

生产参考：`deploy/PAAS.md`、`deploy/DEPLOY.md`。

---

## 10. Trae 技术验收清单（摘要）

1. `GET /api/health` 含 `portals`  
2. `GET /api/alliance/state` 含非空 `deals`、`orgWallets`、`scenePackages`  
3. `POST /alliance/deals/close` 幂等失败可预期；成功后余额与 deal 一致  
4. `POST /alliance/deals/:id/consume` ledger 三类分录齐全  
5. JSON 与 PG 两条路径至少一条完整走通  
6. 前端 `tsc -b` / `npm run build` 通过  
7. 不破坏双门户隔离（禁止把 members 写入 center state）

缺陷修复原则：

- 优先改 `server/dealLoop.mjs` + `src/utils/dealLoop.ts` 保持同源  
- 种子变更同步 `alliance-seed.json` 并考虑 bump `DATA_SEED_VERSION`  
- 根 `.gitignore` 忽略 `lib/`，新工具模块放 `src/utils/` 勿放 `src/lib/`

---

## 11. 已知边界（勿当 Bug 误报）

| 现象 | 说明 |
|------|------|
| 中心页不能直接点「成交」 | 成交入口在联盟秘书处 |
| 中心 Token 购买不自动创建 Deal | 设计如此；Deal 由撮合驱动 |
| 会员演示固定长安映缔 | 登录用户 org 绑定 |
| 扣费「模拟」按钮在生态闭环页 | MVP 允许；真实中心工单钩子可列为下一迭代 |

下一迭代候选：中心工单状态变更自动 `consumeDeal`；项目级子 API Key；真实支付。
