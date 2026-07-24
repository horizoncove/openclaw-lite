# P1 实现边界（审核基线）

> 版本：V1.2-impl-1  
> 日期：2026-07-24  
> 对应：PRD / ARCHITECTURE V1.2  
> 用途：区分「目标设计」与「当前仓库已交付切片」，供审核其他 Agent 成果。

---

## 1. 一句话

当前仓库交付的是 **可演示的会员中枢垂直切片**（JSON 文件库 + 粗粒度角色 + 人工推进算力），**不是** ARCH 中的 PostgreSQL + Redis + 哈希 Key + Worker 协议完整形态。

---

## 2. 存储与运行时

| 项 | 目标（ARCH） | 当前实现 | 审核判定 |
|----|--------------|----------|----------|
| 主库 | PostgreSQL | `server/data/p1-db.json`（由 `p1-seed.json` 初始化） | 演示可接受；生产前必须迁移 |
| 缓存/限流 | Redis token bucket | 无 | **未达标**（ARCH §5.2） |
| 对象存储 | 资产 URI | 无 | 延期 |
| 种子 | 单一来源 | `src/data/p1Seed.ts` + `server/data/p1-seed.json` 双份 | 要求 `npm run seed:server` 同步 |

---

## 3. 能力对照

| PRD 能力 | 当前状态 | 阻塞级缺口 |
|----------|----------|------------|
| 项目 + 任务 | 有 CRUD；无成员/里程碑/附件 | 完成率手填；无自动聚合 |
| 全联盟需求 | 广场 + 应征 + 确认 | 无搜索、「我应征的」、沟通纪要、成交自动建任务 |
| 工作台 | summary + 逾期/阻塞列表 | 种子任务默认无逾期 → **§8.2 开箱失败** |
| API 聚合 | `/v1/chat/completions` + 扣费 | **先扣费再调上游**；无 `usage_records`；Key 明文 |
| 算力调度 | jobs + transition | 无 pools/lease；**failed 不退预扣**；成功无项目回写 |
| 钱包 | purchase + ledger | 无 `token_orders` 实体；无调账 API |
| 撮合机会 | 列表 + 意向 | 无秘书撮合台 |
| 通知 | 发布 + 已读 | 无定向/跳转/强制已读 UX |
| 鉴权 | `x-user-id` 头 | **可伪造身份**；login token 未使用 |
| 转售 | 无 | **对齐**（正确砍掉） |

---

## 4. 计费语义（现行，必须写进契约）

### Chat（`/v1/chat/completions`）

1. 鉴权 Bearer org API Key  
2. 按字符粗估 token → `bill = max(100, cost * 100)`  
3. **立即** `chargeWallet` 并落盘  
4. 再 `maybeProxyUpstream`；失败仍用演示文案，**已扣费用不回滚**  

**与 ARCH §5.4 目标冲突。** 在修复前，审核不得宣称「余额不足不执行上游」已严格满足（需另加测试桩证明预检发生在上游调用前；上游失败退款仍缺失）。

### 算力作业

| 事件 | 现行行为 | 目标（PRD §6.6） |
|------|----------|------------------|
| 提交 | 预扣 `cost` | 预授权冻结 |
| `queued` → `cancelled`（未开始） | 全额退回 | 释放 |
| `running` → `failed` | **不退** | 应释放或纠偏 |
| `succeeded` | 不追加扣费（预扣即实扣） | 可接受为「预扣即实扣」 |
| 成功后 | 无项目事件/通知 | 应回写 |

---

## 5. 安全红线（公网演示）

当前若暴露公网隧道，审核必须标注风险：

- `POST /api/v1/reset` **无鉴权**，可清空库  
- `GET /api/v1/auth/users` 无鉴权枚举账号  
- `x-user-id` 可冒充任意用户  
- API Key 明文在 `wallets` 与前端展示  

**演示环境可临时接受；合入「非 demo」分支前必须清零。**

---

## 6. 实现 Agent 允许延期（需在 PR 标明）

以下可标 `deferred`，但不得静默删除验收项：

- `/admin/models` `/admin/policies` `/admin/compute/pools`  
- `/internal/compute/lease|heartbeat|complete`  
- 子 Key、图像/视频端点、自动路由、BYOK  
- 邮件/企微、service_requests 双向同步  
- UI 美化  

以下 **不可延期**（P0，修代码或改 BOUNDARY 需文档线确认）：

1. 鉴权不可伪造（至少 demo 签名 token 或关闭公网 reset）  
2. Chat 上游失败计费策略明确且可测  
3. 作业 failed 退款或文档降级为「人工调账」并提供调账入口  
4. §8 验收可重复（种子含逾期任务 + 自动化或 curl 手册全绿）  
5. 无转售入口（回归）  

---

## 7. 审核结论（2026-07-24）

**判定：演示可用 / 文档验收未过。**

- 八大能力有 UI+API 闭环，转售已正确排除。  
- 相对 PRD §8 / ARCH Phase 1：**计费失败语义、用量审计、Key 哈希、作业失败退款、完成回写、可重复逾期验收、自动化测试** 为主要阻塞。  
- 详细条目见 [ACCEPTANCE.md](./ACCEPTANCE.md)。  
