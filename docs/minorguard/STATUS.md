# 00 · 现状基线与阶段门禁

版本：`minorguard-devdocs-v0.1`  
日期：2026-08-08

## 1. 演示包基线（已完成）

来源：本地 MinorGuard Web Demo（`npm start` → `:5178`），版本声明 `0.3.0-p2-foundation`。

| 阶段 | 名称 | 状态 | 证据 |
|---|---|---|---|
| P0 | Demo 固化 | 完成 | 可分析 / 聊天 / 台账 / 导出 |
| P1 | 红队评测体系 | 完成 | 30 条样例；报告宣称严格通过 30/30 |
| P2 | 接口与数据口径 | 完成（foundation） | `levelCode`/`actionCode`/`policyTrace`；可选 Admin Token |

### 1.1 技术形态（当前）

- 单进程 Node `http` + 静态前端
- 存储：`data/events.json`、`data/audit-log.json`
- 判定：本地规则 → DeepSeek JSON 分析 → 策略校准（取 max 防漏报）
- 高风险 Chat 快路径：不调用生成模型，直接安全拒答

### 1.2 已知限制（进入 P3 的理由）

- 非模块化，难多人协作与回归
- JSON 文件不适合并发与长期存储
- 无真实角色权限（仅可选单一 Admin Token）
- 策略硬编码在 `server.js`，不可配置/不可版本化发布
- 演示包曾携带明文 API Key（`DS.env`）——**禁止再入库**
- 红队满分受模板样例与策略校准影响，不可外推开放域

## 2. 研究轨基线（可复用）

路径：`docs/minors-ai-protection/`

| 阶段 | 状态 | 可复用物 |
|---|---|---|
| P0 标签 | `p0-v1.0` 冻结 | 8 MVP 标签 + S0–S4 |
| P1 数据 | `p1-v1.0` / `v0.4` | 合成数据与评测集 |
| P2 模型 | `p2-v0.2-tiny` | ~3.2M 中文小模型 + ONNX |

产品轨 P3 不重做数据与小模型，只定义 **接入槽位与门禁**。

## 3. 阶段门禁定义

```text
P2 foundation ──► 本文档冻结 ──► P3 开发 ──► P3 验收
                      │
                      └─ 合规边界未签字前，不得接入真实未成年人业务流量
```

| 门禁 | 条件 |
|---|---|
| 进入 P3 编码 | 本目录文档经 Owner 确认；合规红线无未决否决项 |
| P3 完成 | `ACCEPTANCE_P3.md` 全项通过 |
| 进入试点（P8 前） | 另需 P4 策略可配置 + P7 安全合规加固（见产品总路线） |

## 4. 本轮文档范围（做 / 不做）

### 做

- 冻结 P3 需求、架构、接口、合规、验收与 backlog
- 双轨映射（产品四类风险 ↔ 研究标签/等级）
- 安全与密钥处理基线

### 不做（文档阶段）

- 不把演示包源码/密钥提交进仓库
- 不宣称已具备法律合规认证
- 不估算日历工期；只定义交付物与技术依赖

## 5. 编码进展（2026-08-08）

已落地：`apps/minorguard-api`（`0.4.0-p3-mvp`）

| Epic | 状态 |
|---|---|
| A 工程骨架 | 完成 |
| B 领域迁移（规则/策略/LLM/编排） | 完成（本地规则+可选云） |
| C SQLite 台账 + Admin 鉴权 + 审计 | 完成（Postgres 可选未做） |
| D p3-check / security-scan / contract | 完成（全量红队续接） |
| E ONNX Adapter | 仅 stub |
| App 接入 | `INTEGRATION.md` + JS SDK + Node/Python/cURL 示例 + strict API Token |

验证：`npm run test:contract && npm run p3:check && npm run security:scan`；接入鉴权含 strict 模式。
