# 微短剧产业 · AI Agent 工作端

> **形态：** AI Agent 工作端（非传统 SaaS 平台壳）— 见 [docs/PRODUCT_SHELL.md](./docs/PRODUCT_SHELL.md)  
> **当前 MVP：** 客户买 Token → 发悬赏 → 供应商接单 → 平台托管收付 Token（由 Agent 编排，关键步人工确认）。

## 演示（纯前端页面）

```bash
cd xian-drama-saas && npm install && npm run dev:web
```

打开：**http://localhost:5173/work/login**

| 入口 | 路径 |
|------|------|
| **Agent 工作端演示** | `/work/login` → `/work` |
| 旧 P1 中枢 | `/app/login` |
| 演示壳 | `/overseas` · `/alliance` · `/center` |

演示账号：王敏（客户）/ 马川（供应商）。可在对话里走完购 T→发悬赏→应征→冻结→验收。

## 先读

| 文档 | 用途 |
|------|------|
| **[docs/PRODUCT_SHELL.md](./docs/PRODUCT_SHELL.md)** | **产品形态拍板** |
| **[docs/MVP.md](./docs/MVP.md)** | **最小 MVP 范围** |
| [docs/UI_DESIGN.md](./docs/UI_DESIGN.md) | 工作端 UI 约束 |
| [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) | 需求 R2.3 |
| [docs/TECHNICAL.md](./docs/TECHNICAL.md) | 技术 T2.1 |
| **[docs/PACK_CORE.md](./docs/PACK_CORE.md)** | 外发核心包 |

## 完整本地（含 API）

```bash
cd xian-drama-saas && npm install && npm run dev
```

> 仓库目录名仍含 `saas`，仅为历史路径；对外与实现均按 **工作端** 理解。
