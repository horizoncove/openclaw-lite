# MinorGuard API（P3 MVP）

未成年人生成式 AI 交互安全识别服务：本地规则 + 可选云 LLM + 策略引擎 + SQLite 台账。

- 产品文档：[`docs/minorguard/`](../../docs/minorguard/)
- **第三方 App 接入**：[`docs/minorguard/INTEGRATION.md`](../../docs/minorguard/INTEGRATION.md)

## 启动

```bash
cd apps/minorguard-api
cp .env.example .env
# 可选：填入 DEEPSEEK_API_KEY；不填则纯本地规则
npm start
```

- Demo：`http://localhost:5178`
- 接入联调页：`http://localhost:5178/docs/integration.html`

## 给其他 App 接入（最短路径）

1. MinorGuard 配置：

```bash
AUTH_MODE=strict
MINORGUARD_API_TOKEN=app_xxx
MINORGUARD_ADMIN_TOKEN=admin_xxx
```

2. App **服务端**调用：

```http
POST /api/v1/analyze
Authorization: Bearer app_xxx
Content-Type: application/json

{"conversation":"用户：…","save":true,"source":"your-app-id"}
```

3. 按返回的 `actionCode` 处置：`allow` / `observe` / `throttle` / `block_review`

示例：`examples/node-integrate.mjs`、`examples/python_integrate.py`、`examples/curl.sh`  
SDK：`sdk/js/minorguard.js`

## 脚本

```bash
npm run test:contract   # RiskResult 契约
npm run p3:check        # 验收冒烟（含 strict API Token）
npm run security:scan   # 扫描 sk- 密钥
npm run redteam:smoke   # 红队冒烟
npm run redteam         # 全量本地红队
```

## API 摘要

兼容 `/api/*` 与 `/api/v1/*`：

| 接口 | 鉴权 |
|---|---|
| `GET /health` | 无 |
| `POST /analyze` `/chat` `/local-analyze` | `strict` 下需 API Token |
| `GET/DELETE /events*` | Admin Token |

## 安全

- 勿将真实 Key 提交 Git；**Token 只放 App 服务端**
- 对外环境使用 `AUTH_MODE=strict`
