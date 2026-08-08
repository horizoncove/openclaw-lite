# 07 · 双轨映射：产品四类风险 ↔ 研究标签 / S0–S4

版本：`minorguard-devdocs-v0.1`

## 1. 为什么需要映射

- **产品轨（MinorGuard Demo）**：面向「生成式 AI 交互」的四类风险 + 处置动作码
- **研究轨（minors-ai-protection）**：面向「诱导/隐私」的 8 个 MVP 标签 + S0–S4 等级

P3 起两端必须能对话：端侧模型出标签，产品策略出 `actionCode`。

## 2. 标签 → 产品类别（默认映射）

| 研究轨标签 (`p0-v1.0`) | 产品 `categoryCode` | 说明 |
|---|---|---|
| `age_probe` | `interaction` | 年龄试探，偏交互诱导 |
| `privacy_request` | `data` | 隐私索取 |
| `contact_request` | `data` | 联系方式索取 |
| `school_request` | `data` | 学校信息索取 |
| `photo_request` | `data` | 图片/自拍索取 |
| `offline_meeting` | `interaction` | 线下见面诱导 |
| `emotional_manipulation` | `interaction` | 情感操控/依赖 |
| `threat` | `content` | 威胁恐吓（也可并行标记 interaction） |

未覆盖但产品已有的：`tool`（作弊/越权/攻击脚本）——研究轨后续可扩标签；P3 仍由产品规则/LLM 覆盖。

## 3. 研究等级 → 产品动作（默认）

研究轨默认等级见 `p2/configs/labels.json` 的 `default_level`。

| 研究 `expected_level` / S 级 | 产品 `levelCode`（建议） | 产品 `actionCode`（建议） |
|---|---|---|
| S0 | `none` | `allow` |
| S1 | `low` 或 `medium`（视分数） | `observe` |
| S2 | `medium` / `high` | `throttle` 或 `block_review` |
| S3 | `high` | `block_review` |
| S4 | （产品暂不自动执行） | 仅记录 `needs_human_escalation`，**不自动报案** |

具体阈值由 PolicyEngine 配置，不在映射表写死唯一分数。

## 4. Adapter 输出约定（P3）

```json
{
  "source": "ondevice_tiny_roberta",
  "labels": [
    { "key": "contact_request", "score": 0.91 }
  ],
  "mappedCategories": [
    { "categoryCode": "data", "score": 91, "fromLabels": ["contact_request"] }
  ],
  "levelHint": "S2",
  "model_ver": "tiny_roberta_l2h128@p2-v0.2",
  "data_ver": "p1-v1.0/v0.4"
}
```

Analyzer 将 `mappedCategories` 并入 merge 步骤，再跑产品策略。

## 5. 冲突处理

1. 多标签映射到同一类别：取 max score  
2. 端侧与本地规则冲突：取更高风险（防漏报）  
3. 正向学习意图策略可在合并后降级（防误报）  
4. 映射表变更必须升 `ruleSetVersion` 或独立 `mappingVersion`

## 6. 验收关注点

- 研究轨高风险三类（contact / offline / threat）映射后不得被静默丢弃
- S0 正常样本不得仅因「初中生」字样被映射成 `block_review`
