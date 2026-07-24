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
| **[SCHEME_V13.md](./SCHEME_V13.md)** | **V1.3 升级总说明（先读）** | 增量索引 |
| [PRD.md](./PRD.md) | 产品需求 **V1.3** | 业务 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目标技术 **V1.3** | 目标架构 |
| [P1_BOUNDARY.md](./P1_BOUNDARY.md) | 仓库现状 vs 目标 | 审核基线 |
| [API_CONTRACT.md](./API_CONTRACT.md) | 现行 HTTP 契约 | 联调 |
| [ACCEPTANCE.md](./ACCEPTANCE.md) | 验收与放行 | 放行 |
| [FEEDBACK_HUB_V33.md](./FEEDBACK_HUB_V33.md) | 外部中枢演示 v3.3 | 对照 |
| [FEEDBACK_TO_CODEBUDDY.md](./FEEDBACK_TO_CODEBUDDY.md) | 出海服务站意见 | 对照 |
| [FEEDBACK_TO_MINIMAX.md](./FEEDBACK_TO_MINIMAX.md) | 早期撮合展台意见 | 历史 |
| [FEEDBACK_HUB_V32.md](./FEEDBACK_HUB_V32.md) | 中枢 v3.2 | 历史 |
| [REVIEW_REF_MINIMAX_DEMO.md](./REVIEW_REF_MINIMAX_DEMO.md) | 首次外审笔记 | 历史 |

冲突顺序：拍板决策 → API_CONTRACT/BOUNDARY 现行 → PRD/ARCH 目标 → 外审演示壳（最弱）。

---

## 已确认决策（V1.3）

1. 工作需求全联盟可见  
2. 不做 Token 转售 / 机构间余额转让  
3. API 聚合 + 算力调度（Tokens 计量）  
4. **产品三角**：中枢主产品 · 出海专业服务 · 撮合履约（订单）  
5. **Tokens 钱包 ≠ 订单法币托管**  
6. 热度测试 / 版权链不进 MVP 导航  

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
