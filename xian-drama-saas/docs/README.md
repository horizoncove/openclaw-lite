# 文档与协作约定

> 更新：2026-07-25 · **整合主文档 R2.0 / T2.0**

## 主入口（先读这两份）

| 文档 | 说明 |
|------|------|
| **[REQUIREMENTS.md](./REQUIREMENTS.md)** | **需求文档整合版 R2.0**（含 A/B/C/D/R + 监督视角） |
| **[TECHNICAL.md](./TECHNICAL.md)** | **技术文档整合版 T2.0**（含监督子系统） |

## 外发给 MiniMax / Trae

| 文档 | 说明 |
|------|------|
| **[PACK_MINIMAX_TRAE.md](./PACK_MINIMAX_TRAE.md)** | 单文件合集 |
| [SEND_TO_MINIMAX_TRAE.md](./SEND_TO_MINIMAX_TRAE.md) | 附言模板 |

## 专题深挖（按需）

| 文档 | 说明 |
|------|------|
| [CORE_VALUE_MATCHING.md](./CORE_VALUE_MATCHING.md) | 北极星：适配 × 信任 |
| [FLYWHEEL_AND_BUSINESS_LOOP.md](./FLYWHEEL_AND_BUSINESS_LOOP.md) | 主轮 + 卫星飞轮 |
| [DECISION_TOKEN_SETTLEMENT.md](./DECISION_TOKEN_SETTLEMENT.md) | Tokens 进/转/出 D1.3 |
| [SUPERVISION_VIEW.md](./SUPERVISION_VIEW.md) | 监管监督视角专册 |
| [BUSINESS_MODEL_RESEARCH.md](./BUSINESS_MODEL_RESEARCH.md) | 商业模式研究 BM1.0 |
| [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | 服务中心业务逻辑 |
| [USER_REQUIREMENTS.md](./USER_REQUIREMENTS.md) | 用户画像 Jobs |
| [REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md) | 旧 SRS（由 R2.0 承接） |
| [SAAS_ARCHITECTURE.md](./SAAS_ARCHITECTURE.md) | 旧架构总册（由 T2.0 承接） |
| [PRD.md](./PRD.md) / [API_CONTRACT.md](./API_CONTRACT.md) / [ACCEPTANCE.md](./ACCEPTANCE.md) | 字段、契约、放行 |

冲突顺序：北极星 → D1.3 → **REQUIREMENTS R2.0** → **TECHNICAL T2.0** → PRD/契约 → 外审壳。

## 已确认决策

1. 北极星：信任保障 × 撮合适配保障  
2. 飞轮：A 主轮；B 加油；C 法币旁路；D 治理+**监督视角**；R 回收出口  
3. Tokens 进/转/出；禁互兑/挂单/购入即兑  
4. 日常入口 `/app`；监管入口 `/app/supervision`  
