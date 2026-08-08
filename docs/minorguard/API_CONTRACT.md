# 04 · API 契约与机器码（P2 冻结 → P3 延用）

版本：`minorguard-devdocs-v0.1`  
兼容：演示包 P2 foundation

## 1. 版本策略

- P3 新增正式前缀：`/api/v1/*`
- 过渡期可同时保留无版本 `/api/*`（实现兼容层）
- 破坏性变更必须升 `v2`，并更新本文件

## 2. 稳定枚举（不得随意改名）

### 2.1 `levelCode`

| code | 分数参考 |
|---|---|
| `none` | 0–14 |
| `low` | 15–44 |
| `medium` | 45–74 |
| `high` | 75–100 |

### 2.2 `actionCode`

| code | 含义 |
|---|---|
| `allow` | 放行 |
| `observe` | 提示并观察 |
| `throttle` | 提醒并限流 |
| `block_review` | 阻断并复核 |

### 2.3 `categoryCode`

`content` | `interaction` | `tool` | `data`

### 2.4 `minorLikelihoodCode`

`confirmed_minor` | `likely_minor` | `possible_minor` | `unknown` | `adult_likely`

> 保护信号，不是实名身份结论，不得单独用于处罚。

## 3. 核心资源：`RiskResult`

必填字段：

| 字段 | 类型 |
|---|---|
| `level` | string（中文展示，可演进） |
| `levelCode` | enum |
| `score` / `finalScore` | number |
| `action` / `actionCode` | string / enum |
| `summary` | string（脱敏） |
| `categories[]` | 含 `categoryCode/score/levelCode/hits/reason` |
| `minorLikelihood` / `minorLikelihoodCode` | object / enum |
| `modelScore` / `ruleScore` / `scoreSource` / `confidence` | number/null / string / number |
| `policyTrace[]` | 策略轨迹 |
| `policyVersion` / `ruleSetVersion` | string |
| `provider` / `model` | string |

## 4. 端点清单（P3）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/v1/health` | 无 | 版本与 auth 模式 |
| POST | `/api/v1/analyze` | 按 `AUTH_MODE` | body: `{ conversation, save? }` |
| POST | `/api/v1/local-analyze` | 按模式 | 仅本地规则；字段名必须是 `conversation` |
| POST | `/api/v1/chat` | 按模式 | body: `{ messages[], save? }` |
| GET | `/api/v1/events` | Admin | 列表 + stats |
| GET | `/api/v1/events/:id` | Admin | 详情 |
| DELETE | `/api/v1/events` | Admin | 清空（演示/运维） |
| GET | `/api/v1/events/export.json` | Admin | 脱敏导出 |
| GET | `/api/v1/events/export.md` | Admin | 脱敏导出 |
| POST | `/api/v1/demo/seed-events` | Admin | 仅非生产 |

## 5. 事件对象 `RiskEvent`

仅存：

- 结构化 `RiskResult` 关键字段
- `snippet`（脱敏短文本）
- `source`（`manual-analysis` / `realtime-chat` / `demo-seed` / `redteam`）
- `createdAt`、`id`
- 可选 `replySnippet`（脱敏）

禁止存：完整原始对话、未掩码手机号/身份证、API Key。

## 6. 错误码（最小集）

| HTTP | code | 含义 |
|---|---|---|
| 400 | `INVALID_JSON` / `INVALID_MESSAGES` | 请求体错误 |
| 401 | `UNAUTHORIZED` | 缺少/错误 Token |
| 403 | `FORBIDDEN` | 角色不足 |
| 404 | `NOT_FOUND` | 事件不存在 |
| 405 | `METHOD_NOT_ALLOWED` | 方法不允许 |
| 500 | `INTERNAL` | 未捕获错误 |

## 7. 兼容注意

- `/api/local-analyze` **只认** `conversation`（演示包现状）；P3 `analyze` 可同时接受 `conversation|text`，但文档与 SDK 以 `conversation` 为准。
- 红队用例继续使用 `expectedLevel`（中文）时，实现层应同时校验 `levelCode`。
