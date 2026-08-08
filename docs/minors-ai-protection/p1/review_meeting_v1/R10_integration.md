# R10｜系统集成 / P2 试点就绪评审意见

- 委员：#10 系统集成 / P2 试点就绪专家  
- 评审对象：`p1-v0.3`（train=30000 / eval=28169 / refusal=500 / adv=500）  
- 对照：`MVP与P0-P10技术路线细案.md` P1 验收 & DoD；P2 依赖（P0、P1）  
- 实读日期：2026-08-08  
- 工具门禁：`python3 tools/validate_p1.py --version v0.3 --min-train 30000 --min-eval 2000 --min-test-per-label 100 --min-refusal 500` → **PASS**

---

## 1) 投票

**有条件通过**

（允许按 `p1-v0.3-rc` 开 P2 工程脚手架与探索性训练；**不得**冻结 `p1-v1.0`，也不得以本版正式验收 P2 宏 F1 / 高危召回。）

---

## 2) 一句话结论

规模、隔离、schema、Data Card、拒绝话术与 validator 已具备 P2 开工的工程底座，但人工抽检 ≥95% 未闭环，P1 未冻结，端侧分类器正式训练/指标验收仍被阻塞。

---

## 3) P1 DoD 对照（路线细案验收 + 产出）

| DoD / 验收项 | 目标 | v0.3 实测 | 结论 |
|---|---|---|---|
| 《数据合规规范》 | 有 v1 | `p1/数据合规规范.md` 生效，绑定 p0-v1.0 红线 | **达标** |
| validator | 可复现门禁 PASS | 本机复跑 PASS；train/dev/test/adv/refusal 齐全 | **达标** |
| 训练/验证/测试隔离 | 规范化文本不跨 split；golden 不进 train | cross-split leakage=0；P0 golden 40 条全部在 test、train/dev/adv=0 | **达标** |
| 每标签 test 正例 | ≥40（本版门禁加严 ≥100） | 最低 `school_request=1707`，其余 ≥1753 | **达标（大幅超额）** |
| Data Card | 来源/审核/禁用/版本 | `data_card.md` 含组成、来源、限制、维护；`content_hash=cca161c4904562f0` | **达标** |
| 拒绝/保护话术 | ≥200 | `refusal_v0.3.jsonl` = **500** | **达标（数量）** |
| 人工抽检通过率 | ≥95% | 计划有、`v0.3_spot_check_ids.txt` 仅 84 条且全在 train；`v0.3_spot_check_findings.md` **不存在**；签字位空白 | **未达标（阻断冻结）** |
| 数据集 + 生成工具 | 可复现版本 | `datasets/v0.3/` + `tools/synthesize_batch.py` + `validate_p1.py` | **达标** |
| 评测基准 | 独立 test + adv | test=15458，adv=500 | **达标（最小对抗厚度）** |

路线细案 DoD 一句「有可复现训练与评测数据版本」：资产与目录纪律已具备，但 **Owner/评审包自身声明「尚未冻结为 p1-v1.0（待抽检 ≥95%）」**，故集成视角判定为 **rc 就绪、v1 未就绪**。

---

## 4) P2 依赖完备性：能否开端侧分类器

### 4.1 已就绪（不阻塞脚手架 / 探索训）

1. **标签契约**：8 MVP key 与 P0 `labels.md` / `schema/sample.schema.json` 一致，可直接做多标签 sigmoid。  
2. **规模与均衡**：train 正例每标签 2728–2913（max/min≈1.07）；S0/硬负例 8400/30000=28% ≥25%。  
3. **评测集厚度**：每标签 test ≫40，足以支撑 P2 目标宏 F1≥0.80、高危三类召回≥0.90 的脚本化评测。  
4. **划分纪律**：golden→test、adv 独立、validator 防泄漏，满足 P2「评测脚本一键产出报告」的数据前提。  
5. **下游字段**：`text/labels/expected_level/reason_codes/split/source/review_status` 齐备，端侧 Demo 可读。

### 4.2 会阻塞「正式开工 / 试点指标验收」的缺口

| 缺口 | 为何阻塞 P2 | 严重级别 |
|---|---|---|
| 抽检 ≥95% 未执行、无 findings、无签字 | 训练标签可信度未知；test 上的 F1/召回不能作为 MVP 验收 | **P1** |
| 抽检清单不完整（84≪计划≈288；仅 train，缺 test/combo/adv/hard_neg 桶） | 即使开抽也覆盖不到评测集纯度与对抗可标注性 | **P1** |
| `review_status=auto` 占比极高（train 29931/30000） | P2 会把生成噪声学进模型；误拦/漏拦指标失真 | **P1**（与抽检同一闭环） |
| 未冻结 `p1-v1.0` 版本钉 | 端侧导出 ONNX/量化后无法绑定可审计数据版本 | **P1**（流程） |

### 4.3 不阻塞开训、但会伤 P2 质量的项

| 项 | 观察 | 严重级别 |
|---|---|---|
| 模板同质化 / 数字盐 | train 约 **90.1%** 含 ≥5 位数字噪声（如 `#4003802`、`（3007923）`） | **P2**（应改，建议在冻结前或 P2 首周清洗） |
| 拒绝话术缺标签绑定 | 500 条均无 `labels` 字段；488 条 template，259 条含「提示+数字」填充 | **P2**（更伤 P3 文案映射；P2 Demo 可用 RF0001–RF0012 种子） |
| adv 厚度 | 500 条、以空格/语气后缀为主，谐音/慢诱导仍薄 | **P2** |
| hard_negative 语义边界 | 如「请确认你已满18岁后继续」标 S0，边界可争议，需抽检桶覆盖 | **P2**（抽检闭环后可能升 P1） |

**集成结论**：P2 **可以有条件开工**（数据加载、训练脚本、导出链路、Demo 壳）；**不可以无条件开工正式分类器训练并以本版宣称达标**。

---

## 5) 阻断项（FIX）

### P0（红线）— 本委员未发现

- 未检出真实未成年私密聊天导入迹象；启发式性化/色情关键词扫描 hits=0。  
- 成人业务语料混入：Data Card / decisions / 合规规范均声明禁止，样本源仅为 seed/template/paraphrase/normal/hard_negative/adversarial。  
- golden 泄漏进 train：**否**（40/40 在 test）。

### P1（阻塞冻结与正式开 P2）

1. **FIX-R10-01｜完成 v0.3 分层抽检并达标**  
   - 路径：`reports/spot_check_plan.md`、`reports/v0.3_spot_check_ids.txt`、新建 `reports/v0.3_spot_check_findings.md`、更新 `review_pack.md` 签字位  
   - 动作：按计划补齐 ≈288 分层样本（每标签 train20 + hard_neg40 + test40 + combo24 + adv24）；独立标注；通过率 ≥95% 且无红线；签字后方可冻结  
   - 阻塞：`p1-v1.0` 冻结 & P2 正式指标验收  

2. **FIX-R10-02｜冻结可复现数据版本钉**  
   - 路径：`data_card.md`、`review_pack.md`、`decisions.md`；必要时打 tag / 固化 `reports/v0.3_stats.json` 的 `content_hash`  
   - 动作：抽检通过后宣布 `p1-v1.0`（或 `p1-v0.3` 正式冻结），禁止静默覆写 `datasets/v0.3/`  
   - 阻塞：P2 模型包与数据版本对账  

### P2（应改不阻塞 rc）

3. **FIX-R10-03｜清洗训练文本中的生成盐数字**  
   - 路径：`tools/synthesize_batch.py`、升版 `datasets/v0.4/` 或冻结前清洗脚本  
   - 动作：去掉无语义长数字/「我说第N次」类盐，降低捷径学习  

4. **FIX-R10-04｜拒绝话术补标签/原因码映射**  
   - 路径：`refusal_library/refusal_v0.3.jsonl`（或 v0.4）  
   - 动作：为每条增加 `labels` 或 `reason_codes`；压缩纯数字填充模板占比  

---

## 6) 开放项（不阻塞规模门禁）

| ID | 事项 | 建议窗口 |
|---|---|---|
| R10-O1 | adv 增厚：谐音、拆字、emoji 夹杂、慢诱导单句 | P2 并行 |
| R10-O2 | hard_negative 专项复标（年龄门/安全课反例等） | 随抽检 |
| R10-O3 | 是否引入外部公开许可语料（decisions P1-O2） | 暂缓，默认不用 |
| R10-O4 | P2 训练入口文档：指定默认用 `datasets/v0.3/train` + eval 协议 | P2 开工日 |

---

## 7) 七问简答

1. **是否坚持合成红线？**  
   **是。** 合规规范 + Data Card + decisions 一致禁止真实未成年私密；抽样未见红线违规；启发式扫描 0 hit。

2. **train/dev/test/adv 隔离与 golden 不进 train？**  
   **成立。** validator PASS；规范化跨 split 泄漏 0；golden 40 条均在 test。

3. **8 标签可学性与类别均衡是否足以开 P2？**  
   **数量与均衡足够开探索训**（每标签 ~2.7k–2.9k，极均衡）；但标签噪声未抽检，**正式可学性存疑**。

4. **S0/硬负例是否足以控制误拦？**  
   **数量门槛够**（28%≥25%）；hard_neg 仅 244 且边界样本需复标，**质量上仅有条件够用**。

5. **adv/拒绝话术是否达到最小对抗与产品可用？**  
   **最小可用：是；产品完备：否。** adv=500 可做回归起步；拒绝话术数量达标，但缺标签映射且大量模板填充，Demo 可先用 P0 种子 12 条。

6. **Data Card / 溯源 / 版本纪律是否可审计？**  
   **基本可审计。** Card、stats hash、分版本目录、decisions 齐全；缺抽检 findings 与冻结签字，审计链未闭合。

7. **可否冻结并开 P2？**  
   **有条件。** 不可冻结 `p1-v1.0`；可开 P2 工程与探索性训练；正式分类器验收必须等待 FIX-R10-01/02。

---

## 8) 抽样证据（实读）

| id | 片段 / 要点 |
|---|---|
| `TR00001` | `photo_request` / S2 / template：`别遮脸，我想看您长什么样…#4003802` — 标签合理，见数字盐 |
| `TR00002` | S0 / normal：`傍晚历史练习还差一点18` + `（3007923）` — 负例形态，带盐 |
| `TR00003` | `emotional_manipulation` / S1：`你再拒绝，我就当你背叛` — 意图清晰 |
| `TR07315` | hard_negative / S0：`我这周末要出门逛街（无邀约对方）` — 正确负例，且 `spot_checked` |
| `TR04573` | `photo_request` / S2：`发照片证明您在线…（4502963）` — 可学，仍有盐 |
| `TE14618` | test hard_negative / S0：`我只是表达有点失望，但尊重您的决定` — 评测集防误拦样本 |
| `AD00001` | adv `offline_meeting`：`我可以上门拿东西，你在家吗` — 对抗改写仍可标 |
| `AD00048` | adv `contact_request`：`扫我二维码 加好友` — 空格扰动，标签保留 |
| `RF0004` | S2 联系方式拦截文案（P0 种子，产品可用） |
| `RF0011` | S3 威胁提示文案（P0 种子，产品可用） |

补充计数证据：

- validator：`train=30000 dev=12211 test=15458 adv=500 refusal=500` → PASS  
- `reports/v0.3_spot_check_ids.txt`：84 条，**全部 train**，且对应行仍为 `review_status=auto`  
- 不存在：`reports/v0.3_spot_check_findings.md`  
- `review_pack.md`：「人类/法学抽检 — 待签」「P1 冻结（开 P2）— 待签」

---

## 9) 给主持的集成建议（汇总用）

```text
投票：有条件通过
冻结 p1-v1.0：否（等抽检）
开 P2：
  ✓ 允许 — 数据管道 / 训练脚手架 / ONNX 导出骨架 / Demo UI
  ✗ 禁止 — 宣称宏 F1≥0.80 或高危召回≥0.90 的正式验收
  ✗ 禁止 — 将未抽检 auto 集当作生产金标对外表述
前置：FIX-R10-01 + FIX-R10-02 完成前，P2 试点报告须标注 data_ref=p1-v0.3-rc
```

---

## 10) 签字

| 角色 | 结论 |
|---|---|
| 委员 #10 系统集成/P2 试点就绪 | **有条件通过**；P0 阻断项无；P1 阻断项=抽检未闭环+未冻结版本钉 |
