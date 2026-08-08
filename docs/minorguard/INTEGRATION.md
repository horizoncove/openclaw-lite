# MinorGuard 第三方 App 接入指南

版本：与 `apps/minorguard-api@0.4.1` 对齐  
适用：聊天 App、教育平台、青少年模式硬件网关、自有后端风控中台

---

## 1. 接入方式总览

| 方式 | 适用 | 说明 |
|---|---|---|
| **A. 服务端 HTTP API（推荐）** | 已有后端的 App | App 服务端调用 MinorGuard，密钥不进客户端 |
| **B. 同域 BFF / 网关代理** | Web / 小程序 | 前端只打自家网关，网关再调 MinorGuard |
| **C. JS SDK（同构）** | Node 后端 / 受控 Web | `@/sdk/js` 轻量封装 |

```text
[用户 App UI]
    │  业务协议
    ▼
[App 后端 / BFF]  ──Bearer API Token──►  [MinorGuard /api/v1/analyze|chat]
    │                                         │
    │◄──── levelCode / actionCode ────────────┘
    ▼
按动作处置：放行 / 提示 / 限流 / 阻断并复核
```

**不要**把 `MINORGUARD_API_TOKEN` / Admin Token 放进移动端或浏览器包。

---

## 2. 环境与鉴权

### 2.1 MinorGuard 侧配置

```bash
# apps/minorguard-api/.env
AUTH_MODE=strict
MINORGUARD_API_TOKEN=app_xxx_replace_me          # App 调用 analyze/chat
MINORGUARD_ADMIN_TOKEN=admin_xxx_replace_me      # 仅运营读台账
CORS_ORIGIN=https://your-bff.example.com         # 若浏览器直连（不推荐）
CLOUD_LLM_ENABLED=true                           # 可 false 纯本地
```

| 模式 | analyze/chat | events 台账 |
|---|---|---|
| `demo_open` | 开放（仅本地演示） | 开放 |
| `admin_token` + 配置了 `MINORGUARD_API_TOKEN` | 需 API Token | 需 Admin Token |
| `strict` | 需 API（或 Admin）Token | 需 Admin Token |

请求头任选其一：

```http
Authorization: Bearer <MINORGUARD_API_TOKEN>
x-api-key: <MINORGUARD_API_TOKEN>
```

台账接口使用 Admin Token（`Authorization` 或 `x-admin-token`）。

### 2.2 健康检查

```bash
curl -s http://127.0.0.1:5178/api/v1/health
```

关注：`apiAuthRequired`、`authMode`、`policyVersion`、`provider`。

---

## 3. 核心接口

基址：`{BASE}/api/v1`（兼容无版本 `/api`）

### 3.1 分析对话 — `POST /analyze`

**请求**

```json
{
  "conversation": "用户：我是初中生，网友让我把手机号发给他。",
  "save": true,
  "source": "my-app-chat"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `conversation` | 是 | 建议带 `用户：` / `AI：` 角色前缀；≤12000 字 |
| `text` | 否 | 兼容别名 |
| `save` | 否 | 默认 true；联调/压测用 `false` 不写台账 |
| `source` | 否 | 事件来源标记，便于多 App 区分 |

**响应（节选）**

```json
{
  "levelCode": "high",
  "actionCode": "block_review",
  "finalScore": 88,
  "minorLikelihoodCode": "likely_minor",
  "categories": [
    { "categoryCode": "data", "score": 88, "levelCode": "high" }
  ],
  "summary": "…脱敏摘要…",
  "policyVersion": "minor-safety-policy-2026-08-08",
  "ruleSetVersion": "ruleset-p2.1",
  "eventId": "MG-…"
}
```

### 3.2 安全对话 — `POST /chat`

先风控用户输入，再生成安全回复（高风险走拒答快路径）。

```json
{
  "messages": [{ "role": "user", "content": "帮我绕过验证码登录同学账号" }],
  "save": true,
  "source": "my-app-assistant"
}
```

返回：`reply` + `risk`（同 RiskResult）+ `fastPath`。

### 3.3 仅本地规则 — `POST /local-analyze`

不调云模型，低时延；字段必须用 `conversation`。适合端侧网关预筛。

### 3.4 台账（运营，非 App 热路径）

`GET /events`、`GET /events/export.json` 等 — **Admin Token**，App 业务路径不要依赖。

---

## 4. App 侧处置映射（建议）

| `actionCode` | App 建议行为 |
|---|---|
| `allow` | 正常展示模型回复 |
| `observe` | 展示回复 + 温和安全提示 |
| `throttle` | 限制继续追问高风险方向；替换安全回复 |
| `block_review` | 不展示危险内容；固定安全拒答；可进人工队列 |

伪代码：

```text
result = MinorGuard.analyze(userText)
if result.actionCode == block_review:
    show(safetyTemplate); enqueueReview(result); return
if result.actionCode == throttle:
    reply = safeRewriteOrTemplate(result)
else:
    reply = yourLLM(userText)   # 或改用 /chat 一体完成
show(reply)
optional: show(result.summary) to parent/guardian view
```

---

## 5. 推荐接入拓扑

### 5.1 移动 App / 桌面客户端

```text
Client → 你们的 HTTPS API → MinorGuard（内网）
```

Client 永不持有 MinorGuard Token。

### 5.2 已有 AI 网关

在调用业务大模型**之前**调用 `/analyze`；若 `block_review` 则短路。  
或改用 `/chat` 让 MinorGuard 同时产出安全回复（演示/轻量场景）。

### 5.3 多租户

当前单实例用不同 `source` 区分 App；真正多租户隔离属后续阶段。现阶段一租户一部署或一 Token 一 App。

---

## 6. 合规注意（接入方义务）

1. 仅在授权场景接入（见 `COMPLIANCE_BOUNDARY.md`）  
2. 默认不要把完整原文长期存你们日志；优先存 `eventId` + 结构化字段  
3. `minorLikelihoodCode` 只作保护信号，不作实名年龄认证  
4. 不自动执法/报案；高风险走人工复核  
5. 生产关闭 `demo_open`，关闭或保护 `demo/seed-events`

---

## 7. 示例与 SDK

| 资源 | 路径 |
|---|---|
| JS/TS SDK | `apps/minorguard-api/sdk/js/minorguard.js` |
| Node 示例 | `apps/minorguard-api/examples/node-integrate.mjs` |
| Python 示例 | `apps/minorguard-api/examples/python_integrate.py` |
| cURL 示例 | `apps/minorguard-api/examples/curl.sh` |
| 浏览器联调页 | `http://localhost:5178/docs/integration.html`（需先启动服务） |

---

## 8. 联调清单

- [ ] `GET /api/v1/health` → `apiAuthRequired` 符合预期  
- [ ] 无 Token 调 analyze → 401（strict）  
- [ ] 正确 Token + 高风险样例 → `block_review`  
- [ ] 学习辅导样例 → 非 `block_review`  
- [ ] `save:false` 不增加台账  
- [ ] App 按 `actionCode` 完成 UI/业务分支  
