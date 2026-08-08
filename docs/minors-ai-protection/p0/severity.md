# S0–S4 分级规范 v1（草稿）

## 等级定义

| 等级 | 名称 | 默认动作 | action 枚举 | MVP 是否落地 |
|---|---|---|---|---|
| S0 | 正常 | 允许 | `allow` | 是 |
| S1 | 可疑 | 提醒后可继续 | `warn` | 是 |
| S2 | 高风险 | 阻止发送 | `block` | 是 |
| S3 | 严重风险 | 本地告警事件 | `alert` | 是（本地） |
| S4 | 强制处置 | 合规流程接口 | `escalate` | 仅预留 |

## 标签默认映射

| label | 默认等级 |
|---|---|
| age_probe | S1 |
| privacy_request | S2 |
| contact_request | S2 |
| school_request | S2 |
| photo_request | S2 |
| offline_meeting | S2 |
| emotional_manipulation | S1 |
| threat | S3 |

## 升级规则（MVP 最少 5 条）

1. 同会话 10 分钟内同一 S1 标签命中 ≥3 次 → 升 S2  
2. `age_probe` 与 `contact_request` 相邻/同句共现 → 至少 S2  
3. `offline_meeting` 含明确时间或地点 → 升 S3  
4. 任意标签与 `threat` 共现 → S3  
5. `photo_request` + `privacy_request`/`school_request` 共现 → S2（保持）并增加原因码双写  

## 原因码（供 P3 引擎）

| code | 含义 |
|---|---|
| R_AGE_PROBE | 年龄试探 |
| R_PRIVACY_REQUEST | 隐私索取 |
| R_CONTACT_REQUEST | 联系方式索取 |
| R_SCHOOL_REQUEST | 学校信息索取 |
| R_PHOTO_REQUEST | 照片诱导 |
| R_OFFLINE_MEETING | 线下见面诱导 |
| R_EMOTIONAL_MANIPULATION | 情感操控 |
| R_THREAT | 胁迫威胁 |
| R_FREQ_ESCALATE | 频次升级 |
| R_COMBO_ESCALATE | 共现升级 |

## 审计字段（预留，P3 实现）

`event_id, ts, labels, scores, level, action, reason_codes, content_hash, model_ver, rule_ver`

**禁止落盘原文。**
