# MVP 验证手册 · 给 Minimax & Trae

> 目的：在**不重新发明产品**的前提下，验证现有 `xian-drama-saas` v1.6.0 生态闭环是否可演示、可验收、可修。  
> 先读：[`PRD.md`](./PRD.md) → [`TECH.md`](./TECH.md) → 本文。

---

## 0. 分工（强制）

| 代理 | 角色 | 必做 | 交付文件 |
|------|------|------|----------|
| **Minimax** | 产品 / 体验验证官 | 按脚本走完 UI；记录缺口与体验问题 | `docs/reports/minimax-mvp-report.md` |
| **Trae** | 工程 / 接口验证官 | API + 构建 + 数据一致性；能修则修 | `docs/reports/trae-mvp-report.md` + 如有修复则提 PR |

两者**不要改产品方向**；发现 Out of Scope 记入「下一迭代」，不要擅自做支付/真网关。

---

## 1. 环境准备（共用）

```bash
git clone <repo>
cd xian-drama-saas
npm install
npm run build          # 必须绿
npm run dev            # :5173 + :3001
curl -s http://localhost:3001/api/health | jq .
```

期望 health 含：

```json
{
  "ok": true,
  "service": "xian-drama-saas",
  "portals": ["alliance", "center"]
}
```

若连远程 Render：以当时部署版本为准；闭环 API 需 ≥ v1.6.0。

重置演示数据（可选）：

```bash
curl -X POST http://localhost:3001/api/alliance/reset
curl -X POST http://localhost:3001/api/center/reset
```

---

## 2. Minimax：产品验收脚本（约 20 分钟）

### M1 双入口

- [ ] 打开 `/`，可见联盟入口与五大中心入口  
- [ ] 文案能理解「数据隔离」

### M2 秘书处成交（核心）

1. `/alliance/login` → 选**联盟秘书处**  
2. 进入 **供需撮合**  
3. 找一条「开放」或「撮合中」  
4. 确认供给方、场景包  
5. 点 **成交并开预算**  
6. 记录：`dealId`、买方机构、场景包额度  

**通过标准**：状态变已成交；生态闭环页能看到新项目；开预算流水存在。

失败时填写：

```
复现步骤：
期望：
实际：
截图/接口报错：
```

### M3 扣费分账

1. 进入 **生态闭环**  
2. 对在途项目点 **模拟中心履约扣费**  
3. 核对：已耗上升；撮合费/供给激励增加；四方「下一步」文案仍可读  

### M4 会员钱包

1. 退出 → 会员单位登录（王敏）  
2. **项目钱包**：余额、买方/卖方分区、补充 50k  
3. 首页能看到项目/钱包入口  

### M5 中心叙事

1. `/center/login` 任选角色  
2. **Token 服务**：有套餐、模型目录、API Key  
3. **全景看板**可打开  
4. 能向非技术同事解释：「Token 是履约燃料，不是游戏币」

### M6 体验打分（1–5）

| 项 | 分 | 一句话 |
|----|----|--------|
| 闭环是否好懂 |  |  |
| 场景包是否像业务 |  |  |
| 会员是否知道下一步 |  |  |
| 秘书处是否愿天天用 |  |  |
| 演示是否 5 分钟讲完 |  |  |

### Minimax 报告模板

写入 `docs/reports/minimax-mvp-report.md`：

```markdown
# Minimax MVP 验证报告
- 日期：
- 环境：local / render
- 版本（/api/health）：
## 用例结果
| ID | 结果 | 备注 |
|----|------|------|
| M1 | PASS/FAIL | |
| M2 | | |
| M3 | | |
| M4 | | |
| M5 | | |
## 体验评分
## P0/P1 缺口（仅产品）
## 建议下一迭代（不做本期）
## 结论：MVP 可演示？ YES/NO
```

---

## 3. Trae：技术验收脚本（约 30 分钟）

### T1 构建

```bash
npm run build
```

- [ ] 通过  

### T2 状态形状

```bash
curl -s http://localhost:3001/api/alliance/state | jq '{
  matches:(.matches|length),
  deals:(.deals|length),
  wallets:(.orgWallets|length),
  scenes:(.scenePackages|length),
  works:(.works|length),
  venues:(.venues|length)
}'

curl -s http://localhost:3001/api/center/state | jq '{
  orders:(.orders|length),
  models:(.tokenModels|length),
  packages:(.tokenPackages|length),
  balance:.tokenWallet.balance
}'
```

期望：alliance 的 deals/wallets/scenes > 0；center token 结构完整。

### T3 成交 API

先取一条未成交 match：

```bash
MATCH=$(curl -s http://localhost:3001/api/alliance/state | jq -r '.matches[] | select(.status=="开放" or .status=="撮合中") | .id' | head -1)
ORG=$(curl -s http://localhost:3001/api/alliance/state | jq -r --arg id "$MATCH" '.matches[] | select(.id==$id) | .org')
# 确保余额
curl -s -X POST http://localhost:3001/api/alliance/wallets/topup \
  -H 'content-type: application/json' \
  -d "{\"org\":\"$ORG\",\"amount\":100000}" | jq .

curl -s -X POST http://localhost:3001/api/alliance/deals/close \
  -H 'content-type: application/json' \
  -d "{\"matchId\":\"$MATCH\"}" | jq '{
    match:(.matches[]|select(.id=="'"$MATCH"'")|{status,dealId}),
    deal:(.deals[0]|{id,budget,spent,status}),
    wallet:(.orgWallets[]|select(.org=="'"$ORG"'")|.balance)
  }'
```

- [ ] match 已成交且有 dealId  
- [ ] 新 deal budget > 0 且 spent=0  
- [ ] 买方余额减少  

再关一次同一 match，应 4xx/错误信息（幂等保护）。

### T4 扣费 API

```bash
DEAL=$(curl -s http://localhost:3001/api/alliance/state | jq -r '.deals[] | select(.status!="已结算") | .id' | head -1)
curl -s -X POST "http://localhost:3001/api/alliance/deals/$DEAL/consume" \
  -H 'content-type: application/json' \
  -d '{"amount":8000,"actor":"trae-bot","note":"MVP验证扣费","model":"xian-drama/script-v1"}' \
  | jq --arg id "$DEAL" '.deals[] | select(.id==$id) | {status,spent,budget,brokerEarned,supplierEarned,ledger:(.ledger|map(.type))}'
```

- [ ] ledger 含 `消耗`，且通常含 `撮合费`/`供给激励`  
- [ ] spent 增加  

### T5 隔离性

```bash
curl -s http://localhost:3001/api/center/state | jq 'has("members")'   # 应为 false
curl -s http://localhost:3001/api/alliance/state | jq 'has("tokenWallet")' # 应为 false
```

### T6 代码红线

- [ ] 未把工具模块放到被 gitignore 的 `src/lib/`  
- [ ] `dealLoop` 前后端规则无明显分叉  
- [ ] 未引入真实密钥/支付  

### Trae 报告模板

写入 `docs/reports/trae-mvp-report.md`：

```markdown
# Trae MVP 验证报告
- 日期：
- 环境：
- commit：
## T1–T6 结果表
## 已修复（如有）
- commit / PR：
## 未修 P0
## 技术债
## 结论：接口层 MVP 就绪？ YES/NO
```

---

## 4. 联合验收会议（15 分钟）

1. Minimax 演示 5 分钟脚本（PRD §7）  
2. Trae 展示 health + close + consume 三段 jq 输出  
3. 对照缺口：只收 **P0（阻断演示）**  
4. 签字结论：

```
MVP 验证结论：通过 / 有条件通过 / 不通过
有条件通过的条件：
负责人：Minimax ______  Trae ______
```

---

## 5. P0 / P1 定义

| 级别 | 定义 | 处理 |
|------|------|------|
| **P0** | 无法成交、无法扣费、build 失败、双门户串数据 | 当场修或打回 |
| **P1** | 文案不清、缺空态、按钮禁用无提示 | 记入下一迭代 |
| **P2** | 视觉微调、更多图表 | backlog |

---

## 6. 给代理的系统提示（可直接粘贴）

### Minimax

```
你是 Minimax，负责西安微短剧 SaaS 生态闭环的 MVP 产品验证。
只做验收与报告，不改产品方向。阅读 xian-drama-saas/docs/PRD.md 与 MVP-VALIDATION.md。
按 M1–M6 执行，输出 docs/reports/minimax-mvp-report.md。
Out of Scope：真实支付、真模型网关、重做 UI 风格。
```

### Trae

```
你是 Trae，负责同一项目的 MVP 技术验证与必要修复。
阅读 xian-drama-saas/docs/TECH.md 与 MVP-VALIDATION.md。
执行 T1–T6；P0 缺陷可直接修并提交，保持 dealLoop 前后端一致。
禁止把代码放到 src/lib/（被 gitignore）。完成后写 docs/reports/trae-mvp-report.md。
```

---

## 7. 完成定义（DoD）

MVP 验证完成 = 同时满足：

1. 两份报告落盘  
2. 无未关闭 P0  
3. Minimax 结论「可演示」且 Trae 结论「接口就绪」  
4. （可选）联合演示录像或逐步截图附在 `docs/reports/`
