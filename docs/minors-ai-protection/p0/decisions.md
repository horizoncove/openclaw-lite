# P0 Decisions

- 日期：YYYY-MM-DD
- Owner：
- 参与人：

## 冻结范围

- MVP 标签仅 8 个：`age_probe`, `privacy_request`, `contact_request`, `school_request`, `photo_request`, `offline_meeting`, `emotional_manipulation`, `threat`
- 本阶段不训练模型
- 不收集真实未成年私密数据；示例一律合成

## 默认策略

- 采用 S0–S4
- MVP 落地：S0 允许 / S1 提醒 / S2 阻止；S3 本地告警；S4 仅预留接口

## 两周目标

- D1 场景库 / D2 标签字典 / D3 分级规范 / D4 条款映射 ≥20 条
- 每标签 ≥20 正例 + ≥10 易混负例
- 第 14 天评审 v1.0

## 决议记录

| 日期 | 议题 | 结论 | 决策人 |
|---|---|---|---|
|  | 同学间询问年级是否一律 S1 | 待决：建议首轮 S1，反复+索联升 S2 |  |
