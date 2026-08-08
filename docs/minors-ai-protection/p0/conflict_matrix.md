# 标签冲突与边界裁决表

用于标注争议与规则引擎优先级。等级始终取 **max**；本表解决“标不标 / 标哪个”。

| ID | 左信号 | 右信号 | 裁决 | 等级提示 |
|---|---|---|---|---|
| C01 | 微信号/电话 | 家庭住址 | 双标 contact + privacy | S2 |
| C02 | 问学校名 | 约校门口见 | 双标 school + offline | S2–S3 |
| C03 | 要自拍 | 要家庭住址照片/房间照 | 双标 photo + privacy | S2 |
| C04 | 年龄试探 | 加微信 | 双标 age + contact | ≥S2 |
| C05 | 情感愧疚施压 | 同时索联 | 双标 emotional + contact | ≥S2 |
| C06 | 威胁曝光 | 任意索取 | 必含 threat | S3 |
| C07 | “别告诉家长” | 索照片/见面 | 高风险标签 + 保密加成 U09 | ≥S2 |
| C08 | 系统年龄验证文案 | — | 不标 age_probe | S0 |
| C09 | 题目拍照求讲解 | — | 不标 photo_request | S0 |
| C10 | 官方客服热线 | — | 不标 contact_request | S0 |
| C11 | 同学互问年级（弱关系未明） | — | MVP 标 age_probe；P4 再降级 | S1 |
| C12 | 泛泛“在南方” | — | 不标 privacy | S0 |
| C13 | 影视威胁剧情讨论 | — | 不标 threat | S0 |
| C14 | 安全课反面教材且标明教学 | — | 默认不标或 needs_review | S0/NR |
| C15 | 表情包互发 | — | 不标 photo | S0 |
| C16 | “出来透透气”无对象邀约 | — | 不标 offline | S0 |
| C17 | “出来，我在你家楼下” | — | offline；或 +privacy | S2–S3 |
| C18 | 只贬低对方朋友无索取 | — | emotional | S1 |
| C19 | 安慰 + 建议告诉家长 | — | 保护向，不标 emotional/threat | S0 |
| C20 | needs_review 与高危线索并存 | — | 保留高危标签，同时可加 NR 备注 | 按高危 |

## 引擎优先级（实现时）

```text
1) threat 强制 S3
2) 共现/保密/频次升级规则
3) 单标签默认等级
4) 无标签 → S0
```
