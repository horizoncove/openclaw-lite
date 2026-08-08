# MinorGuard 产品开发文档（合规交付轨）

本目录是 **MinorGuard 产品工程轨** 的正式开发文档，承接演示包（P0–P2 foundation）之后的下一阶段开发。

与研究轨关系：

| 轨道 | 路径 | 当前状态 | 职责 |
|---|---|---|---|
| 研究轨 | [`../minors-ai-protection/`](../minors-ai-protection/) | P0/P1 冻结，P2 小模型可用 | 标签体系、合成数据、端侧分类器 |
| **产品轨（本目录）** | `docs/minorguard/` | **进入 P3 文档冻结** | 可部署服务、策略引擎、合规边界、验收 |

> 研究轨证明「端侧能识别」；产品轨证明「授权场景下可部署、可审计、可合规交付」。

---

## 文档索引

| 编号 | 文档 | 说明 |
|---|---|---|
| 00 | [STATUS.md](./STATUS.md) | 现状基线与阶段门禁 |
| 01 | [PRD_P3.md](./PRD_P3.md) | P3 产品需求（角色/场景/范围） |
| 02 | [TRD_P3.md](./TRD_P3.md) | P3 技术需求与非功能指标 |
| 03 | [ARCHITECTURE_P3.md](./ARCHITECTURE_P3.md) | MVP 架构与模块边界 |
| 04 | [API_CONTRACT.md](./API_CONTRACT.md) | 稳定接口与机器码契约 |
| 05 | [COMPLIANCE_BOUNDARY.md](./COMPLIANCE_BOUNDARY.md) | **合规红线与授权边界** |
| 06 | [DATA_GOVERNANCE.md](./DATA_GOVERNANCE.md) | 数据采集、脱敏、留存、导出 |
| 07 | [DUAL_TRACK_MAPPING.md](./DUAL_TRACK_MAPPING.md) | 产品四类风险 ↔ 研究 8 标签 / S0–S4 |
| 08 | [ACCEPTANCE_P3.md](./ACCEPTANCE_P3.md) | P3 验收清单 |
| 09 | [BACKLOG_P3.md](./BACKLOG_P3.md) | 开发拆解与优先级 |
| 10 | [SECURITY_BASELINE.md](./SECURITY_BASELINE.md) | 安全基线（密钥/鉴权/威胁模型） |

---

## 下一阶段一句话

> **把已可演示的 MinorGuard（规则 + LLM + 策略）升级为可部署 MVP：模块化服务、持久化台账、鉴权审计、稳定契约，并与研究轨端侧模型对齐。**

---

## 使用方式

1. 产品/合规先审 `COMPLIANCE_BOUNDARY.md` 与 `DATA_GOVERNANCE.md`
2. 研发按 `ARCHITECTURE_P3.md` + `BACKLOG_P3.md` 开工
3. 联调以 `API_CONTRACT.md` 为准
4. 阶段结束跑 `ACCEPTANCE_P3.md`

Owner（建议）：产品工程 Agent / 人类产品负责人  
版本：`minorguard-devdocs-v0.1`  
日期：2026-08-08
