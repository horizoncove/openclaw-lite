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
| [tools/](./tools/) | 数据加载 / 基线训练 / 评测 |
| [artifacts/](./artifacts/) | 模型与向量器 |
| [reports/](./reports/) | 指标报告 |

## 一键基线（TF-IDF + OneVsRest）

```bash
python3 docs/minors-ai-protection/p2/tools/train_baseline.py
python3 docs/minors-ai-protection/p2/tools/eval_baseline.py
```

Owner：Agent-001  
当前版本：**p2-v0.1-baseline**（sklearn TF-IDF，非端侧最终形态）  
下一阶段：换小参数 Transformer + ONNX 导出  
