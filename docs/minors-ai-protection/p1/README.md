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
# 当前推荐 v0.4（十人会 FIX 落地）
python3 docs/minors-ai-protection/p1/tools/synthesize_batch.py \
  --version v0.4 --target-train 30000 --min-test-per-label 100 \
  --adv-budget 800 --refusal-n 500

# 校验（含去盐/U03/伦理/refusal 门禁）
python3 docs/minors-ai-protection/p1/tools/validate_p1.py --version v0.4
```

Owner：Agent-001  
当前版本：**p1-v1.0**（数据锚定 `datasets/v0.4`；抽检 288 条 PASS）  
规模：train **30000** / eval **24691** / refusal **500** / adv **800**  
评审纪要：`review_meeting_v1/01_minutes_v1.md`  
签字：`HUMAN_SIGN_OFF.md`  
下一阶段：已开 **P2**（见 `../p2/`）
