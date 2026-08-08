# 02 · TRD：P3 技术需求

版本：`minorguard-devdocs-v0.1`

## 1. 技术目标

在不破坏 P2 对外机器码契约的前提下，完成可部署、可测试、可审计的服务化拆分。

## 2. 功能技术需求

### 2.1 分析服务

输入：UTF-8 文本或消息数组（截断上限：单条 12k 字符，消息窗口 ≤12）。  
输出：`RiskResult`（见 `API_CONTRACT.md`）。

流水线顺序（固定）：

```text
1. normalize & length guard
2. local_rules.analyze
3. optional cloud_llm.analyze (失败可降级)
4. optional ondevice_model.analyze (研究轨 ONNX；失败可跳过)
5. merge (取保守 max，防漏报)
6. policy_engine.apply (强制高风险 / 降误报)
7. finalize (levelCode/actionCode/policyTrace/confidence)
```

### 2.2 聊天服务

```text
analyze(user) →
  if high: safe_template_reply (fast path)
  else: safe_reply_model → analyze(user+reply)
→ optional persist (save!=false)
```

### 2.3 事件与审计

- 默认仅存脱敏 snippet + 结构化结果
- `save:false` 不得写事件表
- 管理动作写审计表：actor/role、action、path、authMode、detail(脱敏)

### 2.4 鉴权

| 模式 | 条件 | 行为 |
|---|---|---|
| `demo_open` | 未设置 Admin Token | 仅允许本地/演示；健康检查声明 `authRequired=false` |
| `admin_token` | 设置 `MINORGUARD_ADMIN_TOKEN` | 台账读写导出必须 Bearer/`x-admin-token` |
| `strict`（P3 目标） | `AUTH_MODE=strict` | 分析接口也可要求服务 Token；禁止 demo_open 上公网 |

## 3. 非功能需求

| 类别 | 要求 |
|---|---|
| 正确性门禁 | 红队高风险漏报率 = 0（沿用 P1 集）；正常学习样例不得 `block_review` |
| 可用性 | 云模型失败自动降级本地规则，接口仍 200 返回（带 `provider=local` note） |
| 性能（CPU 代理） | 本地规则路径 P95 ≤ 50ms；含云模型不做硬性 P95，但需超时（建议 45s）与可取消 |
| 体积 | 服务镜像不含模型权重亦可运行；ONNX 为可选挂载 |
| 可观测 | `policyVersion`/`ruleSetVersion`/provider/model 每条结果必带 |
| 安全 | 密钥不进日志；导出默认脱敏；CORS 可配置白名单 |
| 兼容 | Node ≥ 20；保留 `/api/*` 兼容层或文档化迁移到 `/api/v1/*` |

## 4. 数据与存储

| 存储 | P3 要求 |
|---|---|
| SQLite | 默认开发/单机 |
| PostgreSQL | 可选，`DATABASE_URL` 切换 |
| 禁止 | 把含 Key 的 env、原始未脱敏对话提交 Git |

Schema 最小表：`events`、`audit_logs`、`schema_migrations`。

## 5. 测试要求

| 类型 | 要求 |
|---|---|
| 单元 | 规则命中、策略升降级、脱敏函数 |
| 契约 | `RiskResult` 字段与枚举校验（JSON Schema） |
| 红队 | `npm run redteam` / smoke；报告落盘 |
| 安全扫描 | 仓库无 `sk-` 密钥；`security-scan` 脚本继续 |

## 6. 明确技术债（允许登记，不阻塞编码启动）

- 前端三视图仍可为静态页，不强制 SPA 框架
- 完整 RBAC UI 延后
- 多模态/多轮状态机延后（研究轨 P4+）
