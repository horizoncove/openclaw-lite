# 微短剧产业 · AI Agent 工作端

> **形态：** AI Agent 工作端（非传统 SaaS 平台壳）— 见 [docs/PRODUCT_SHELL.md](./docs/PRODUCT_SHELL.md)  
> **当前 MVP：** 客户买 Token → 发悬赏 → 供应商接单 → 平台托管收付 Token（由 Agent 编排，关键步人工确认）。

## 先读

| 文档 | 用途 |
|------|------|
| **[docs/PRODUCT_SHELL.md](./docs/PRODUCT_SHELL.md)** | **产品形态拍板** |
| **[docs/MVP.md](./docs/MVP.md)** | **最小 MVP 范围** |
| [docs/UI_DESIGN.md](./docs/UI_DESIGN.md) | 工作端 UI 约束 |
| [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) | 需求 R2.3 |
| [docs/TECHNICAL.md](./docs/TECHNICAL.md) | 技术 T2.1 |
| **[docs/PACK_CORE.md](./docs/PACK_CORE.md)** | 外发核心包 |

## 快速开始

```bash
cd xian-drama-saas && npm install && npm run dev
```

| 入口 | 路径 |
|------|------|
| Agent 工作端 | `/app/login` → 工作区（对话主界面） |
| 历史演示壳 | `/overseas` · `/alliance` · `/center`（非 MVP 主壳） |

> 仓库目录名仍含 `saas`，仅为历史路径；对外与实现均按 **工作端** 理解。
