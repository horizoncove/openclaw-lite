# 微短剧出海服务中心 · SaaS 平台

> **重要：** 当前代码中的出海门户仍是演示壳。正式需求与技术方案见 [`docs/`](./docs/)。请先评审文档，再按 Phase 1 重构实现。

| 文档 | 链接 |
|------|------|
| 产品需求（PRD） | [`docs/PRD.md`](./docs/PRD.md) |
| 技术设计 | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 文档索引 | [`docs/README.md`](./docs/README.md) |

---

## 演示入口（非正式交付）

**出海运营 SaaS 演示壳**（独立门户）+ 联盟会员 SaaS + 五大中心运营 SaaS。

### 出海服务中心（V2.0 演示）

| 模块 | 能力 |
|------|------|
| 出海官网 | 品牌落地页与服务能力介绍 |
| 运营台 | 总览、项目漏斗、译制本地化、平台伙伴、商务谈判、结算对账、市场情报、客户进件 |
| 制片方门户 | 提交出海需求、查看项目进度 |

演示账号：运营台选「出海运营（韩磊）」；客户选「制片方客户（王敏）」。

## 快速启动

```bash
cd xian-drama-saas
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- 出海首页：`http://localhost:5173/overseas`
- API：`http://localhost:3001/api`

## 入口

| 路径 | 说明 |
|------|------|
| `/overseas` | 出海服务中心官网 |
| `/overseas/login` | 出海登录（运营 / 客户） |
| `/overseas/console` | 出海运营台 |
| `/overseas/client` | 制片方门户 |
| `/` | 总平台（联盟 / 中心 / 出海） |

## API

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/overseas/stats
curl http://localhost:3001/api/overseas/state
```

## 技术栈（演示）

- 前端：React + TypeScript + Vite + React Router
- 后端：Express + JSON 文件（出海门户）/ PostgreSQL（联盟与中心可选）
- 部署：Docker Compose / Railway / Render

目标技术栈以 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) 为准。

## 生产部署

见 [`deploy/PAAS.md`](./deploy/PAAS.md) 与 [`deploy/DEPLOY.md`](./deploy/DEPLOY.md)。
