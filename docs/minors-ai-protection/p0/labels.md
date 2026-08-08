# 标签字典 v1（执行稿）

MVP 仅冻结以下 8 个标签。详细正负例见 `examples/`。

| label | 中文名 | 定义 | 默认等级 | 原因码 |
|---|---|---|---|---|
| age_probe | 年龄试探 | 试探或确认对方年龄/年级/是否未成年 | S1 | R_AGE_PROBE |
| privacy_request | 隐私索取 | 索要住址、作息、家庭情况等隐私（非站外联系方式为主） | S2 | R_PRIVACY_REQUEST |
| contact_request | 联系方式索取 | 索要微信/QQ/电话等站外联系方式 | S2 | R_CONTACT_REQUEST |
| school_request | 学校信息索取 | 索要学校、班级、上下学路线等 | S2 | R_SCHOOL_REQUEST |
| photo_request | 照片诱导 | 索要自拍、个人近照或交换个人照片 | S2 | R_PHOTO_REQUEST |
| offline_meeting | 线下见面诱导 | 约线下见面、接送、上门等 | S2 | R_OFFLINE_MEETING |
| emotional_manipulation | 情感操控 | 以愧疚、孤立、冷暴力或依赖绑定施压，削弱拒绝能力 | S1 | R_EMOTIONAL_MANIPULATION |
| threat | 胁迫威胁 | 恐吓、勒索、伤害威胁 | S3 | R_THREAT |

## 标注总原则

1. 只依据可见文本（MVP 不做说话人身份识别）
2. 可多标签；最终等级取最高
3. 拿不准时标 `needs_review`，不硬标高危
4. 示例必须合成，禁止粘贴真实未成年私密对话
5. 不标注、不收集任何违法性内容；`photo_request` 仅覆盖“索要个人照片”行为风险，不做色情内容建模

## 共现提示（给标注员）

| 组合 | 建议 |
|---|---|
| age_probe + contact_request | 双标；等级至少 S2 |
| school_request + offline_meeting | 双标；可升 S3（若含具体接送/地点） |
| photo_request + privacy_request | 双标；S2 |
| emotional_manipulation + threat | 双标；S3 |
| threat + 任意 | 最终 S3 |

## 变更规则

P1 数据建库期间标签冻结；若需变更，写入 `decisions.md` 并升版本（v1.1）。

## 完成度

| 标签 | 正例文件 | 正例数目标 | 负例数目标 | 状态 |
|---|---|---:|---:|---|
| age_probe | examples/age_probe.md | 20 | 10 | 已完成草稿 |
| privacy_request | examples/privacy_request.md | 20 | 10 | 已完成草稿 |
| contact_request | examples/contact_request.md | 20 | 10 | 已完成草稿 |
| school_request | examples/school_request.md | 20 | 10 | 已完成草稿 |
| photo_request | examples/photo_request.md | 20 | 10 | 已完成草稿 |
| offline_meeting | examples/offline_meeting.md | 20 | 10 | 已完成草稿 |
| emotional_manipulation | examples/emotional_manipulation.md | 20 | 10 | 已完成草稿 |
| threat | examples/threat.md | 20 | 10 | 已完成草稿 |
