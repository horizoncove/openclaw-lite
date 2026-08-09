# 08 · P3 验收清单

版本：`minorguard-devdocs-v0.1`

## 0. 验收前置

- [ ] 本目录文档 Owner 已确认
- [ ] `COMPLIANCE_BOUNDARY.md` 无未关闭否决项
- [ ] 仓库无云 API Key / 真实 PII 样本

## 1. 部署与健康

| # | 项 | 通过标准 |
|---|---|---|
| A1 | 一键/脚本启动 | 干净环境可启动 API（+可选 DB） |
| A2 | Health | `GET /api/v1/health` 返回 version、policyVersion、ruleSetVersion、authRequired |
| A3 | 无 Key 降级 | 不配置云 Key 时 `provider=local` 且 analyze 可用 |

## 2. 契约与分析

| # | 项 | 通过标准 |
|---|---|---|
| B1 | RiskResult 字段 | 必填机器码齐全（见 API_CONTRACT） |
| B2 | local-analyze | `conversation` 字段生效；危险样本可到 high |
| B3 | analyze 合并 | 云失败仍返回本地+策略结果 |
| B4 | chat 快路径 | 用户高风险不生成危险细节回复 |
| B5 | policyTrace | 策略变更可观测 |

## 3. 鉴权与审计

| # | 项 | 通过标准 |
|---|---|---|
| C1 | strict/admin | 设置 Token 后无凭据访问 events → 401 |
| C2 | 错误 Token | → 401/403 |
| C3 | 审计 | 导出/清空产生 audit 记录 |
| C4 | 演示 seed | 生产配置下应拒绝或显式非生产开关 |

## 4. 数据与脱敏

| # | 项 | 通过标准 |
|---|---|---|
| D1 | 落库 | 事件无完整未脱敏手机号/身份证 |
| D2 | 导出 | md/json 抽检无 L0/L1 明文 |
| D3 | save:false | 红队/测试不污染台账 |

## 5. 质量门禁

| # | 项 | 通过标准 |
|---|---|---|
| E1 | 红队全量或约定子集 | 高风险漏报率 = 0 |
| E2 | 正常学习样例 | 不得 `block_review` |
| E3 | p3-check 脚本 | 自动化检查退出码 0 |

## 6. 双轨衔接（若启用 ONNX）

| # | 项 | 通过标准 |
|---|---|---|
| F1 | Adapter 开关 | 可关可开 |
| F2 | 映射 | contact/offline/threat 能影响最终等级 |
| F3 | 版本字段 | 结果含 ondevice model_ver |

## 7. 文档同步

| # | 项 | 通过标准 |
|---|---|---|
| G1 | README/启动说明 | 与实现一致 |
| G2 | 已知问题 | 更新限制列表 |
| G3 | 变更记录 | 记录 policy/ruleSet 版本 |

## 8. 签字

| 角色 | 姓名 | 日期 | 结论 |
|---|---|---|---|
| 工程 Owner | | | |
| 合规审阅（人类） | | | |
| 产品确认 | | | |
