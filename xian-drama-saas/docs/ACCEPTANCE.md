# Phase 1 验收清单与审核记录

> 版本：**V1.3**  
> 日期：2026-07-24  
> 依据：PRD / ARCHITECTURE **V1.3**、`SCHEME_V13.md`、`P1_BOUNDARY.md`、`API_CONTRACT.md`  
> 图例：✅ 通过 · ❌ 未过 · ⚠ 有条件通过 · ⏸ 已批准延期  

---

## 总判定（仓库工程 · 2026-07-24）

| 维度 | 结论 |
|------|------|
| 产品主轴 | 正确（无转售；中枢+网关） |
| 严格验收 | **未通过** — 见下方 ❌ |
| 外部 hub v3.3 演示壳 | 叙事有条件通过（见 FEEDBACK_HUB_V33）；**不计入**本表工程放行 |
| 合入建议 | draft 可保留；清 P0 后再标「验收通过」 |

---

## A. 环境

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| A1 | `GET /api/v1/health` | ✅ | |
| A2 | 多账号登录 | ✅ | 五账号；V1.3 要求双机构闭环可演示 |

---

## B. 需求 + 订单（PRD §8.1–8.2）

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| B1 | A 发布 B 可见 | ✅ | |
| B2 | 应征 + 确认 | ✅ | |
| B3 | 禁本机构应征 | ✅ | |
| B4 | visibility 锁定 alliance | ✅ | |
| B5 | **我应征的** `scope=applied` | ❌ | V1.3 P0；当前缺 |
| B6 | **确认后生成 match_orders** | ❌ | V1.3 P0；当前缺 |
| B7 | 品类枚举含翻译/配音/IP授权等 | ⚠ | seed 部分有；需统一校验 |
| B8 | 搜索筛选 | ⏸ | P1.1 |

---

## C. 工作台逾期

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| C1 | summary 含逾期 | ❌ | seed 无过去 dueAt |
| C2 | UI 标红 | ⚠ | 有逻辑缺数据 |

---

## D. Tokens 钱包 + 网关

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| D1 | 购额入账 | ✅ | 单位应统一宣传为 Tokens |
| D2 | Chat 扣费 + 流水 | ✅ | |
| D3 | 流水可查 | ✅ | |
| D4 | 402 且不调上游 | ⚠ | 有 402；先扣后调未纠 |
| D5 | 预检→上游→成功再扣 / 失败退款 | ❌ | V1.3 目标 |
| D6 | usage_records | ❌ | |
| D7 | Key hash 存储 | ❌ | 明文 |
| D8 | **文案：托管 ≠ Token 互转** | ❌ | 订单能力未上时先在钱包/需求页脚注 |

---

## E. 算力

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| E1 | 提交预扣 | ✅ | |
| E2 | running→succeeded | ✅ | |
| E3 | 成功通知/回写 | ❌ | |
| E4 | queued 取消退款 | ✅ | |
| E5 | **failed 释放预扣** | ❌ | |
| E6 | cancelled（已开始）释放 | ❌ | 按 PRD 应释放 |

---

## F. 无转售

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| F1 | 无转售 API/UI | ✅ | 回归必跑 |

---

## G. 通知

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| G1 | 未读→已读 | ✅ | |
| G2 | 跳转订单/作业（有 link） | ⏸ | P1.1 |

---

## H. 安全 / 工程

| # | 条目 | 结果 | 说明 |
|---|------|------|------|
| H1 | 不可裸冒充用户 | ❌ | x-user-id |
| H2 | `/reset` 保护 | ❌ | |
| H3 | smoke 脚本 | ❌ | |
| H4 | 一级导航无版权链/热度生产项 | ⚠ | 前端 `/app` 已较瘦；勿再加 |

---

## 实现 Agent · V1.3 必改清单（按序）

1. Seed：逾期任务 ≥1（assignee=演示用户）  
2. `GET /demands?scope=applied` + UI Tab「我应征的」  
3. confirm 时写入 `match_orders` + `GET /match-orders` + 简单列表页  
4. Chat：预检→上游→成功扣费；失败不扣或退款；单测/脚本  
5. 作业 failed / cancelled 释放预扣；succeeded 写 notice  
6. `/reset`、`/auth/users` 仅 development 或鉴权  
7. `docs/scripts/p1-smoke.sh` 覆盖 B1–B6、D、E、G  
8. 回写 `API_CONTRACT.md`  

**放行条件：** 上表 ❌ 清零或文档线签字转 ⏸。

---

## curl 冒烟（基线）

```bash
BASE=http://127.0.0.1:3001
curl -s $BASE/api/v1/health
# 登录后带 x-user-id
curl -s "$BASE/api/v1/demands?scope=plaza" -H 'x-user-id: u-ma'
curl -s "$BASE/api/v1/demands?scope=applied" -H 'x-user-id: u-ma'   # V1.3
curl -s "$BASE/api/v1/match-orders" -H 'x-user-id: u-wang'         # V1.3
```
