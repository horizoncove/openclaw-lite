# P1 工作区：合成数据与评测基准

启动方法见 `../P1启动指南.md`。  
上游冻结：`../p0/` → **p0-v1.0**（人类已签字）。

## 核心文件

| 文件 | 说明 |
|---|---|
| [数据合规规范.md](./数据合规规范.md) | 强制红线与处理规则 |
| [data_card.md](./data_card.md) | Data Card |
| [pipeline.md](./pipeline.md) | 合成流水线说明 |
| [decisions.md](./decisions.md) | P1 决议 |
| [WORKLOG.md](./WORKLOG.md) | 工作日志 |
| [schema/sample.schema.json](./schema/sample.schema.json) | 样本 JSON Schema |
| [tools/](./tools/) | 导入 / 合成 / 划分 / 校验 |
| [datasets/v0.1/](./datasets/v0.1/) | 首批数据集 |
| [refusal_library/](./refusal_library/) | 拒绝/保护话术 |
| [reports/](./reports/) | 规模与质检报告 |

## 一键生成与校验

```bash
# 从 P0 导入种子 + 模板扩写 + 划分（扩量示例）
python3 docs/minors-ai-protection/p1/tools/synthesize_batch.py \
  --version v0.2 --target-train 8000 --min-test-per-label 60 \
  --adv-budget 240 --refusal-n 320

# 校验
python3 docs/minors-ai-protection/p1/tools/validate_p1.py \
  --version v0.2 --min-train 8000 --min-eval 800 \
  --min-test-per-label 60 --min-refusal 300
```

Owner：Agent-001  
当前版本：**p1-v0.2**（扩量合成；v0.1 保留对照）  
规模：train 8000 / eval ~7975 / refusal 320  
下一阶段：抽检 ≥95% 后冻结 p1-v1.0 → 开 P2
