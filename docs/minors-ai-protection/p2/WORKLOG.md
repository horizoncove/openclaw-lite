# P2 工作日志

## 2026-08-08 — 小参数 Transformer

### 已完成
- 选型：`uer/chinese_roberta_L-2_H-128`（~3.18M / ≈12.15MB fp32）
- 脚本：`train_tiny.py` / `eval_tiny.py` / `export_onnx.py`
- 训练：2 epoch，CPU ~55s，dev macro F1 **0.9992**，阈值 **0.4**
- test 门禁：macro F1 **0.9983**、高风险召回 ≥0.997、normal FP **0.008** → 全 PASS
- adv macro F1 **0.9563**（高于 TF-IDF 基线 0.9209）
- ONNX：**12.147 MB**；CPU ORT P50/P95 **0.682 / 0.706 ms**（非真机）
- 报告：`reports/tiny_eval.md`、`reports/tiny_onnx.md`

### 注意
- 高分仍受合成模板同质化影响；不可外推真实线上泛化
- 时延为云主机 CPU ORT 代理，真机中端机 P95 仍待测（P2-O2）

### 下一步
1. 真机/端侧时延实测（可选量化）
2. 与 P3 规则引擎字段契约联调
3. 人工难例 / 更多 adv 压测

---

## 2026-08-08 — 开工日（TF-IDF 基线）

### 已完成
- 确认上游 `p1-v1.0` 冻结（抽检 288/288 PASS）
- 建立 `p2/` 工作区与 `P2启动指南.md`
- 落地数据加载器 + TF-IDF OneVsRest 基线训练/评测
- test 门禁：macro F1 **0.9985**、高风险召回 ≥0.99、normal FP **0.0005**
- adv macro F1 **0.9209**
- 报告：`reports/baseline_eval.md`
