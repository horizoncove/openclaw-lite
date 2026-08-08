# 09 · P3 开发拆解（Backlog）

版本：`minorguard-devdocs-v0.1`  
说明：按依赖排序；不写日历工期，按交付物推进。

## Epic A · 工程骨架

| ID | 任务 | 依赖 | 产出 |
|---|---|---|---|
| A1 | 建立 `apps/minorguard-api`（或等价目录）与包脚本 | 无 | 可启动空服务 |
| A2 | 路由层 `/api/v1` + 兼容旧路径 | A1 | health 通 |
| A3 | 配置加载（env schema）与密钥校验 | A1 | 无 Key 也可跑 |
| A4 | JSON Schema 契约测试 | A2 | CI/本地可跑 |

## Epic B · 领域迁移（从演示包逻辑移植，不提交密钥）

| ID | 任务 | 依赖 | 产出 |
|---|---|---|---|
| B1 | LocalRules 模块化 | A1 | 单测 |
| B2 | CloudLLM 适配器 + 超时 | A3 | 可降级 |
| B3 | PolicyEngine + policyTrace | B1 | 规则可测 |
| B4 | Analyzer 编排 merge/finalize | B1–B3 | analyze/chat |
| B5 | 前端静态资源对接新 API | B4 | Demo 可点 |

## Epic C · 持久化与鉴权

| ID | 任务 | 依赖 | 产出 |
|---|---|---|---|
| C1 | SQLite schema + migrate | A1 | events/audit 表 |
| C2 | EventStore 脱敏写入 | C1,B4 | 替代 JSON 文件 |
| C3 | Admin Token 中间件 | A3 | 401 门禁 |
| C4 | AuditLog 全覆盖 | C2,C3 | 导出可追 |
| C5 | Postgres 可选驱动 | C1 | DATABASE_URL |

## Epic D · 质量与安全

| ID | 任务 | 依赖 | 产出 |
|---|---|---|---|
| D1 | 迁移/对齐红队 30 条 | B4 | reports/ |
| D2 | `p3-check` 自动化验收 | A4,C3,D1 | 脚本 |
| D3 | security-scan（禁 Key 入库） | A1 | 扫描脚本 |
| D4 | Docker Compose 最小集 | C5 可选 | compose 文件 |

## Epic E · 双轨衔接

| ID | 任务 | 依赖 | 产出 |
|---|---|---|---|
| E1 | OnDeviceModel Adapter 接口 | B4 | 开关 |
| E2 | 映射表实现（见 DUAL_TRACK_MAPPING） | E1 | mappingVersion |
| E3 | 挂载研究轨 ONNX 冒烟 | E2 | 集成说明 |

## 推荐实施顺序

```text
A1 → A2 → A3 → B1 → B3 → B2 → B4 → C1 → C2 → C3 → C4
        ↘ A4          ↘ D3
B4 → B5 → D1 → D2
B4 → E1 → E2 → E3
C1 → C5 → D4
```

## 完成定义（DoD）

每个 Epic 合并前至少满足：

1. 有对应测试或检查脚本
2. 不引入密钥/真实 PII
3. 更新 `STATUS.md` 或 WORKLOG（若建）
4. 不破坏 `API_CONTRACT.md` 枚举稳定性

## P3 之后（预告，不在本 backlog 开工）

- P4：策略外置配置中心、原因码体系、人工复核回填
- P5：授权 SDK 原型
- P6：多角色工作台
- 与研究轨多轮/多模态路线并行对齐
