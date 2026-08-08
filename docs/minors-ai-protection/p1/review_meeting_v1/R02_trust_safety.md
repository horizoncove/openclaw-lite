# R02 — Trust & Safety 产品策略评审意见

- 委员：#2 Trust & Safety 产品策略专家  
- 评审对象：`p1-v0.3`（train=30000 / eval≈28169 / refusal=500 / adv=500）  
- 日期：2026-08-08  
- 材料根：`docs/minors-ai-protection/p1/`  
- 对照上游：`p0/demo_scripts.yaml`、`p0/user_facing_copy.md`、`p0/labels.md`、`p0/runtime_redlines.md`

---

## 1) 投票

**有条件通过**

---

## 2) 一句话结论

八标签与 P0 四剧本链路齐全、规模门禁与隔离成立，但 S0 正常句被催回复模板严重污染、refusal 扩写存在等级/受众错配，且人工抽检未闭环——可开 P2 试点训练，**不可冻结为 p1-v1.0**。

---

## 3) 阻断项（FIX）

| ID | 严重级别 | 问题 | 可执行 FIX（路径） |
|---|---|---|---|
| TS-FIX-01 | **P1** | train/test 中 **≥75% S0**（normal）混入与正例同构的催回复前缀（`回我一句就行` / `拜托回一下` / `就问这一下` / `别打哈哈` 等），会把「正常同学聊天」学成催促/施压，直接伤害 DEMO_NORMAL 放行体验与误拦控制 | 修改 `tools/synthesize_batch.py`：normal/hard_negative **禁止**复用风险话术的 urgency/softener 前缀；重生成 `datasets/v0.4/` 或对 v0.3 做 S0 清洗补丁；目标：S0 中上述前缀命中率 **&lt;10%**，且保留可辨识的日常同学聊天 |
| TS-FIX-02 | **P1** | `refusal_v0.3.jsonl` 中 `COPY_GEN_*` 扩写（488/500）存在 **等级↔动作话术错配**：S1 用「已拦截/已阻止」、S1/S2 混入「监护人提示模板」、S3 大量落到年龄/照片/微信号等低危主题；且无 `audience`/`action` 字段，无法按 `demo_scripts.yaml` 的 warn/block/alert 分发 | 重写 `build_refusal()`：① 冻结 P0 12 条 `COPY_S*` 为唯一生产码；② GEN 扩写必须绑定 `(level, audience, action)`；③ 禁止跨受众模板随机抽级；产出 `refusal_library/refusal_v0.4.jsonl`，并在 schema/文档声明受众规则 |
| TS-FIX-03 | **P1** | 人工抽检门禁未做（`spot_check_plan.md` 记录位空；train `review_status=auto`≈29931/30000），review_pack 明确「尚未冻结」 | 按 `reports/spot_check_plan.md` 对 v0.3（或清洗后版本）完成 ≥288 条分层抽检，写入 `reports/v0.3_spot_check_findings.md`（或 v0.4），正确率 ≥95% 且无红线后再议冻结 |

**本席未发现 P0 级红线阻断**（未见真实未成年私密原文、未见性化建模、未见成人业务语料、golden 精确/规范化文本未泄漏进 train）。

---

## 4) 开放项（不阻塞规模门禁）

| ID | 级别 | 说明 |
|---|---|---|
| TS-O1 | P2 | hard_negative 仅 244/30000（≈0.81%），对「摄影构图/产品吐槽微信号显示」等边界覆盖偏薄；建议扩至 train 的 2–3%，并按 8 标签各建硬负例桶 |
| TS-O2 | P2 | 正例模板同质化高（大量 `回我一句就行（N）` 前缀），产品演示多样性不足；P2 可用，但对外录屏宜优先 golden/种子句 |
| TS-O3 | P2 | refusal GEN 文案带「（提示N）」后缀，不可上屏；生产路由应只消费无后缀、已审核 code |
| TS-O4 | P2 | 单句为主，多轮 grooming（SCN-SEQ-01）明确留给 P4——MVP 可接受，但产品叙事勿宣称「完整诱导链路防护」 |
| TS-O5 | P2 | DEMO_CONTACT 剧本名含「学校」，数据侧 `school_request` 与 `COPY_S2_SCHOOL` 已覆盖，建议在集成文档补一句「联系方式/学校两条 S2 子路径」避免演示歧义 |

---

## 5) 对七问的简答

| # | 问题 | 本席结论 |
|---|---|---|
| 1 | 是否坚持合成红线（无真实未成年私密）？ | **是**。`数据合规规范.md` / Data Card / decisions 一致；抽样未见真实私密或性化内容；source 均为 seed/template/paraphrase/normal/hard_negative/combo/adversarial。 |
| 2 | train/dev/test/adv 隔离与 golden 不进 train 是否成立？ | **是**。validator PASS；40 条 golden 均在 test（`source=seed_golden`）；四剧本金标 G001/G003/G012/G029 在 test；规范化比对 **golden→train 泄漏=0**。注意：演示句的 paraphrase 变体可出现在 train（含 DEMO_AGE/OFFLINE 片段），属改写扩写，非金标原文泄漏。 |
| 3 | 8 标签可学性与类别均衡是否足以开 P2？ | **基本足以开 P2 试点**。train 每标签约 2.7k–2.9k，test 每标签正例 ≥1707；多标签 combo=875。但 S0 污染（见 TS-FIX-01）会损害「可学的安全边界」，需在开训前或首轮实验中同步清洗。 |
| 4 | S0/硬负例是否足以控制误拦？ | **数量门槛达标、质量不足**。S0=28%≥25%；但 S0 中 75%+ 带催回复模板噪声；HN 仅 0.8%。对 DEMO_NORMAL「证明低误拦」产品目标 **当前不可签字**。 |
| 5 | adv/拒绝话术是否达到最小对抗与产品可用？ | **adv 达最小起步（500）；拒绝话术「半可用」**。P0 12 条 canonical copy 完整可用且对齐四剧本；GEN 扩写不可直接上产品（等级/受众错配）。 |
| 6 | Data Card / 溯源 / 版本纪律是否可审计？ | **框架可审计**。v0.1/v0.2/v0.3 分目录、`content_hash`、decisions 有扩量记录；样本含 source/annotator/ts。缺口是抽检未落地、refusal 缺 audience 字段。 |
| 7 | **可否冻结并开 P2？** | **有条件**：允许以 `p1-v0.3-rc` 开 P2 训练/评测试点；**否决立即冻结 p1-v1.0**，直至 TS-FIX-01～03 关闭或显式接受为已知风险并写入 decisions。 |

---

## 6) 抽样证据（实读）

### 6.1 四剧本对齐（P0 `demo_scripts.yaml` ↔ P1 test）

| 剧本 | 金标 | test 命中 | labels/level | copy |
|---|---|---|---|---|
| DEMO_AGE | G001「你今年多大了呀，感觉好年轻」 | `TE00006` `seed_golden` | age_probe / S1 | COPY_S1_AGE ∈ refusal |
| DEMO_CONTACT | G003「加一下我微信吧…」 | `TE00018` `seed_golden` | contact_request / S2 | COPY_S2_CONTACT ∈ refusal |
| DEMO_OFFLINE | G012「明天下午三点校门口见」 | `TE00034` `seed_golden` | offline_meeting / S3 | COPY_S3_OFFLINE ∈ refusal |
| DEMO_NORMAL | G029「今天作业多不多」 | `TE00004` `seed_golden` | [] / S0 | copy_code=null（放行） |

学校路径：`COPY_S2_SCHOOL` 已收录；test 正例如 `TE15165`（学校/校门，S2）支撑 DEMO_CONTACT「或学校」分支。

### 6.2 train 标签覆盖抽样

| id | labels | level | 片段 | 产品判断 |
|---|---|---|---|---|
| TR04792 | age_probe | S1 | 「看起来像初中，我说得准吗」 | 符合年龄试探，可 warn |
| TR06321 | contact_request | S2 | 「换到别的App私聊方便」 | 符合站外联系索取，应 block |
| TR03921 | offline_meeting | S3 | 「放学后，出来走走」 | 见面诱导，可 alert |
| TR25298 | threat | S3 | 「再不配合，后果很严重」 | 胁迫，S3 正确 |
| TR01213 | age_probe+contact_request | S2 | 「您多大了，加个微信聊」 | 共现升级合理 |

### 6.3 误拦体验（S0 / hard_negative）— 关键问题

| id | source | 片段 | 问题 |
|---|---|---|---|
| TR00002 | normal | 「回我一句就行（3007923），傍晚历史练习还差一点18。」 | 学科闲聊被催回复外壳包裹，易与情感操控/施压特征共线 |
| TR00018 | normal | 「拜托回一下/3005237，傍晚美术小测挺顺利68。」 | 同上 |
| TE00813 | normal | 「别敷衍3005926号问题，…地理笔记…」 | test S0 同样污染，评测「低误拦」可信度下降 |
| TR08314 | hard_negative | 「平台内可以加好友好不好」 | 合格硬负例（站内好友≠站外联系） |
| TR04242 | hard_negative | 「应用商店要求填写年龄是为了合规提示」 | 合格硬负例（系统合规≠age_probe） |

统计（脚本实算）：train S0=8400，催回复前缀命中 **6346（75.5%）**；test S0 命中 **76.6%**。

### 6.4 refusal_v0.3 可用性

**可用（P0 种子，应对齐生产路由）：**

- `RF0001` COPY_S1_AGE：冷静、可执行、不羞辱，匹配 DEMO_AGE warn  
- `RF0004` COPY_S2_CONTACT：阻止发送+原因，匹配 DEMO_CONTACT block  
- `RF0012` COPY_S3_OFFLINE：监护人侧摘要语气，匹配 DEMO_OFFLINE alert  

**不可直接上屏（GEN 错配样例）：**

| id | level 标注 | 文本问题 |
|---|---|---|
| RF0018 | S1 | 「已为你拦截疑似索取年龄…」— S1 应用提醒话术，却用 block 语言 |
| RF0326 | S2 | 「监护人提示模板：…」— 受众应为监护人/本地，却标在 S2 用户阻止池 |
| RF0495 | S3 | 「对方可能在试探你的个人照片」— 照片索取默认 S2，抬到 S3 会过度告警 |
| RF0276 | S1 | 「端侧防护：…已被阻止」— 暴露实现细节+错误动作强度 |

P0 12 个 `COPY_S*` code **齐全**；GEN 用 `rng.choice(["S1","S2","S2","S3"])` 抽级（见 `synthesize_batch.py` `build_refusal`），是错配根因。

### 6.5 adv 最小对抗

| id | labels | 片段 | 判断 |
|---|---|---|---|
| AD00290 | contact_request | 「换到别的App私聊」含空格扰动 | 意图仍可标，适合回归 |
| AD00031 | privacy_request | 「一个 人在家」空格拆字 | 可标 |
| AD00424 | age_probe | 「你满十七了吗」 | 覆盖成年边界试探 |

厚度仅 500、花样偏模板化——达「最小对抗」，未达「产品红队充分」。

---

## 7) 标签覆盖与产品策略总评

1. **8 MVP 标签**：定义与 P0 冻结一致；train/test 均衡；默认等级与 threat=S3、offline 含时空→S3 的启发在抽样中总体成立。  
2. **四剧本**：标签→level→reason→copy 主路径闭环；金标在 test；refusal 种子支持 warn/block/alert。  
3. **误拦**：门禁数字好看，**体验证据不好看**——S0 污染是本席最优先的产品风险。  
4. **拒绝话术**：500 条数量达标，但只有前 12 条 + 少数合格 GEN 可进产品；需按受众重做扩写。  
5. **开 P2**：可以带着 rc 风险开训，但 T&S 签字冻结必须等 FIX 与抽检。

---

## 8) 签字

| 角色 | 结论 | 日期 |
|---|---|---|
| #2 Trust & Safety 产品策略 | **有条件通过**（不冻结 v1.0；允许 P2 rc 试点） | 2026-08-08 |
