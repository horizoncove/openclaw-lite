# P0 强化评审包（Freeze Pack）

用途：法学 + 产品 + 算法联合评审，通过后冻结版本。  
最新会议：`review_meeting_v1/01_minutes_v1.md`

## 1. 材料清单

```text
☑ schema/labels.yaml
☑ schema/severity.yaml
☑ schema/reason_codes.yaml
☑ scenarios.md / labels.md / severity.md
☑ annotation_guide.md
☑ conflict_matrix.md
☑ edge_cases.md
☑ examples/*（8×20/10）
☑ golden/golden_set.jsonl（40）
☑ law_mapping.csv（≥20）
☑ user_facing_copy.md
☑ encoding_checklist.md
☑ tools/validate_p0.py 运行通过
☑ demo_scripts.yaml（会后新增）
☑ runtime_redlines.md（会后新增）
☑ review_meeting_v1/01_minutes_v1.md
```

## 2. 评审问题结论（2026-08-08 十人会）

1. 8 标签覆盖四剧本？ **是**（见 demo_scripts.yaml）  
2. 同学问年级？ **MVP 统一 S1；P4 再降级**  
3. U01–U09？ **骨架可；U03/U09 会后已收口**  
4. 条款映射？ **保持 draft，禁对外宣称已合规**  
5. 文案？ **总体合格；区分受众**  
6. 金标？ **G011 等已按决议修正**  
7. 进 P1？ **允许（仅合成数据）**

## 3. 签字区（Agent 评审会）

| 角色 | 姓名/Agent | 日期 | 结论 |
|---|---|---|---|
| 法学 | 法学评审Agent | 2026-08-08 | 有条件通过 |
| 产品/策略 | T&S产品Agent | 2026-08-08 | 有条件通过 |
| 算法 | NLP算法Agent | 2026-08-08 | 有条件通过 |
| 端侧工程 | 端侧工程Agent | 2026-08-08 | 有条件通过 |
| 数据标注 | 标注质检Agent | 2026-08-08 | 有条件通过 |
| 伦理隐私 | 伦理隐私Agent | 2026-08-08 | 有条件通过 |
| 红队 | 红队Agent | 2026-08-08 | 有条件通过 |
| 教育守护 | 教育守护Agent | 2026-08-08 | 有条件通过 |
| 合规审计 | 合规审计Agent | 2026-08-08 | 有条件通过 |
| 系统集成 | 系统集成Agent | 2026-08-08 | 有条件通过 |
| Owner/主持 | Agent-001 | 2026-08-08 | **有条件冻结 p0-v1.0-rc1** |

## 4. 版本状态

- 当前：**p0-v1.0-rc1**
- 标签 key / 默认等级：**已锁定**
- 正式 **p0-v1.0**：待人类法学签字 + FIX 复核
- `law_mapping.csv`：draft，禁止用于对外“已合规”宣传
