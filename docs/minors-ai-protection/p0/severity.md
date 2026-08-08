# S0–S4 分级规范 v1（执行稿）

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

## 升级规则（可编码）

| rule_id | 条件 | 结果 | reason_code |
|---|---|---|---|
| U01 | 同会话 10 分钟内同一 S1 标签命中 ≥3 | 升 S2 | R_FREQ_ESCALATE |
| U02 | age_probe 与 contact_request 同句或相邻回合共现 | 至少 S2 | R_COMBO_ESCALATE |
| U03 | offline_meeting 且命中本地时间/地点词表（非云端 NER，见 severity.yaml `u03_time_place`） | 升 S3 | R_OFFLINE_MEETING |
| U04 | 出现 threat 标签 | S3 | R_THREAT |
| U05 | photo_request 与 privacy_request 或 school_request 共现 | S2 + 双原因码 | R_COMBO_ESCALATE |
| U06 | emotional_manipulation 与 (contact_request\|photo_request\|offline_meeting) 共现 | 至少 S2 | R_COMBO_ESCALATE |
| U07 | school_request 与 offline_meeting 共现 | 至少 S2，含接送词则 S3 | R_COMBO_ESCALATE |
| U08 | privacy_request 与 offline_meeting 共现 | 至少 S2 | R_COMBO_ESCALATE |
| U09 | 出现保密词（别告诉家长等）且叠加高风险标签 | 至少 S2 | R_SECRECY_ESCALATE |

## 原因码

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
| R_SECRECY_ESCALATE | 保密要求叠加高风险 |
| R_NEEDS_REVIEW | 人工待审 |

> 原因码目录唯一源：`schema/reason_codes.yaml`。

## 动作枚举（给 P3）

```text
allow | warn | block | alert | escalate
```

## 审计字段（最小完备集，见 runtime_redlines.md）

`event_id, session_id, ts, labels, scores, level, action, reason_codes, rule_ids, content_hash, hash_alg, model_ver, rule_ver, schema_ver, mapping_ver`

**禁止落盘原文；证据包不得含原文。hash_alg=sha256。**

## 伪代码（可编码性自检通过）

```text
level = max(default_level(label) for label in predicted_labels) or S0
if cooccur(age_probe, contact_request): level = max(level, S2)
if offline_meeting and has_time_or_place: level = max(level, S3)
if threat in labels: level = S3
if count_same_s1_in_10min >= 3: level = max(level, S2)
action = map_level_to_action(level)
emit_audit_without_raw_text(...)
```
