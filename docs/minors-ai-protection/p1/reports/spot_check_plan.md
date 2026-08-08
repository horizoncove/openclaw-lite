# 抽检计划（当前针对 v0.3 / 3 万规模）

## 目标

人工/法学抽检通过率 ≥ 95%（标签正确性；等级允许 ±0 档，多标签漏标高危算错）。

## 抽样

| 桶 | 抽样数 | 说明 |
|---|---|---|
| 每标签 train 正例 | 各 20 | 共 160 |
| hard_negative / normal | 40 | 防误标 |
| test（非 golden） | 40 | 评测集纯度 |
| combo | 24 | 共现等级 |
| adv | 24 | 对抗是否仍可标注 |
| **合计** | **≈288** | 3 万规模加严 |

## 流程

1. `python3 tools/validate_p1.py --version v0.3 --min-train 30000 --min-eval 2000 --min-test-per-label 100 --min-refusal 500` 必须 PASS  
2. 从 `reports/v0.3_spot_check_ids.txt` 或按标签分层随机抽  
3. 标注员独立标 → 与数据集对比  
4. 错误写入 `reports/v0.3_spot_check_findings.md`  
5. 通过率 ≥95% 且无红线违规 → 可冻结 p1-v1.0

## 记录位

| 角色 | 日期 | 抽检条数 | 正确率 | 结论 |
|---|---|---|---|---|
| 待指派 | — | — | — | 待做 |
