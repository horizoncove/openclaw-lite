# 文档与协作约定

> 更新：2026-07-24 · **方案 V1.3**  
> 适用：`xian-drama-saas/` 后续迭代

## 角色分工

| 角色 | 职责 | 不做 |
|------|------|------|
| **文档 / 审核** | PRD、架构、契约、验收；审核实现与外部演示 | UI 审美主导 |
| **实现 Agent** | 按 V1.3 验收清单编码 | 擅自改拍板决策 |
| **产品决策** | 可见性 / 转售 / 三角分层 等 | — |

**原则：先契约与验收，后实现；偏差必须回写文档或修代码。**

---

## 文档地图

| 文档 | 说明 | 权威 |
|------|------|------|
| **[USER_REQUIREMENTS.md](./USER_REQUIREMENTS.md)** | **用户需求 U1.0（先读：谁、场景、Jobs）** | 用户侧真源 |
| **[PAIN_FIRST_PRINCIPLES.md](./PAIN_FIRST_PRINCIPLES.md)** | **核心痛点第一性原理（P1–P5）** | 痛点推导 |
| **[ECOSYSTEM_AND_USAGE.md](./ECOSYSTEM_AND_USAGE.md)** | **使用功能 F1–F25 + 闭环 A/B/C/D/R（E1.2）** | 功能与飞轮 |
| **[BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md)** | **生态闭环×商业模式×服务中心（B1.4）** | 商务真源 |
| **[DECISION_TOKEN_SETTLEMENT.md](./DECISION_TOKEN_SETTLEMENT.md)** | **Tokens 进/转/出总逻辑（D1.3）** | 结算决策 |
| [SCHEME_V13.md](./SCHEME_V13.md) | V1.3 方案升级总说明 | 增量索引 |
| [PRD.md](./PRD.md) | 产品功能规格 V1.3 | 功能规格 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目标技术 V1.3 | 目标架构 |
| [P1_BOUNDARY.md](./P1_BOUNDARY.md) | 仓库现状 vs 目标 | 审核基线 |
| [API_CONTRACT.md](./API_CONTRACT.md) | 现行 HTTP 契约 | 联调 |
| [ACCEPTANCE.md](./ACCEPTANCE.md) | 验收与放行 | 放行 |
| [FEEDBACK_HUB_V33.md](./FEEDBACK_HUB_V33.md) | 外部中枢演示 v3.3 | 对照 |
| [FEEDBACK_TO_CODEBUDDY.md](./FEEDBACK_TO_CODEBUDDY.md) | 出海服务站意见 | 对照 |
| [FEEDBACK_TO_MINIMAX.md](./FEEDBACK_TO_MINIMAX.md) | 早期撮合展台意见 | 历史 |
| [FEEDBACK_HUB_V32.md](./FEEDBACK_HUB_V32.md) | 中枢 v3.2 | 历史 |
| [REVIEW_REF_MINIMAX_DEMO.md](./REVIEW_REF_MINIMAX_DEMO.md) | 首次外审笔记 | 历史 |

冲突顺序：用户目标 → 痛点命题 → 使用/生态闭环 → **商业/服务中心逻辑** → 拍板决策 → API_CONTRACT/BOUNDARY → PRD/ARCH → 外审演示壳（最弱）。

---

## 已确认决策（滚动）

1. 工作需求全联盟可见  
2. **Tokens D1.3（进/转/出）：** 官方购入 → 托管撮合+生产消耗 → C 环法币合同和/或 Earned **官方回收销毁退 ¥**；禁互兑/挂单/购入即兑（[DECISION_TOKEN_SETTLEMENT.md](./DECISION_TOKEN_SETTLEMENT.md)）  
3. API 聚合 + 算力调度  
4. 产品三角：中枢 · 出海服务 · 撮合履约  
5. 热度测试 / 版权链不进 MVP 导航  

## P1 决议

| 问题 | 决议 |
|------|------|
| 客户端 | Web only |
| 算力 Worker | 人工 transition |
| BYOK | 否 |
| 强制已读 UX | 否 |
| 子 Key | Phase 2 |

---

## 给实现 Agent

1. 先读 `SCHEME_V13.md` + `ACCEPTANCE.md` V1.3 必改清单  
2. PR 注明验收编号；计费/状态机附 curl 输出  
3. 完成 §9 缺口后回写 `API_CONTRACT.md`  
