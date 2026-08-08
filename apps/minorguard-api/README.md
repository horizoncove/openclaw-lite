# MinorGuard API（P3 MVP）

未成年人生成式 AI 交互安全识别服务：本地规则 + 可选云 LLM + 策略引擎 + SQLite 台账。

文档：[`docs/minorguard/`](../../docs/minorguard/)

## 启动

```bash
cd apps/minorguard-api
cp .env.example .env
# 可选：填入 DEEPSEEK_API_KEY；不填则纯本地规则
npm start
```

打开：`http://localhost:5178`

## 脚本

```bash
npm run test:contract   # RiskResult 契约
npm run p3:check        # 启动临时实例跑验收冒烟
npm run security:scan   # 扫描仓库内 sk- 密钥
npm run redteam:smoke   # 本地规则红队冒烟
```

## API

兼容 `/api/*` 与 `/api/v1/*`：

- `GET /api/v1/health`
- `POST /api/v1/analyze` `{ "conversation": "...", "save": false }`
- `POST /api/v1/local-analyze` `{ "conversation": "..." }`
- `POST /api/v1/chat` `{ "messages":[{"role":"user","content":"..."}], "save": false }`
- 事件台账：设置 `MINORGUARD_ADMIN_TOKEN` 后需 `Authorization: Bearer …`

## 安全

- 勿将真实 API Key 提交 Git
- 对外环境务必设置 `MINORGUARD_ADMIN_TOKEN` 与 `AUTH_MODE=admin_token`（或 `strict`）
