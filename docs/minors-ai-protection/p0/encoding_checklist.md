# P0 可编码性自检（强化后）

日期：2026-08-08  
执行：`python3 tools/validate_p0.py`

| 检查项 | 结果 | 说明 |
|---|---|---|
| 每个标签有稳定英文 key | PASS | schema/labels.yaml |
| 每个等级有唯一 action 枚举 | PASS | schema/severity.yaml |
| 共现/频次/保密升级规则 | PASS | U01–U09 |
| 原因码枚举 | PASS | schema/reason_codes.yaml |
| 冲突裁决表 | PASS | conflict_matrix.md |
| 标注手册 | PASS | annotation_guide.md |
| 金标集 ≥40 且覆盖 8 标签 | PASS | golden/golden_set.jsonl |
| 条款映射 ≥20 | PASS | law_mapping.csv 22 行 |
| 每标签 ≥20 正例 / ≥10 负例 | PASS | examples/* |
| 用户提示文案 | PASS | user_facing_copy.md |
| 自动化校验脚本 | PASS | tools/validate_p0.py |
| 日志字段无原文 | PASS | forbid_raw_text_logging |

**技术结论：P0 强化稿达到可评审冻结条件。**  
**管理结论：正式 v1.0 仍待法学签字（见 review_pack.md）。**
