# MinorGuard API（P3 MVP）

未成年人生成式 AI 交互安全识别服务：本地规则 + 可选云 LLM（**豆包/方舟优先**，DeepSeek 回退）+ 策略引擎 + SQLite 台账。

- 产品文档：[`docs/minorguard/`](../../docs/minorguard/)
- **第三方 App 接入**：[`docs/minorguard/INTEGRATION.md`](../../docs/minorguard/INTEGRATION.md)
- **豆包接入**：[`docs/minorguard/DOUBAO.md`](../../docs/minorguard/DOUBAO.md)

## 启动

```bash
cd apps/minorguard-api
cp .env.example .env
# 推荐：填入豆包方舟 Key + Endpoint ID；不填则纯本地规则
npm start
```

豆包最小配置：

```bash
LLM_PROVIDER=doubao
DOUBAO_API_KEY=sk-xxxx
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=ep-xxxx
```

- Demo：`http://localhost:5178`
- 接入联调页：`http://localhost:5178/docs/integration.html`
- 豆包状态页：`http://localhost:5178/docs/doubao.html`

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
npm run test:providers  # LLM 厂商解析
npm run doubao:smoke    # 豆包接线（默认 mock；LIVE=1 实调）
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

`GET /health` 的 `llm` 字段可查看当前厂商（`doubao` / `deepseek` / `none`）。

## 安全

- 勿将真实 Key 提交 Git；**Token 只放 App 服务端**
- 对外环境使用 `AUTH_MODE=strict`
