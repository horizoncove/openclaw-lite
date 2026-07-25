# 文档与协作约定

> 更新：2026-07-25 · **需求总册 R1.1 + 架构总册 T1.0**  
> 适用：`xian-drama-saas/` 后续迭代

## 角色分工

| 角色 | 职责 | 不做 |
|------|------|------|
| **文档 / 审核** | 需求、架构、契约、验收；审核实现与外部演示 | UI 审美主导 |
| **实现 Agent** | 按验收清单编码 | 擅自改拍板决策 |
| **产品决策** | 可见性 / 结算闸门 / 三角分层 等 | — |

**原则：先契约与验收，后实现；偏差必须回写文档或修代码。**

---

## 两套主文档（先读）

| 文档 | 说明 | 权威 |
|------|------|------|
| **[REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md)** | **需求规格总册 R1.1（SRS）** | 需求入口 |
| **[SAAS_ARCHITECTURE.md](./SAAS_ARCHITECTURE.md)** | **SaaS 技术架构总册 T1.0** | 技术入口 |

---

## 完整文档地图

### A. 需求与商业

| 文档 | 说明 | 权威 |
|------|------|------|
| [USER_REQUIREMENTS.md](./USER_REQUIREMENTS.md) | 用户画像 / 场景 / Jobs（U1.0） | 用户侧真源 |
| [PAIN_FIRST_PRINCIPLES.md](./PAIN_FIRST_PRINCIPLES.md) | 痛点 P1–P5 | 痛点推导 |
| [ECOSYSTEM_AND_USAGE.md](./ECOSYSTEM_AND_USAGE.md) | 功能 F1–F25 + 闭环 A/B/C/D/R | 功能与飞轮 |
| [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | 商业模式 × 服务中心（B1.4） | 商务真源 |
| [DECISION_TOKEN_SETTLEMENT.md](./DECISION_TOKEN_SETTLEMENT.md) | Tokens 进/转/出（D1.3） | 结算决策 |
| **[REQUIREMENTS_SPEC.md](./REQUIREMENTS_SPEC.md)** | **SRS 汇总（含扩展功能清单）** | 评审入口 |
| [PRD.md](./PRD.md) | 产品功能规格 | 界面/字段级 |
| [SCHEME_V13.md](./SCHEME_V13.md) | V1.3 方案升级索引 | 增量索引 |

### B. 技术与工程

| 文档 | 说明 | 权威 |
|------|------|------|
| **[SAAS_ARCHITECTURE.md](./SAAS_ARCHITECTURE.md)** | **整体 SaaS 架构** | 技术入口 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 模块级技术详规 | 补充 |
| [API_CONTRACT.md](./API_CONTRACT.md) | 现行 HTTP 契约 | 联调 |
| [P1_BOUNDARY.md](./P1_BOUNDARY.md) | 仓库现状 vs 目标 | 审核基线 |
| [ACCEPTANCE.md](./ACCEPTANCE.md) | 验收与放行 | 放行 |

### C. 外部对照（最弱）

| 文档 | 说明 |
|------|------|
| [FEEDBACK_HUB_V33.md](./FEEDBACK_HUB_V33.md) 等 | 外部演示壳意见 / 历史笔记 |

冲突顺序：用户目标 → 痛点 → 生态闭环 → **商业/结算拍板** → **REQUIREMENTS_SPEC / PRD** → **SAAS_ARCHITECTURE / API_CONTRACT** → 外审演示壳（最弱）。

---

## 已确认决策（滚动）

1. 工作需求全联盟可见  
2. **Tokens D1.3（进/转/出）：** 官方购入 → 托管撮合+生产消耗 → C 环法币合同和/或 Earned **官方回收销毁退 ¥**；禁互兑/挂单/购入即兑  
3. API 聚合 + 算力调度  
4. 产品三角：中枢 · 出海服务 · 撮合履约  
5. 热度测试 / 版权链不进 MVP 导航  

---

## 阅读路径（推荐）

**商务一周搞懂：**  
REQUIREMENTS_SPEC §1–4 → BUSINESS_LOGIC → DECISION_TOKEN_SETTLEMENT  

**产品开写故事：**  
USER_REQUIREMENTS → ECOSYSTEM → REQUIREMENTS_SPEC → PRD  

**研发开工：**  
REQUIREMENTS_SPEC §5–9 → SAAS_ARCHITECTURE → API_CONTRACT → P1_BOUNDARY → ACCEPTANCE  
