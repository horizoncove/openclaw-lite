# R09 合规审计 / 证据链评审意见

- 委员：#9 合规审计/证据链专家  
- 对象：`p1-v0.3`（train=30000 / eval=28169 / refusal=500 / adv=500 / raw=58169）  
- 日期：2026-08-08  
- 依据：仓库实读 + `validate_p1.py` 复跑 + 分层抽样字段核验  

---

## 1) 投票

**有条件通过**

## 2) 一句话结论

规模门禁、版本目录与 schema 溯源字段骨架已立，但 **content_hash 名实不符、抽检证据链未闭环、`spot_checked` 语义被生成脚本预盖章**，故可进入有条件 rc / P2 对接，**不可冻结 p1-v1.0**。

---

## 3) 阻断项（FIX）

| ID | 级别 | 问题 | FIX（路径） |
|---|---|---|---|
| A-B1 | **P1** | 抽检门禁未落地：计划 ≈288 条，`reports/v0.3_spot_check_ids.txt` 仅 84 条且对应样本仍为 `review_status=auto`；`reports/v0.3_spot_check_findings.md` **不存在**；`spot_check_plan.md` / `review_pack.md` 签字位空白 | 按 `reports/spot_check_plan.md` 补齐分层抽检 → 落盘 `reports/v0.3_spot_check_findings.md`（条数、正确率、争议、签字）→ 抽中样本升 `spot_checked` → 更新签字位 |
| A-B2 | **P1** | `reports/v0.3_stats.json` 的 `content_hash=cca161c4904562f0` **并非内容摘要**：源码为 `sha256(json.dumps({split:len}))[:16]`，仅编码条数，任意改写文本只要条数不变则 hash 不变 | 改 `tools/synthesize_batch.py`：对 `raw/all.jsonl`（或四 split 规范化行）做完整 sha256；回写 `reports/v0.3_stats.json`；Data Card 注明算法 |
| A-B3 | **P1** | `review_status=spot_checked` 在生成时写给 P0 seed/golden/hard_negative（全库 157 条），**不是**人工抽检结果；与合规规范「抽检记录」语义冲突，构成审计伪阳性 | 改 `tools/synthesize_batch.py` `load_p0_seeds()`：导入种子用 `auto` 或新增 `imported`；仅人工抽检后升 `spot_checked`；同步修正已发布 v0.3 或升 v0.4 |
| A-B4 | **P1** | 生成参数未完整落盘：stats 仅有 `seed/version/content_hash`，缺 `target-train/adv-budget/refusal-n/min-test-per-label`、脚本路径、git commit、Python 版本 | 新增 `reports/v0.3_generation_manifest.json`（或扩写 stats）；README 命令与 manifest 对齐 |

> 未发现 **P0** 红线证据（未见真实未成年私密原文混入、未见 golden 进 train、未见跨 split 文本泄漏）。粗筛「学校+号」类模板噪声属合成盐值，不构成真实可识别私密。

---

## 4) 开放项（不阻塞规模门禁）

| ID | 级别 | 事项 | 建议 |
|---|---|---|---|
| A-O1 | P2 | `seeds/p0_seed_index.jsonl` 随每次生成覆写，无 `seeds/v0.x/` 版本化 | 按版本落盘 `seeds/v0.3_p0_seed_index.jsonl` |
| A-O2 | P2 | `pipeline.md` 写 `import_p0_seeds.py`，仓库仅有 `synthesize_batch.py` 内嵌加载 | 改文档或拆脚本，避免流程伪文档 |
| A-O3 | P2 | `annotator` 全库恒为 `Agent-001`；`ts` 全日 `2026-08-08`（无时分秒） | 人工复核写入真实 annotator id；ts 用 ISO8601 |
| A-O4 | P2 | refusal 缺 `review_status`（合规规范§3「每条样本必须有」对训练/评测样本强制；话术库建议对齐） | 扩 refusal schema 或单独声明豁免 |
| A-O5 | P2 | 合规规范§4「每 100 抽 10 双人复标」无工具/记录模板 | 增加双人复标表头于 findings |
| A-O6 | P2 | Data Card「v0.1 未启用外部 LLM」未显式覆盖 v0.3（`decisions.md` 已写 v0.1–v0.3 关闭） | 同步 Card 措辞 |

---

## 5) 七问简答

| # | 问题 | 结论 |
|---|---|---|
| 1 | 是否坚持合成红线？ | **是（就现有证据）**：Data Card / decisions / review_pack 声明一致；样本 `source` 均在 schema 枚举内；未见真实用户日志字段。 |
| 2 | train/dev/test/adv 隔离与 golden 不进 train？ | **成立**：复跑 validator **PASS**；规范化跨 split 泄漏=0；`seed_golden` 仅在 test（40）；golden 文本未进 train。 |
| 3 | 8 标签可学性与均衡是否足以开 P2？ | **规模上是**：test 每标签正例 ≥1707；train S0/硬负 28%。标签噪声待抽检，属质量而非审计否决点。 |
| 4 | S0/硬负例是否足以控制误拦？ | **数量门槛达标**（28%≥25%）；硬负 `spot_checked` 为导入预盖章，质检证据不足。 |
| 5 | adv/拒绝话术是否最小可用？ | **规模达标**（adv=500，refusal=500）；adv 几乎全 `auto`（499/500），对抗可用性需红队委员裁定。 |
| 6 | Data Card / 溯源 / 版本纪律是否可审计？ | **部分可审计**：目录纪律与字段齐备为通过项；**hash/抽检/`spot_checked` 语义为重大缺口**（见下节）。 |
| 7 | **可否冻结并开 P2？** | **有条件**：允许以 `p1-v0.3-rc` 开 P2 数据对接与实验；**禁止冻结 p1-v1.0**，直至 A-B1～A-B4 闭环。 |

---

## 6) 专项审计发现

### 6.1 Data Card

| 检查项 | 结果 |
|---|---|
| 版本/规模与 `v0.3_stats.json` 一致 | ✓ train 30000 / eval 28169 / refusal 500 / adv 500 / raw 58169 |
| 子集路径正确 | ✓ `datasets/v0.3/{train,dev,test,eval_adversarial}` + `refusal_library/refusal_v0.3.jsonl` |
| 来源声明（合成、无真实私密、无成人语料） | ✓ 与 decisions / 合规规范一致 |
| 限制与未冻结声明 | ✓ 明确「抽检达标后才冻结 P1-v1.0」 |
| 与 hash/抽检真实性对齐 | ✗ Card 未警示 content_hash 仅为规模指纹；未披露 `spot_checked` 预盖章 |

### 6.2 stats 与可复现生成

- 复跑：`python3 tools/validate_p1.py --version v0.3 --min-train 30000 --min-eval 2000 --min-test-per-label 100 --min-refusal 500` → **PASS**。  
- `README.md` 给出一键命令（`--seed` 默认 42，与 stats 一致）：可**近似复现**生成流程。  
- **不可证明「落盘文件未被篡改」**：  
  - 弱 hash 复算：`sha256({"adv":500,"dev":12211,"test":15458,"train":30000})[:16] == cca161c4904562f0`（命中）。  
  - 对 `datasets/v0.3/raw/all.jsonl` 全文行 hash：`fba28760b3b6ef347b6d1b490ba93588440434860ed3321f1697775d25dd42da`（stats **未记录**）。  
- `ts=date.today()`：跨日重跑会改变字段，严格字节级复现需固定 `TODAY` 或写入 manifest。

### 6.3 版本目录纪律

| 资产 | 纪律 |
|---|---|
| `datasets/v0.1|v0.2|v0.3/` | ✓ 并存，未见原地覆写推荐集 |
| `refusal_library/refusal_v0.x.jsonl` | ✓ 分版 |
| `reports/v0.x_stats.json` / `*_spot_check_ids.txt` | ✓ 分版 |
| `seeds/p0_seed_index.jsonl` | ✗ 单文件覆写（当前指向 v0.3 的 100 条种子） |
| 标签 key | ✓ 与 p0 八标签一致，未见偷偷改 key |

### 6.4 source / review_status / annotator 溯源

全库 58169 条：**必填字段无缺失**；`source`/`review_status` 均落在 schema 枚举。

| 维度 | 实测 |
|---|---|
| source 分布 | template 20237 / paraphrase 24020 / normal 11145 / combo 1835 / hard_negative 332 / seed_p0 60 / seed_golden 40 / adversarial 500 |
| review_status | auto **58012**（99.7%）/ spot_checked **157** |
| spot_checked 构成 | seed_golden 40 + seed_p0 60 + hard_negative 56 + adversarial 1 —— **生成时写入，非抽检回写** |
| annotator | 100% `Agent-001` |
| ts | 100% `2026-08-08` |
| 抽检 ID 清单 | 84 条，全在 train，**全部仍为 auto**（paraphrase/template/normal） |

结论：字段「有」≠ 证据链「可信」。当前 `spot_checked` 更像「来自 P0 种子」标记，会误导审计认为已完成人工抽检。

### 6.5 抽检记录位

| 应有产物 | 状态 |
|---|---|
| `reports/spot_check_plan.md` | 有计划，签字表「待做」 |
| `reports/v0.3_spot_check_ids.txt` | 有，但量不足且未覆盖 plan 桶（缺 test/combo/adv 分层） |
| `reports/v0.3_spot_check_findings.md` | **缺失** |
| `review_pack.md` 人类/法学签字 | **空** |
| 数据集字段回写 | **未做** |

按合规规范§4 / §7：抽检 <95% → 冻结升版受阻（P2 级处置在规范表，但评审 Brief 将「抽检门禁缺失」定为 **P1**）。本委员按 Brief 执行。

---

## 7) 抽样证据（真实样本）

| id | source / review_status / annotator | text 片段 | 审计含义 |
|---|---|---|---|
| `TR00001` | template / **auto** / Agent-001 | 「嗯…今天，别遮脸，我想看您长什么样…#4003802」 | 主体训练样本待抽检 |
| `TR00015` | paraphrase / **auto** / Agent-001 | 「同学，交友先报年龄，请说…/505789」 | 出现在 spot_check_ids，但仍为 auto |
| `TR00031` | paraphrase / **auto** / Agent-001 | 「别瞒我，老实说您年级…·502681」 | 同上 |
| `TE00001` | seed_golden / **spot_checked** / Agent-001 | 「不把联系方式给我，后果自负」 | golden 在 test；spot_checked 为导入预盖章 |
| `TR01227` | hard_negative / **spot_checked** / Agent-001 | 「展会开放日欢迎参观（公开活动）」 | 硬负例预盖章，非人工抽检记录 |
| `AD00001` | adversarial / **auto** / Agent-001 | 「…我可以上门拿东西，你在家吗…-5004132」 | adv 缺抽检覆盖 |
| `RF0001` | p0_user_facing_copy / （无 review_status） | 「对方在询问你的年龄或年级…」 | 话术库溯源字段弱于主样本 |

---

## 8) 审计缺口清单（汇总）

1. **实质 content hash 缺失**（现有字段为条数指纹）。  
2. **生成参数 / 环境 / git commit 未落盘**。  
3. **抽检 findings + 签字位缺失**；抽检 ID 与 plan 规模不一致。  
4. **`spot_checked` 预盖章造成证据链污染**。  
5. **annotator/ts 不可区分批次与真人复核**。  
6. **seed index 未版本化**；pipeline 文档与脚本名不一致。  
7. **refusal 缺 review_status**（建议对齐）。

---

## 9) 对冻结与开 P2 的审计立场

- **冻结 `p1-v1.0`**：**否**（A-B1～A-B4 未清）。  
- **以 `p1-v0.3` 开 P2 试点**：**有条件允许**——限内部实验/管道联调；对外与合规表述须继续使用「合成数据、抽检未完成、未宣称法定义务满足」口径（合规规范§6）。  
- 建议验收顺序：先修 hash + manifest + `spot_checked` 语义 → 再完成分层抽检 findings → 最后签字冻结。

---

## 10) 委员签字位

| 角色 | 日期 | 结论 |
|---|---|---|
| #9 合规审计/证据链 | 2026-08-08 | **有条件通过**；七问第7问=**有条件** |
