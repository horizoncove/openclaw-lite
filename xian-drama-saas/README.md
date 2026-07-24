# 微短剧产业服务 · SaaS 平台

> **定位（V1.2）：** 会员协作中枢——管项目、全联盟工作需求、进度、**API 聚合与算力调度**、撮合、通知。  
> **不做** Token 转售。

## 文档（主交付）

实现与联调请先读文档，再看代码：

| 文档 | 用途 |
|------|------|
| [docs/README.md](./docs/README.md) | 文档地图与协作分工 |
| [docs/PRD.md](./docs/PRD.md) | 产品需求 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 目标技术设计 |
| [docs/P1_BOUNDARY.md](./docs/P1_BOUNDARY.md) | 当前实现边界 / 审核基线 |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | **现行 HTTP 契约** |
| [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md) | 验收清单与审核结论 |

**协作约定：** 文档线负责需求/架构/契约与验收审核；实现 Agent 按契约开发。UI 审美不作为文档线主责。

## 快速开始

```bash
cd xian-drama-saas && npm install && npm run dev
```

| 入口 | 路径 |
|------|------|
| **P1 会员中枢** | `/app/login` → `/app/workspace` |
| 出海 / 联盟 / 五中心演示 | `/overseas` · `/alliance` · `/center` |

演示账号：王敏、马川、赵晴、陈希（秘书处）、韩磊（运维）。

生产启动：`npm run build && npm start`
