# 微短剧产业服务 · SaaS 平台

> **定位（V1.2）：** 会员协作中枢——管项目、全联盟工作需求、进度、**API 聚合与算力调度**、撮合、通知。  
> **不做** Token 转售。文档：[`docs/PRD.md`](./docs/PRD.md) · [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## 快速开始

```bash
cd xian-drama-saas && npm install && npm run dev
```

| 入口 | 路径 |
|------|------|
| **P1 会员中枢**（主产品） | `/app/login` → `/app/workspace` |
| 出海服务演示 | `/overseas` |
| 联盟 / 五中心演示 | `/alliance` · `/center` |

## P1 能力切片

- 工作台 / 我的项目与任务
- 工作需求广场（发布后全联盟可见、应征、确认）
- 撮合机会、联盟通知
- 机构钱包 + XD-Router（`POST /v1/chat/completions`，OpenAI 兼容）
- 算力作业队列（创建 → running → succeeded/failed）

演示账号：王敏（长安映缔）、马川、赵晴、陈希（秘书处）、韩磊（运维）。

```bash
# 健康检查
curl -s http://127.0.0.1:3001/api/v1/health

# 网关试调（API Key 见钱包页或 seed）
curl -s http://127.0.0.1:3001/v1/chat/completions \
  -H "Authorization: Bearer <org-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"你好"}]}'
```

生产启动：`npm run build && npm start`
