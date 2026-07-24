# HTTP API 契约（现行实现）

> 版本：impl-1  
> 日期：2026-07-24  
> **权威来源：** `server/p1/routes.mjs`、`server/p1/store.mjs`  
> 前缀：业务 API → `/api/v1`；兼容网关 → `/v1`  
> 目标设计见 `ARCHITECTURE.md`；差异见 `P1_BOUNDARY.md`。

---

## 0. 通用约定

### 鉴权（现行）

| 接口类型 | 方式 | 说明 |
|----------|------|------|
| 多数 `/api/v1/*` | 请求头 `x-user-id: <userId>` | **可伪造**；login 返回的 `token` 目前不校验 |
| `/v1/*` 网关 | `Authorization: Bearer <org_api_key>` | 匹配 `wallets.apiKey` 明文 |
| `/api/v1/health`、`/auth/login`、`/auth/users`、`/reset` | 无用户校验 | `/reset` 危险 |

### 错误形

```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "余额不足" } }
```

部分路径仅 `{ "error": { "message": "..." } }`。审核实现时要求新接口统一带 `code`。

### 角色（粗粒度）

`org_admin` | `member` | `secretariat` | `ops`

- 项目列表：秘书处/运维看全量，其余按 `orgId`  
- 作业推进：运维/秘书处可任意 transition；会员仅取消本机构 `queued`  
- 发通知：秘书处/ops  

---

## 1. Auth / 系统

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/health` | 无 | `{ ok, module: "p1", version }` |
| POST | `/api/v1/auth/login` | 无 | body `{ userId }` 或 `{ email }` → `{ user, token }` |
| GET | `/api/v1/auth/users` | 无 | 演示账号列表（勿用于生产） |
| POST | `/api/v1/reset` | 无 | 重置为 seed（危险） |
| GET | `/api/v1/me` | user | 当前用户 |

---

## 2. Workspace / Projects / Tasks

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/workspace/summary` | 项目数、待办、逾期/阻塞任务、未读通知、开放需求、待确认应征、活跃作业、钱包 |
| GET/POST | `/api/v1/projects` | 列表 / 创建 |
| PATCH | `/api/v1/projects/:id` | 更新 |
| GET/POST | `/api/v1/tasks` | 列表（可 query）/ 创建 |
| PATCH | `/api/v1/tasks/:id` | 更新状态等 |

**未实现：** 成员、里程碑、附件、项目级用量聚合。

---

## 3. Demands（全联盟）

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/demands?scope=plaza\|mine` | plaza：`published\|matching\|deal`；mine：本机构 |
| POST | `/api/v1/demands` | body 可含 `publish: true` → 直接 published；`visibility` 固定 alliance |
| PATCH | `/api/v1/demands/:id` | 拒绝非 alliance 的 visibility |
| GET | `/api/v1/demands/:id/applications` | 应征列表 |
| POST | `/api/v1/demands/:id/apply` | `{ message }`；禁本机构 |
| POST | `/api/v1/demands/:id/confirm` | `{ applicationId }` → deal，其余 pending → rejected |

状态：`draft → published → matching → deal | closed`（UI 未完整覆盖 closed）。

**未实现：** 搜索、沟通纪要、秘书标注、成交自动建任务、联系方式脱敏。

---

## 4. Opportunities / Notices

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/opportunities` | 列表 |
| POST | `/api/v1/opportunities/:id/interest` | `{ note }` |
| GET | `/api/v1/notices` | 含 `read` 布尔 |
| POST | `/api/v1/notices` | 秘书处/ops |
| POST | `/api/v1/notices/:id/read` | 写 receipts |

---

## 5. Wallet

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/wallet` | `{ wallet, ledger, packages, models }`（ledger 已合并，无独立 `/wallet/ledger`） |
| POST | `/api/v1/wallet/purchase` | `{ packageId }` → 直接入账（无支付回调实体） |
| POST | `/api/v1/wallet/rotate-key` | 返回新明文 `apiKey` |

账本 `type`：`充值 | 消耗 | 退款 | 调账`。

**禁止：** 任何机构间转让 / 挂单 API（不得新增）。

---

## 6. Compute

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/compute/jobs` | 本机构；ops/secretariat 全量 |
| POST | `/api/v1/compute/jobs` | 预扣 `cost`（默认 5000）→ `queued` |
| POST | `/api/v1/compute/jobs/:id/transition` | `{ status, error? }` |

合法流转：

```
queued → running | cancelled
running → succeeded | failed | cancelled
failed → queued
```

退款现行规则：仅 `cancelled && !startedAt`。

**未实现：** `/internal/compute/*`、pools、nodes、job_events、优先级调度。

---

## 7. XD-Router（`/v1`）

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/v1/models` | Bearer 可选（无 Key 也可列） | OpenAI list 形 |
| POST | `/v1/chat/completions` | Bearer 必填 | OpenAI chat 形；扣费见 BOUNDARY §4 |

余额不足：`402` + `INSUFFICIENT_BALANCE`。

上游：环境变量 `DEEPSEEK_API_KEY` / `OPENAI_API_KEY`；否则演示文案。

**未实现：** `/v1/images`、usage_records、RPM/TPM、`project_id` 强制绑定。

---

## 8. 前端路由对照

| 路径 | 页面 |
|------|------|
| `/app/login` | 演示登录 |
| `/app/workspace` | 工作台 |
| `/app/projects` | 项目 |
| `/app/demands` | 需求广场 |
| `/app/opportunities` | 撮合 |
| `/app/wallet` | API / 钱包 |
| `/app/compute` | 算力作业 |
| `/app/notices` | 通知 |

PRD「机构设置」「我应征的」：**未实现**。

---

## 9. 契约变更流程

1. 改 `server/p1/routes.mjs` 必须同步本文件  
2. 若降低安全或计费保证，同步改 `P1_BOUNDARY.md` 并通知审核线  
3. ARCH §7 为远期目录；**联调以本文件为准**  
