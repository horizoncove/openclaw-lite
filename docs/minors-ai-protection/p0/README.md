# P0 工作区（强化执行稿）

启动方法见 `../P0启动指南.md`。  
强化目标：不仅有文档，还有**可校验、可标注培训、可评审冻结**的资产包。

## 核心文件

| 文件 | 状态 |
|---|---|
| [decisions.md](./decisions.md) | 决议 |
| [scenarios.md](./scenarios.md) | 场景库 |
| [labels.md](./labels.md) | 标签字典 |
| [severity.md](./severity.md) | S0–S4 + U01–U09 |
| [law_mapping.csv](./law_mapping.csv) | 22 条映射 |
| [law_mapping_notes.md](./law_mapping_notes.md) | 审校说明 |
| [annotation_guide.md](./annotation_guide.md) | 标注手册 |
| [conflict_matrix.md](./conflict_matrix.md) | 冲突裁决 |
| [edge_cases.md](./edge_cases.md) | 硬边角 |
| [user_facing_copy.md](./user_facing_copy.md) | 提示文案 |
| [review_pack.md](./review_pack.md) | 冻结评审包 |
| [encoding_checklist.md](./encoding_checklist.md) | 自检 |
| [WORKLOG.md](./WORKLOG.md) | 日志 |
| [examples/](./examples/) | 8 标签示例 |
| [golden/](./golden/) | 金标 40 条 |
| [schema/](./schema/) | YAML 机器可读规范 |
| [tools/validate_p0.py](./tools/validate_p0.py) | 自动校验 |

## 一键校验

```bash
python3 docs/minors-ai-protection/p0/tools/validate_p0.py
```

Owner：Agent-001（临时）  
当前版本：**p0-v1.0-rc1**（10 人评审会有条件冻结）  
正式 v1.0：待人类法学签字  
评审纪要：`review_meeting_v1/01_minutes_v1.md`
