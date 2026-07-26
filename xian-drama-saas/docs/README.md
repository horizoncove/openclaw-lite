# 生态 MVP 文档索引 · 给 Minimax / Trae

本目录是 **撮合 × Token 生态闭环** 的 MVP 验证包，请按顺序阅读。

| 文档 | 给谁 | 用途 |
|------|------|------|
| [PRD.md](./PRD.md) | 产品 / Minimax | 参与者、范围、用户故事、成功标准 |
| [TECH.md](./TECH.md) | 工程 / Trae | 架构、模型、API、持久化、红线 |
| [MVP-VALIDATION.md](./MVP-VALIDATION.md) | 双方 | 分工、操作脚本、报告模板、系统提示词 |

报告输出目录（验证时创建）：

```
docs/reports/minimax-mvp-report.md
docs/reports/trae-mvp-report.md
```

## 5 分钟理解产品

```
会员发供需 → 秘书处成交开场景包预算 → 中心履约扣 Token
→ 秘书处拿撮合费、供给方拿激励 → 会员在项目钱包看见下一步
```

代码基线：`xian-drama-saas` v1.6.0（以 `/api/health` 为准）。

## 本地一键

```bash
cd xian-drama-saas && npm i && npm run build && npm run dev
```
