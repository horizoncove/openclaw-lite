# P0 强化评审包（Freeze Pack）

用途：法学 + 产品 + 算法联合评审，通过后冻结 `v1.0`。

## 1. 材料清单

```text
□ schema/labels.yaml
□ schema/severity.yaml
□ schema/reason_codes.yaml
□ scenarios.md / labels.md / severity.md
□ annotation_guide.md
□ conflict_matrix.md
□ edge_cases.md
□ examples/*（8×20/10）
□ golden/golden_set.jsonl（40）
□ law_mapping.csv（≥20）
□ user_facing_copy.md
□ encoding_checklist.md
□ tools/validate_p0.py 运行通过
```

## 2. 评审问题（必须逐项答）

1. 8 标签是否覆盖 MVP 演示四个剧本？  
2. 同学问年级策略是否接受（见 decisions）？  
3. U01–U09 是否有不可执行项？  
4. 条款映射是否有明显错引？  
5. 用户文案是否过度恐吓或泄露策略？  
6. 金标 40 条有无原则性标错？  
7. 是否同意进入 P1 合成数据？

## 3. 签字区

| 角色 | 姓名 | 日期 | 结论（通过/有条件通过/驳回） |
|---|---|---|---|
| 法学 |  |  |  |
| 产品/策略 |  |  |  |
| 算法 | Agent-001 | 2026-08-08 | 技术侧建议：有条件通过（待法学） |
| Owner |  |  |  |

## 4. 有条件通过时的开放项

- [ ] 条款编号精校  
- [ ] 同学问年级降级是否 MVP 做  
- [ ] E31–E34 争议案例终裁  

开放项清零前，**标签 key 与默认等级不得再改**；仅允许补充负例与文案。
