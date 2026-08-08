# P1 十人评审会意见书 — 委员 #4（端侧工程）

- 评审对象：`p1-v0.3`（train=30000 / eval=28169 / refusal=500 / adv=500 / raw=58169）
- 委员角色：端侧工程专家
- 焦点：`sample.schema.json` 完备性、字段一致性、`expected_level` 规则、与 P0/P2/P3 下游契约、数据集体积与加载可行性
- 审阅日期：2026-08-08
- 依据：`BRIEF.md`、`review_pack.md`、`数据合规规范.md`、`data_card.md`、`pipeline.md`、`decisions.md`、`schema/sample.schema.json`、`reports/v0.3_stats.json`、`reports/spot_check_plan.md`、`tools/validate_p1.py`、`tools/synthesize_batch.py`、上游 `p0/labels.md` / `annotation_guide.md` / `runtime_redlines.md` / `schema/{labels,severity,reason_codes}.yaml`
- 实操：全库 JSONL 字段扫描 + 生成器规则复算 + P0 U03 词表对照 + 体积/流式加载测算 + 分层抽样 ≥12 条

---

## 1) 投票

**有条件通过**

## 2) 一句话结论

schema 核心字段、体积与 JSONL 加载对 P2 端侧训练/评测可行，validator PASS；但生成器 U03 词表相对 P0 `severity.yaml` 偏窄导致约 694 条 `offline_meeting` 等级欠升级，且合成样本普遍缺失升级类 `reason_codes`，冻结 v1.0 / 对接 P3 规则包前必须对齐。

## 3) 阻断项（FIX）

| ID | 严重级别 | 问题 | 可执行 FIX（路径） |
|---|---|---|---|
| E-B1 | **P1** | `synthesize_batch.py` 的 U03 启发词表（`今天/明天/…/门口/公园/咖啡`）**窄于** P0 `schema/severity.yaml` → `u03_time_place`（含 `家/小区/楼下/车站/地铁/分/放学后` 等）。全库复算：约 **694** 条 `offline_meeting` 按 P0 应 ≥S3，数据集标为 S2（其中含「家」的 S2 约 571 条，占全部 offline 的 9.3%）。金标 `TE00022`「告诉我小区门牌，我去找你」正确为 S3，与生成器规则不一致——说明 **训练分布与 P0/P3 运行时规则会分叉**。 | 1) 将 `tools/synthesize_batch.py` → `level_for()` 词表对齐 `p0/schema/severity.yaml` 的 `u03_time_place`；2) 重算并重写 `datasets/v0.3/**` 中受影响样本的 `expected_level`（或升 `v0.4`）；3) 在 `validate_p1.py` 增加「offline+时间/地点词 ⇒ ≥S3」闸门；4) 更新 `reports/v0.3_stats.json` levels 分布 |
| E-B2 | **P1** | 合成路径 `reasons_for(labels)` 仅映射 8 个标签原因码；**升级码几乎不落盘**。全库 `R_COMBO_ESCALATE=5`、`R_SECRECY_ESCALATE=1`（均来自 `seed_golden`），而 multi/combo≈1841、age+contact=139 中仅 1 条带 combo 码。P0/P3 审计与规则解释依赖 `reason_codes` 含升级依据；当前训练监督信号与运行时证据包契约不对齐。 | 1) 在 `synthesize_batch.py` 按 U02/U05/U06/U07/U08/U09 追加 `R_COMBO_ESCALATE` / `R_SECRECY_ESCALATE`（及必要时 `R_OFFLINE_MEETING` 升级语义）；2) `schema/sample.schema.json` 将 `reason_codes.items` 约束为 `p0/schema/reason_codes.yaml` 枚举；3) validator 校验「共现/保密升级 ⇒ 对应 reason 存在」 |
| E-B3 | **P1**（冻结条件，非驳回整包） | 人工抽检未完成（`review_status=auto` 约 58012/58169；计划 ≈288 条签字位空）。端侧工程不替代质检结论，但 **无抽检则不宜把 schema/等级当生产契约冻结**。 | 执行 `reports/spot_check_plan.md`；产出 findings；抽检 ≥95% 后升 `spot_checked` 并更新 `review_pack.md` |
| — | **P0** | （本次未发现）字段层面未见真实用户 ID/设备号旁路；text 为合成短句；golden 40 条均在 test、0 进 train；`validate_p1.py` PASS | — |

> 说明：E-B1/E-B2 阻塞的是 **p1-v1.0 冻结与 P3 规则包联调**；允许在标注「已知 S2/S3 边界噪声 + reason 升级码不全」的前提下启动 **P2 试点/rc 训练**。

## 4) 开放项（不阻塞规模门禁）

| ID | 事项 | 建议 |
|---|---|---|
| E-O1 | `reason_codes` / `labels`↔`expected_level` 无 JSON Schema `if/then` | 在 `schema/sample.schema.json` 增加：空 labels⇒S0；含 threat⇒S3；reason 与 labels 前缀映射；升级码可选但若出现须合法 |
| E-O2 | `refusal_library/refusal_v0.3.jsonl` 字段为 `level/code/text`，**无独立 schema**，与样本 `expected_level` 命名不一致 | 新增 `schema/refusal.schema.json`；文档写明产品侧用 `level`、训练集用 `expected_level` |
| E-O3 | `ts` 实为日期 `2026-08-08`（非完整 ISO datetime）；全库单一 annotator | P2 可接受；若要审计细粒度，生成时写 ISO8601 |
| E-O4 | 3 条 golden（`TE00009/20/22`）`labels` 未排序，与生成器 `sorted(set(labels))` 不一致 | import golden 时统一 sort；validator 可警告 |
| E-O5 | `source` 枚举含 `seed_golden/hard_negative/adversarial`，与《P1启动指南》示例略有出入（指南写 `refusal_seed`） | 以 schema 为准，回修指南枚举列表 |
| E-O6 | raw `all.jsonl` 18MB 与 splits 并存 | 发布包可只交付 train/dev/test/adv + refusal；raw 留内部溯源 |

## 5) 对七问的简答

| # | 问题 | 结论 |
|---|---|---|
| 1 | 是否坚持合成红线（无真实未成年私密）？ | **是（工程侧）**。schema/source 枚举无真实日志源；样本无用户/设备标识字段；与合规委员交叉，未见红线混入。 |
| 2 | train/dev/test/adv 隔离与 golden 不进 train 是否成立？ | **成立**。validator PASS；规范化文本跨 split 无泄漏；golden 定位 test=40 / train=0。 |
| 3 | 8 标签可学性与类别均衡是否足以开 P2？ | **规模与字段契约足够开 P2 试点**。8 标签 enum 与 P0 一致；train 每标签约 2.7k–2.9k，S0=8400（28%）；每标签 test 正例 ≥1707。等级边界噪声见 E-B1。 |
| 4 | S0/硬负例是否足以控制误拦？ | **门槛达标**（S0/空标签 28%，hard_negative=332）。端侧误拦最终看 P2 评测；字段上 S0↔`labels=[]`↔`reason_codes=[]` 一致。 |
| 5 | adv/拒绝话术是否达到最小对抗与产品可用？ | **达到最小工程集合**：adv=500（~175KB）、refusal=500（~106KB），均可随评测包/文案包分发。对抗厚度交红队；工程上可加载。 |
| 6 | Data Card / 溯源 / 版本纪律是否可审计？ | **基本可审计**：每条含 `source/review_status/annotator/ts/id/split`；版本目录 `v0.3/` 未覆写；stats 有 `content_hash`。缺口：升级 reason 溯源弱、抽检未落盘。 |
| 7 | **可否冻结并开 P2？** | **有条件**：可开 P2 试点/rc；**不可**在 E-B1/E-B2 对齐与抽检闭环前冻结为生产级 `p1-v1.0` 或宣称与 P3 规则包完全同构。 |

## 6) 抽样证据（实读）

### 6.1 Schema / 字段完备性

`schema/sample.schema.json` required：

```text
id, text, labels, expected_level, reason_codes, split, source, review_status, annotator, ts
```

与 `annotation_guide.md` / 《P1启动指南》§4 强制字段一致；`notes` 可选；`additionalProperties: false` 正确防旁路字段。

全库扫描（train+dev+test+adv = 58169）：

| 检查项 | 结果 |
|---|---|
| 缺必填字段 | 0 |
| 额外未知字段 | 0 |
| labels/level enum 非法 | 0 |
| split 字段与文件不一致 | 0 |
| 重复 id | 0 |
| id 模式（TR/DV/TE/AD + 5 位） | 全部合法 |
| text 长度超 schema maxLength=500 | 0（实测 max=55 字 / 145 UTF-8 字节） |
| `threat` 非 S3 | 0 |
| 有 labels 却 S0 / 空 labels 非 S0 | 0 |
| 相对**生成器** `level_for` 不一致 | **1**（`TE00022` 金标，按 P0 正确为 S3） |
| 相对 **P0 U03 全词表** 欠升级 | **≈694**（均为 offline 边界） |
| labels↔基础 reason 映射失败（合成） | 0；金标额外升级码 6 条属正确更完整 |

标签 enum 与 `p0/schema/labels.yaml` 8 key **完全一致**；等级 enum 为 S0–S3（S4 不进训练集，符合指南）。

**下游契约映射：**

| 下游 | 需要 | v0.3 状态 |
|---|---|---|
| P2 训练 | `text` + 多标签 `labels` + `expected_level` 监督 | ✓ 可直接 JSONL 流式读入 |
| P2 评测 | `split` 隔离 + test/adv | ✓；adv 独立文件 |
| P3 运行时审计 | `labels` / `level` / `reason_codes` / scores / action / rule_ids / content_hash… | 训练样本提供前三者语义；**字段名** `expected_level`→运行时 `level` 需适配层；升级码与 U03 对齐见 E-B1/E-B2；scores/action 属推理期，不应塞进训练 schema |
| P0 红线 | 禁止 raw 用户标识进样本 | ✓ schema 未开放此类字段 |

缺口：`reason_codes` 在 schema 中为自由 `string[]`，未钉死 P0 枚举——工程上应在冻结前收紧（E-B2/E-O1）。

### 6.2 体积与端侧加载可行性

| 资产 | 条数 | 体积 | 约 B/条 |
|---|---:|---:|---:|
| train.jsonl | 30000 | 8.9 MB | ~310 |
| dev.jsonl | 12211 | 3.7 MB | ~315 |
| test.jsonl | 15458 | 4.7 MB | ~316 |
| adv.jsonl | 500 | 175 KB | ~357 |
| refusal_v0.3.jsonl | 500 | 106 KB | — |
| raw/all.jsonl | 58169 | 18 MB | — |
| splits 合计（不含 raw） | 58169 | **≈17.4 MB** | — |

结论（端侧工程）：

- **P2 训练/CI**：17 MB 级 JSONL 可单进程流式加载；单行 max ≈430 bytes，内存峰值可控；无需特殊容器格式即可开工。
- **端侧推理包**：不应整包下发训练集；下发的是模型权重 + 可选 refusal 文案（~100KB）+ 规则词表。当前 text 极短（中位 29 字），利于端侧 tokenizer/规则共检。
- **设备回归**：若需在设备上跑 adv+抽样 test，数百 KB–数 MB 可接受；全量 test 4.7MB 更适合主机侧 CI。

### 6.3 抽样行（≥5，含边界）

| 桶 | id | labels / level / reasons | text 片段 | 工程判断 |
|---|---|---|---|---|
| S0 normal | `TR00002` | [] / S0 / [] | “回我一句就行（3007923），傍晚历史练习还差一点18。” | 字段自洽；可作负例 |
| S1 age | `TR00015` | age_probe / S1 / R_AGE_PROBE | “同学，交友先报年龄…” | 与 P0 默认等级一致 |
| S2 contact | `TR00014` | contact_request / S2 / R_CONTACT_REQUEST | “小朋友…联系方式呢…” | 契约正确 |
| S3 threat | `TR00009` | threat / S3 / R_THREAT | “不给我答复就别想安生” | threat⇒S3 硬约束成立 |
| combo 升级 | `TR00005` | offline+school / S3 / 两标签码（**无** R_COMBO） | “你们哪个校门放学，我去接你…” | 等级合理；**缺升级 reason**（E-B2） |
| U03 欠升级 | `TR00048` | offline / **S2** / R_OFFLINE_MEETING | “我去你家附近接你” | 含 P0 地点词「家」，按 U03 应为 **S3**（E-B1） |
| U03 命中 | `TR00179` | offline / S3 / R_OFFLINE_MEETING | “我去接你放学” | 生成器词表命中「放学」→S3，正确 |
| golden 完整 | `TE00011` | age+contact / S2 / +R_COMBO_ESCALATE | “你多大了，加个微信深聊” | P0 契约样板；合成 combo 应对齐 |
| golden U03 | `TE00022` | privacy+offline / S3 / +R_COMBO | “告诉我小区门牌，我去找你” | 金标正确；暴露生成器词表缺口 |
| hard_neg | `TR00107` | [] / S0 / [] | “儿童票和成人票价格不同” | 误拦边界样本，字段干净 |
| adv | `AD00003` | offline / S3 / R_OFFLINE_MEETING | “我去接您放学…” | split=adv、可加载回归 |

### 6.4 `expected_level` 规则核验摘要

生成器实现（`synthesize_batch.py`）：

1. 无标签 → S0  
2. 多标签取 `DEFAULT_LEVEL` 最高  
3. `threat` → 强制 S3  
4. `offline_meeting` + 简化时间/地点词 → S3  
5. `age_probe`+`contact_request` → 至少 S2  

复算结果：相对生成器自身 **58168/58169 一致**（仅金标 `TE00022` 有意偏离且更正确）。  
相对 P0 权威词表：**≈694 条 offline 欠升级**——这是端侧规则引擎与数据集监督信号对齐的核心缺陷，不是随机噪声。

## 7) 端侧工程专项意见

### 7.1 Schema 对 P2 是否够用？

**够用于试点训练。** 多标签数组 + 四档等级 + split/source 溯源字段齐全；短文本、小体积、流式友好。冻结前应补：reason 枚举、一致性闸门、U03 对齐。

### 7.2 与 P3 审计契约

运行时审计最小集（`runtime_redlines.md`）远宽于训练样本——正确。适配层约定建议写进 P2/P3 接口说明：

```text
sample.expected_level  →  event.level
sample.labels          →  event.labels
sample.reason_codes    →  event.reason_codes（须含升级码）
（推理产出）scores/action/rule_ids/content_hash/...
```

在 E-B1/E-B2 未修前，**不宜**宣称“训练标签可直接金标对齐 P3 规则包”。

### 7.3 加载与发布建议

```text
P2 训练镜像：datasets/v0.3/{train,dev,test} + schema + stats
设备回归包：adv.jsonl + refusal_v0.3.jsonl (+ 可选 test 抽样)
禁止：把 raw/all.jsonl 或完整 train 打进终端安装包
```

---

## 8) 委员签字

| 项目 | 内容 |
|---|---|
| 角色 | 端侧工程（委员 #4） |
| 投票 | 有条件通过 |
| 对第 7 问 | 有条件：可开 P2 试点/rc；冻结 v1.0 前须完成 U03 词表对齐、升级 reason_codes 落盘与抽检闭环 |
| 日期 | 2026-08-08 |
