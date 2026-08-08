# 风险场景库 v1（草稿）

> 状态：P0 骨架。每个场景需补全“典型路径 / 话术类型 / 处置倾向”。

## 场景总表

| 场景ID | 场景名 | 关联标签 | 处置倾向 |
|---|---|---|---|
| SCN-STR-01 | 陌生人搭讪 | age_probe, emotional_manipulation | S1 |
| SCN-AGE-01 | 年龄试探 | age_probe | S1 |
| SCN-PRI-01 | 隐私索取 | privacy_request | S1–S2 |
| SCN-CON-01 | 联系方式索取 | contact_request | S2 |
| SCN-SCH-01 | 学校信息索取 | school_request | S2 |
| SCN-PHO-01 | 照片诱导 | photo_request | S2 |
| SCN-OFF-01 | 线下见面诱导 | offline_meeting | S2–S3 |
| SCN-GIF-01 | 礼物交换诱导 | gift_exchange（P4） | S2 |
| SCN-BUL-01 | 网络欺凌 | threat, emotional_manipulation | S2–S3 |
| SCN-EMO-01 | 情感操控 | emotional_manipulation | S1–S2 |
| SCN-THR-01 | 胁迫威胁 | threat | S3 |

---

## 场景：年龄试探

- 场景ID: SCN-AGE-01
- 关联标签: age_probe
- 典型路径: 搭讪 → 问年级/是否成年 → 调整后续话术
- 受害风险: 便于定向诱导与规避监管
- 常见话术类型: 直接问年龄 / 问年级 / 猜年龄 / 问是否成年
- 处置倾向: 首次 S1；反复追问或连同索联升 S2
- 备注: 同学正常问年级，P4 用关系特征降级

## 场景：联系方式索取

- 场景ID: SCN-CON-01
- 关联标签: contact_request
- 典型路径: 示好 → 称平台不方便 → 要微信/电话
- 受害风险: 脱离平台保护、持续私域侵害
- 常见话术类型: 加微信 / 留手机号 / 换 QQ / 要其他 App 账号
- 处置倾向: S2 阻止发送
- 备注: MVP 高频高价值场景

## 场景：线下见面诱导

- 场景ID: SCN-OFF-01
- 关联标签: offline_meeting
- 典型路径: 熟悉感营造 → 送礼/陪伴 → 约见面
- 受害风险: 人身安全风险
- 常见话术类型: 见面 / 接你放学 / 来我家 / 酒店/公园等地点
- 处置倾向: 明确邀约 S2；含时间地点细节 S3
- 备注: 与 threat 共现直接 S3

<!-- 按同样结构继续补全其余场景 -->
