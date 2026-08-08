# P2 工作区：端侧文本单句分类器

启动方法见 `../P2启动指南.md`。  
上游冻结：`../p0/`（p0-v1.0）+ `../p1/`（**p1-v1.0**，数据锚定 `datasets/v0.4`）。

## 核心文件

| 文件 | 说明 |
|---|---|
| [decisions.md](./decisions.md) | P2 决议 |
| [WORKLOG.md](./WORKLOG.md) | 工作日志 |
| [demo_spec.md](./demo_spec.md) | Demo 输入输出规格 |
| [configs/labels.json](./configs/labels.json) | 标签顺序与默认等级 |
| [tools/](./tools/) | 数据加载 / 基线 / 小模型 / ONNX |
| [artifacts/](./artifacts/) | 模型与导出包 |
| [reports/](./reports/) | 指标报告 |

## 主线：小参数 Transformer（推荐）

骨干：`uer/chinese_roberta_L-2_H-128`（~3.18M params，ONNX ≈12.1MB）

```bash
python3 docs/minors-ai-protection/p2/tools/train_tiny.py
python3 docs/minors-ai-protection/p2/tools/eval_tiny.py
python3 docs/minors-ai-protection/p2/tools/export_onnx.py
```

产物：`artifacts/tiny_roberta_l2h128/{model.pt,model.onnx,tokenizer,meta.json}`  
报告：`reports/tiny_eval.md`、`reports/tiny_onnx.md`

## 对照基线（TF-IDF + OneVsRest）

```bash
python3 docs/minors-ai-protection/p2/tools/train_baseline.py
python3 docs/minors-ai-protection/p2/tools/eval_baseline.py
```

Owner：Agent-001  
当前版本：**p2-v0.2-tiny**（小参数 Transformer + ONNX；TF-IDF 仅作对照）  
