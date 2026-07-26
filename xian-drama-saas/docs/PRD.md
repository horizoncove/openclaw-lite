# 西安微短剧产业生态 · MVP 需求文档（PRD）

> **文档对象**：Minimax / Trae 等协作方做 MVP 验证与补齐  
> **产品版本基线**：`xian-drama-saas` v1.6.0  
> **仓库路径**：`xian-drama-saas/`  
> **验证目标**：跑通「撮合 → 开预算 → 履约扣费 → 激励回流」最小闭环，并证明四方参与者各自有清晰下一步

---

## 1. 背景与一句话目标

西安微短剧产业存在「找人对接难、履约无预算、服务不可计价」的问题。  
本 MVP 要验证：

**联盟撮合成交后，自动锁定场景 Token 预算；中心履约扣费；秘书处与供给方获得激励回流。**

Token 不是充值页上的数字，而是**项目履约燃料**。

---

## 2. 参与者与动机（验收必须用人话可讲清）

| 角色 | 登录入口 | 核心动机 | MVP 必须兑现 |
|------|----------|----------|--------------|
| 需求方会员 | `/alliance/login` → 会员单位 | 找对人、预算可控 | 发布供需；看项目预算与下一步 |
| 供给方会员 | 同上（被撮合机构） | 交付有回报 | 履约后看到激励 Token |
| 联盟秘书处 | `/alliance/login` → 秘书处 | 撮合可计价、可跟进 | 一键成交开预算；看撮合费 |
| 五大中心专员 | `/center/login` | 工单有预算、扣费有据 | 看到关联工单/Token 消耗叙事 |

演示账号：

| 角色 | 选择 | 绑定机构 |
|------|------|----------|
| 秘书处 | 联盟秘书处 | 联盟秘书处 |
| 会员 | 会员单位 | 王敏 · 长安映缔影视 |
| 中心 | 审批/出海/发行/版权/AI 任一 | 对应中心 |

---

## 3. MVP 范围（In / Out）

### In（必须验证）

1. **双入口隔离**：联盟 `/api/alliance` 与中心 `/api/center` 数据不混用  
2. **供需撮合**：发布 / 状态流转 / 建议供给方 + 场景包  
3. **成交开预算**：`已成交` → 创建 `DealProject` + 扣买方 `OrgWallet` + 生成工单  
4. **履约扣费分账**：消耗项目预算 → 计提撮合费 + 供给激励 → 写入 ledger  
5. **会员项目钱包**：买方项目 / 卖方激励 / 一键补额  
6. **生态闭环页**：四方视角 + 在途项目 + 场景包说明  
7. **中心 Token 聚合叙事**：套餐/模型目录存在（OpenRouter 风格），并说明与项目预算的关系  
8. **演示数据可重置**：`POST /api/alliance/reset`、`POST /api/center/reset`

### Out（本轮不做）

- 真实支付 / 发票 / 法币结算  
- 真实大模型 API 转发与计费网关  
- 复杂权限体系（RBAC、SSO）  
- 跨机构聊天 IM  
- 移动端原生 App  
- 联盟与中心合并为统一账本（保持门户隔离，闭环用 Deal 关联）

---

## 4. 用户故事（验收用例）

### US-01 秘书处一键成交

**作为**秘书处运营，**我希望**对一条「开放/撮合中」供需选择供给方与场景包并成交，**以便**立刻锁定预算并生成履约项目。

验收：

1. 打开 `/alliance/console/matching`  
2. 任选非「已成交/关闭」行，确认建议供给方与场景包  
3. 点击「成交并开预算」  
4. 该行状态变为「已成交」，出现 `DEAL-xxx`  
5. 买方 `orgWallets.balance` 减少场景包额度  
6. `deals` 新增一条，`ledger` 首条为「开预算」  
7. 生成关联工单（`orderId` / `dealId`）

余额不足时：允许自动/一键补额后再成交（演示可接受）。

### US-02 中心履约扣费（可用生态页模拟）

**作为**平台运营/中心视角，**我希望**对在途 Deal 扣费，**以便**看到预算下降与分账。

验收：

1. 打开 `/alliance/console/loop`  
2. 对「预算已开/履约中」项目点击「模拟中心履约扣费」  
3. `spent` 增加；出现「消耗 / 撮合费 / 供给激励」流水  
4. 秘书处钱包与供给方钱包余额增加对应激励  
5. `spent >= budget` 时状态变为「已结算」

### US-03 会员看清自己的钱与下一步

**作为**会员单位联系人，**我希望**在项目钱包看到我是买方还是卖方，**以便**知道该补预算还是该交付。

验收：

1. 会员登录 → `/alliance/member/deals`  
2. 显示企业 Token 余额  
3. 「我是需求方」列出 buyer 项目与 `nextActionBuyer`  
4. 「我是供给方」列出 supplier 项目与激励  
5. 「补充 50k Tokens」后余额增加

### US-04 场景包可读

**作为**任一参与者，**我希望**场景包用业务语言解释，**而不是**只显示 ¥/1M tokens。

验收：五个场景包均具备：名称、tokens、center、forBuyer/forSupplier/forBroker/forCenter。

| ID | 名称 | 参考额度 |
|----|------|----------|
| SCENE-OVERSEAS | 出海译制履约包 | 80k |
| SCENE-APPROVAL | 备案预检履约包 | 20k |
| SCENE-DIST | 投流冷启动包 | 50k |
| SCENE-AI | 剧本/素材 AI 包 | 30k |
| SCENE-VENUE | 场地协调包 | 15k |

### US-05 双门户烟测

验收：

1. `/` 双入口可进  
2. 联盟登录后不可直接看到中心会员数据混用  
3. 中心登录可进全景看板与 Token 服务页  
4. `/api/health` 返回 `ok: true`，`portals: ["alliance","center"]`

---

## 5. 核心业务规则

### 5.1 成交开预算

```
前置：match.status ∈ {开放, 撮合中} 且无 dealId
输入：matchId, supplierOrg, sceneId
动作：
  1. 校验场景包存在
  2. 买方钱包 balance >= scene.tokens（不足则提示/补额）
  3. 扣减买方钱包
  4. 创建 Deal（status=预算已开, spent=0）
  5. match.status=已成交, match.dealId=Deal.id
  6. 创建 WorkOrder（带 dealId）
  7. ledger 记录「开预算」
```

### 5.2 履约扣费

```
输入：dealId, amount, actor, note, model?
动作：
  1. spend = min(amount, budget - spent)
  2. spent += spend
  3. brokerCut = round(spend * brokerFeeRate) → 贷记秘书处钱包
  4. supplierCut = round(spend * supplierShare) → 贷记供给方钱包
  5. ledger 追加 消耗/撮合费/供给激励
  6. spent >= budget → status=已结算，关联工单可完结
```

### 5.3 项目「下一步」文案（必须有）

每个 Deal 维护四段人类可读指引：

- `nextActionBuyer`
- `nextActionSupplier`
- `nextActionBroker`
- `nextActionCenter`

状态变化时更新文案（预算已开 / 履约中 / 已结算）。

---

## 6. 信息架构（MVP 页面）

### 联盟秘书处

| 路径 | 用途 |
|------|------|
| `/alliance/console` | 总览 |
| `/alliance/console/matching` | 撮合 + 成交开预算 |
| `/alliance/console/loop` | 生态闭环全景 |
| `/alliance/console/showcase` | 作品/场地推荐（辅助） |

### 会员单位

| 路径 | 用途 |
|------|------|
| `/alliance/member` | 首页快捷入口 |
| `/alliance/member/needs` | 发布供需 |
| `/alliance/member/deals` | 项目钱包 |
| `/alliance/member/works` | 作品展示 |
| `/alliance/member/discover` | 作品/场地推荐 |

### 五大中心

| 路径 | 用途 |
|------|------|
| `/center/console` | 总览 |
| `/center/console/panorama` | 全景看板 |
| `/center/console/tokens` | Token 聚合购买（叙事+套餐） |
| `/center/console/orders` | 中心工单 |

---

## 7. 成功指标（MVP 验证通过标准）

**功能通过（硬门槛）**

- [ ] US-01～US-05 全部通过  
- [ ] `npm run build` 成功  
- [ ] `GET /api/health` 正常  
- [ ] 重置演示数据后仍可完整走通闭环  

**体验通过（软门槛）**

- [ ] 任意角色打开主路径，3 步内能说清「我接下来干什么」  
- [ ] 场景包说明对非技术用户可读  
- [ ] 无关键控制台致命错误  

**演示脚本（给评委 5 分钟）**

1. 秘书处成交一条供需  
2. 生态闭环页扣一笔费，指出分账  
3. 切换会员看项目钱包余额与激励  
4. 中心打开 Token 页说明「燃料」定位  

---

## 8. 协作分工建议（Minimax / Trae）

| 代理 | 建议负责 | 交付物 |
|------|----------|--------|
| **Minimax** | 产品走查 + 验收脚本执行 + 缺口清单 | `docs/mvp-validation-report.md`（验证报告） |
| **Trae** | 技术对照 + API/数据一致性 + 缺陷修复 PR | 对照 `TECH.md` 的差分修复 |

两方可并行：Minimax 先按本文 US 用例点点点；Trae 按技术文档核对接口与持久化。

---

## 9. 风险与假设

| 风险 | 假设 / 缓解 |
|------|-------------|
| 联盟与中心数据隔离导致闭环「看起来断开」 | MVP 用 Deal.orderId / dealId 关联；中心扣费可由联盟生态页模拟 |
| 无真实支付 | 演示充值为模拟入账 |
| PG 旧数据不刷新 | `DATA_SEED_VERSION` 升级或调用 reset |
| 演示账号单一 | 会员固定绑定长安映缔影视即可讲清买方路径 |

---

## 10. 参考实现位置

| 能力 | 代码位置 |
|------|----------|
| 成交/扣费逻辑 | `src/utils/dealLoop.ts`、`server/dealLoop.mjs` |
| 联盟 Store | `src/store/allianceStore.tsx` |
| 撮合页 | `src/pages/alliance/MatchingPage.tsx` |
| 生态闭环页 | `src/pages/alliance/EcosystemLoopPage.tsx` |
| 会员钱包 | `src/pages/alliance/member/MemberDealsPage.tsx` |
| 种子数据 | `server/data/alliance-seed.json`（deals/orgWallets/scenePackages） |

配套技术文档：[`TECH.md`](./TECH.md)  
交易本质：[`TRANSACTION.md`](./TRANSACTION.md)  
验证清单：[`MVP-VALIDATION.md`](./MVP-VALIDATION.md)
