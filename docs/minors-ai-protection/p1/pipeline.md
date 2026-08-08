# P1 合成数据流水线

## 总览

```text
P0 seeds (examples + golden)
        │
        ▼
 import_p0_seeds.py  →  seeds/p0_seed_index.jsonl
        │
        ▼
 synthesize_batch.py
   ├─ seed 原样（标记 source=seed_p0）
   ├─ template 槽位填充
   ├─ paraphrase 轻量改写
   ├─ combo 双标签共现
   └─ normal / hard_negative
        │
        ▼
 raw/all.jsonl
        │
        ▼
 split_dataset.py（内置于 synthesize）
   ├─ golden → test 优先
   ├─ 规范化去重跨 split
   └─ 均衡标签标签
        │
        ▼
 train / dev / test / eval_adversarial
        │
        ▼
 validate_p1.py → reports/
```

## 生成策略（v0.1）

1. **模板为主**：每个标签维护句式模板 + 槽位词表（称呼、软化词、标点）  
2. **种子改写**：对 P0 正负例做同义替换与前后缀，不改变标签意图  
3. **共现组合**：少量双标签句（如 age+contact），等级按 P0 升级规则取高  
4. **正常句**：日常学习/兴趣闲聊，labels=`[]`，level=`S0`  
5. **对抗子集**：空格插入、同音近形、委婉化，仅进 `adv`，供回归

可选 LLM 辅助：当前环境默认关闭；开启时须复核后改 `review_status`。

## 默认等级映射

与 `p0/schema/severity.yaml` 的 `default_label_level` 一致；多标签取最高等级。  
`threat` 恒为 S3；含时间/地点的 `offline_meeting` 倾向 S3（U03 简化启发）。

## 质量闸门

- `validate_p1.py`：schema、标签集合、等级合法、split 泄漏、每标签 test 计数  
- 人工抽检：见 `reports/spot_check_plan.md`

## 版本纪律

- 重新生成使用新目录 `datasets/v0.2/`，禁止静默覆盖已评审集  
- 变更标签定义必须先改 P0 并升版，不得只在 P1 偷偷改 key
