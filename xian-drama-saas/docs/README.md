# 生态 MVP 文档索引 · 给 Minimax / Trae

本目录是 **撮合 × Token 生态闭环** 的 MVP 验证包，请按顺序阅读。

| 文档 | 给谁 | 用途 |
|------|------|------|
| [PRD.md](./PRD.md) | 产品 / Minimax | 参与者、范围、用户故事、成功标准 |
| [TRANSACTION.md](./TRANSACTION.md) | 双方必读 | **交易本质**：要约/托管/对价切割/结算 |
| [TECH.md](./TECH.md) | 工程 / Trae | 架构、模型、API、持久化、红线 |
| [MVP-VALIDATION.md](./MVP-VALIDATION.md) | 双方 | 分工、操作脚本、报告模板、系统提示词 |

报告输出目录（验证时创建）：

```
docs/reports/minimax-mvp-report.md
docs/reports/trae-mvp-report.md
```

## 5 分钟理解产品

```
会员发要约 → 秘书处匹配 → 冻结对价进托管 → 中心履约切割
→ 撮合费/供给激励/中心保留 → 剩余退回 → 项目闭环
```

代码基线：`xian-drama-saas` v1.7.0（以 `/api/health` 为准）。详读 [`TRANSACTION.md`](./TRANSACTION.md)。

## 本地一键

```bash
cd xian-drama-saas && npm i && npm run build && npm run dev
```
