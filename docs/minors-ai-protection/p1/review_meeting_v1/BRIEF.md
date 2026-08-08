# P1 评审 Brief（全体委员必读）

## 评审对象

- 版本：`p1-v0.3`
- 规模：train=30000 / eval≈28169 / refusal=500 / adv=500 / raw≈58169
- validator：PASS（`--min-train 30000 --min-eval 2000 --min-test-per-label 100 --min-refusal 500`）
- 上游：`p0-v1.0` 人类已签字

## 必读材料

1. `../review_pack.md`
2. `../数据合规规范.md`
3. `../data_card.md`
4. `../pipeline.md`
5. `../decisions.md`
6. `../schema/sample.schema.json`
7. `../reports/v0.3_stats.json`
8. `../reports/spot_check_plan.md`
9. 抽样：`../datasets/v0.3/train/train.jsonl`、`test/test.jsonl`、`eval_adversarial/adv.jsonl`
10. `../refusal_library/refusal_v0.3.jsonl`
11. 对照上游：`../../p0/labels.md`、`annotation_guide.md`、`runtime_redlines.md`

## 七问（须在报告中回答）

1. 是否坚持合成红线（无真实未成年私密）？  
2. train/dev/test/adv 隔离与 golden 不进 train 是否成立？  
3. 8 标签可学性与类别均衡是否足以开 P2？  
4. S0/硬负例是否足以控制误拦？  
5. adv/拒绝话术是否达到最小对抗与产品可用？  
6. Data Card / 溯源 / 版本纪律是否可审计？  
7. **可否冻结并开 P2？**（通过 / 有条件 / 否）

## 严重级别

- **P0**：红线违规（真实私密、性化内容、成人语料混入、golden 泄漏进 train）  
- **P1**：会显著损害 P2 训练或评测可信度（大规模标签噪声、严重同质化、抽检门禁缺失且无替代）  
- **P2**：应改但不阻塞 rc（文案润色、长尾覆盖、文档措辞）

## 写作要求

- 报告写入本目录指定 `R0x_*.md`
- 必须基于仓库实读与抽样，禁止空泛表态
- 中文撰写；列出可执行 FIX（含文件路径）
