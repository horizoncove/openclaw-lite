# Phase 1 验收清单与审核记录

> 版本：impl-1  
> 日期：2026-07-24  
> 依据：PRD §8、ARCHITECTURE §9、`P1_BOUNDARY.md`、`API_CONTRACT.md`

图例：✅ 通过 · ❌ 未过 · ⚠ 有条件通过 · ⏸ 已批准延期

---

## A. 环境

| # | 条目 | 结果 | 证据 / 说明 |
|---|------|------|-------------|
| A1 | `GET /api/v1/health` 返回 p1 ok | ✅ | 本地冒烟 200 |
| A2 | `/app/login` 五账号可登录 | ✅ | seed users |

---

## B. 需求全联盟（PRD §8.1）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| B1 | A 发布后 B 广场可见 | ✅ | plaza scope |
| B2 | B 应征、A 确认成交 | ✅ | apply/confirm |
| B3 | 本机构不可应征 | ✅ | API 校验 |
| B4 | 草稿不在广场；visibility 锁定 alliance | ✅ | |
| B5 | 搜索 / 我应征的 / 成交建任务 | ⏸ | BOUNDARY 延期；非 §8 原文硬项但属 §3.2 |

---

## C. 工作台逾期（PRD §8.2）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| C1 | summary 含逾期任务 | ❌ | seed 任务 `dueAt` 均为未来，开箱无逾期 |
| C2 | UI 展示逾期标红 | ⚠ | 逻辑有；缺数据 |

**实现 Agent 必补：** seed 至少 1 条 `dueAt < today` 且 assignee=演示账号。

---

## D. 钱包 + 网关（PRD §8.3 / §8.5）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| D1 | purchase 入账 + ledger 充值 | ✅ | |
| D2 | Bearer 调 chat，余额下降 + 消耗流水 | ✅ | |
| D3 | 流水可查 | ✅ | 合并在 GET `/wallet` |
| D4 | 余额不足 402，且不执行上游 | ⚠ | 有 402；**未证明**上游短路；且成功路径先扣后调 |
| D5 | usage_records 审计 | ❌ | 缺失 |
| D6 | Key 仅哈希存储 | ❌ | 明文 |

---

## E. 算力作业（PRD §8.4）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| E1 | 提交 → queued + 预扣 | ✅ | |
| E2 | ops 推进 running → succeeded | ✅ | transition |
| E3 | 项目收到完成事件/通知 | ❌ | 无回写 |
| E4 | queued 取消退款 | ✅ | |
| E5 | failed 释放预扣 | ❌ | 不退；需修或书面降级+调账 |

---

## F. 无转售（PRD §8.6）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| F1 | 无转售 API/UI/表 | ✅ | 回归必跑 |

---

## G. 通知已读（PRD §8.7）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| G1 | 秘书处发布，会员未读→已读 | ✅ | receipts |

---

## H. 安全 / 工程底线

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| H1 | 不可用裸 `x-user-id` 冒充（或文档标明仅 localhost） | ❌ | 公网风险 |
| H2 | `/reset` 受保护 | ❌ | 无鉴权 |
| H3 | PRD §8 自动化测试 | ❌ | 无 |

---

## 总判定

| 维度 | 结论 |
|------|------|
| 产品演示 | **可对外演示主路径** |
| 文档严格验收 | **未通过**（C1、D4/D5/D6、E3/E5、H*） |
| 合入建议 | 保留 draft PR；实现 Agent 按下方「下一轮必改」清 P0 后再申请「验收通过」标签 |

---

## 下一轮实现 Agent 必改（P0）

1. **Seed：** 逾期任务 ≥1，保证 C1 开箱绿  
2. **计费：** Chat 改为「预检 → 上游 → 成功再扣」或「失败自动退款」；补测试  
3. **作业：** `failed` / 已开始 `cancelled` 退预扣，或提供超管调账 API + 审计  
4. **完成回写：** succeeded 时写 notice 或 project 事件（最小一条即可）  
5. **公网安全：** `/reset` 与用户枚举加保护或仅 `NODE_ENV=development`  
6. **验收脚本：** `docs/scripts/p1-smoke.sh`（或等价）覆盖 B/D/E/G  

P1 审核通过条件：上表 ❌ 清零或转 ⏸（需文档线签字）。

---

## curl 冒烟（审核用）

```bash
BASE=http://127.0.0.1:3001
curl -s $BASE/api/v1/health
curl -s -X POST $BASE/api/v1/auth/login -H 'Content-Type: application/json' -d '{"userId":"u-wang"}'
curl -s "$BASE/api/v1/demands?scope=plaza" -H 'x-user-id: u-ma'
curl -s $BASE/api/v1/wallet -H 'x-user-id: u-wang'
# KEY 取自 wallet.apiKey
curl -s -X POST $BASE/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"ping"}]}'
```

完整严格验收以本清单表格为准，不以「页面能点开」为准。  
