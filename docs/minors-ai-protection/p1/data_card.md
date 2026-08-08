# Data Card — minors-ai-protection synthetic text (P1)

| 字段 | 内容 |
|---|---|
| 数据集名称 | minors_ai_cn_text_risk_synthetic |
| 版本 | **v0.4**（当前推荐；v0.1–v0.3 保留） |
| 创建日期 | 2026-08-08 |
| Owner | Agent-001 |
| 上游规范 | p0-v1.0（人类签字） |
| 语言 | zh-CN |
| 模态 | 文本（单句/短句） |
| 任务 | 多标签风险识别 + S0–S3 等级 |

## 1. 动机

为端侧中文诱导风险分类器（P2）提供合规可训练数据与可回归评测基准，在不使用真实未成年私密聊天的前提下覆盖 MVP 8 标签。

## 2. 组成

| 子集 | 用途 | 路径 |
|---|---|---|
| train | 模型训练 | `datasets/v0.4/train/train.jsonl` |
| dev | 调参/早停 | `datasets/v0.4/dev/dev.jsonl` |
| test | 冻结评测 | `datasets/v0.4/test/test.jsonl` |
| adv | 对抗回归 | `datasets/v0.4/eval_adversarial/adv.jsonl` |
| refusal | 提示话术（含 audience/action） | `refusal_library/refusal_v0.4.jsonl` |

**v0.4 实测（`reports/v0.4_stats.json`）— 十人会 FIX 落地**

| 子集 | 条数 |
|---|---|
| train | **30000**（S0 28%；催回复污染 0%） |
| dev | 10494 |
| test | 13397（每标签正例 ≥1441） |
| adv | 800（独立种子；骨架重叠 0%） |
| refusal | 500 |
| eval 合计 | **24691** |
| salt_hits | **0** |
| U03 欠升级 | **0** |

历史对照：v0.1=3000；v0.2=8000；v0.3=30000（rc1，含盐记，已弃用为训练主集）。

## 3. 来源与生产

- P0 `examples/*.md` 正负例种子  
- P0 `golden/golden_set.jsonl`（进入 test）  
- 模板槽位填充与轻量同义改写（`tools/synthesize_batch.py@v0.4`，无盐值指纹）  
- **未使用**真实用户日志、未授权抓取、成人业务语料  
- **未启用**外部 LLM API  

## 4. 标注

- 标签体系：p0 `schema/labels.yaml`  
- 等级：对齐 P0 U03 词表 + 升级 reason_codes（combo/secrecy）  
- `review_status=auto` 表示规则生成待抽检；P0 种子为 `imported`（非预盖章 spot_checked）  
- 抽检计划：`reports/spot_check_plan.md`

## 5. 伦理与风险

- 样本为合成风险话术，可能引起不适；仅用于防护模型研发  
- 禁止将本数据集用于训练绕过未成年人保护的对抗模型  
- 不得对外伪装为真实案件语料

## 6. 限制

- 单句为主，多轮 grooming 覆盖不足（P4）  
- 方言/谐音/慢诱导仍偏少（adv 子集起步）  
- 自动生成可能有标签噪声，需抽检达标后才冻结为 P1-v1.0

## 7. 维护

- 缺陷 → `p1/decisions.md`  
- 升版 → 新目录 `datasets/v0.x/`，更新本 Card 与 stats
