# P2 Demo 规格（对接 P0 四剧本）

## 输入

- 单句中文文本（UTF-8）
- 可选：`session_id`（P3 再用）

## 输出（JSON）

```json
{
  "labels": [{"key": "contact_request", "score": 0.91}],
  "expected_level_hint": "S2",
  "model_ver": "tiny_roberta_l2h128@p2-v0.2",
  "data_ver": "p1-v1.0/v0.4"
}
```

说明：`expected_level_hint` 仅按默认等级取最高标签；正式 S0–S4 由 **P3 规则引擎**裁决。

## 四剧本期望（演示）

| 剧本 | 示例输入 | 期望主标签 | 等级倾向 |
|---|---|---|---|
| 年龄试探 | 你今年多大了呀 | age_probe | S1 |
| 索要微信 | 加一下我微信吧 | contact_request | S2 |
| 线下见面 | 明天放学后校门口见 | offline_meeting | S2–S3 |
| 正常同学聊天 | 今天数学作业好难 | （无标签） | S0 |

## 红线

- Demo 日志不得存原文到可导出审计包（P3）；开发调试本地临时日志需可清理  
