# 微短剧产业服务 · SaaS 平台

> **定位（V1.3）：** 联盟**会员协作中枢**——项目、全联盟需求与撮合订单、进度、**Tokens 钱包 + API 聚合 + 算力调度**、通知。  
> 出海为专业服务线。**不做** Token 转售。  
> 升级说明：[docs/SCHEME_V13.md](./docs/SCHEME_V13.md)

## 文档（主交付）

| 文档 | 用途 |
|------|------|
| [docs/SCHEME_V13.md](./docs/SCHEME_V13.md) | **V1.3 方案升级总览** |
| [docs/PRD.md](./docs/PRD.md) | 产品需求 V1.3 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 目标技术 V1.3 |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | 现行 HTTP 契约 |
| [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md) | 验收放行 |
| [docs/P1_BOUNDARY.md](./docs/P1_BOUNDARY.md) | 实现边界 |
| [docs/README.md](./docs/README.md) | 文档地图与协作 |

**协作：** 文档线负责方案与验收审核；实现按验收清单开发。UI 审美非文档线主责。

## 快速开始

```bash
cd xian-drama-saas && npm install && npm run dev
```

| 入口 | 路径 |
|------|------|
| **P1 会员中枢** | `/app/login` → `/app/workspace` |
| 出海 / 联盟 / 五中心演示 | `/overseas` · `/alliance` · `/center` |

生产：`npm run build && npm start`
