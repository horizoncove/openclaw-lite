# 微短剧产业服务 · SaaS 平台

> **定位：** 联盟**会员协作中枢**——项目、全联盟需求与撮合订单、进度、**Tokens（进/转/出）+ API 聚合 + 算力调度**、通知。  
> 出海为专业服务线。**不做** Token 转售/自由兑换。  
> **结算拍板：** [docs/DECISION_TOKEN_SETTLEMENT.md](./docs/DECISION_TOKEN_SETTLEMENT.md) D1.3

## 主文档（先读这两份）

| 文档 | 用途 |
|------|------|
| **[docs/REQUIREMENTS_SPEC.md](./docs/REQUIREMENTS_SPEC.md)** | **需求规格总册（SRS）R1.1** |
| **[docs/SAAS_ARCHITECTURE.md](./docs/SAAS_ARCHITECTURE.md)** | **SaaS 技术架构总册 T1.0** |

完整地图与协作约定：[docs/README.md](./docs/README.md)

## 文档索引

| 文档 | 用途 |
|------|------|
| [docs/USER_REQUIREMENTS.md](./docs/USER_REQUIREMENTS.md) | 用户画像 / 场景 / Jobs |
| [docs/PAIN_FIRST_PRINCIPLES.md](./docs/PAIN_FIRST_PRINCIPLES.md) | 核心痛点第一性原理 |
| [docs/ECOSYSTEM_AND_USAGE.md](./docs/ECOSYSTEM_AND_USAGE.md) | 使用功能与生态闭环 |
| [docs/BUSINESS_LOGIC.md](./docs/BUSINESS_LOGIC.md) | 商业模式与服务中心 |
| [docs/DECISION_TOKEN_SETTLEMENT.md](./docs/DECISION_TOKEN_SETTLEMENT.md) | Tokens 进/转/出决策 |
| [docs/PRD.md](./docs/PRD.md) | 产品功能规格 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 模块级技术详规 |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | 现行 HTTP 契约 |
| [docs/ACCEPTANCE.md](./docs/ACCEPTANCE.md) | 验收放行 |
| [docs/P1_BOUNDARY.md](./docs/P1_BOUNDARY.md) | 实现边界 |

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
