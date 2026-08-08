# P1 十人评审会意见书 — 委员 #1（法学/未成年人网络保护）

- 评审对象：`p1-v0.3`（train=30000 / eval=28169 / refusal=500 / adv=500）
- 委员角色：法学 / 未成年人网络保护
- 焦点：数据红线、对外表述、责任边界、law/合规措辞
- 审阅日期：2026-08-08
- 依据：`BRIEF.md`、`review_pack.md`、`数据合规规范.md`、`data_card.md`、`pipeline.md`、`decisions.md`、`schema/sample.schema.json`、`reports/v0.3_stats.json`、`reports/spot_check_plan.md`、上游 `p0/runtime_redlines.md` / `labels.md` / `annotation_guide.md` / `law_mapping_notes.md`
- 实操：仓库实读 + `validate_p1.py` PASS 复核 + `datasets/v0.3` 分层抽样 ≥15 条 + 全库红线关键词扫描

---

## 1) 投票

**有条件通过**

## 2) 一句话结论

合成红线与隔离纪律在文档与抽样层面成立，未见真实未成年私密/性化内容；但法学抽检签字与 ≥95% 门禁尚未闭环，故可开 P2 试点/rc，不得无条件冻结为已合规完成的 `p1-v1.0`。

## 3) 阻断项（FIX）

| ID | 严重级别 | 问题 | 可执行 FIX（路径） |
|---|---|---|---|
| L-B1 | **P1** | 人工/法学分层抽检未完成；`review_pack.md` 与 `spot_check_plan.md` 签字位均为空，绝大多数样本 `review_status=auto`，尚不构成可对外主张的“抽检达标证据链” | 按 `reports/spot_check_plan.md` 对 v0.3 完成 ≈288 条分层抽检；产出 `reports/v0.3_spot_check_findings.md`；正确率 ≥95% 且无红线违规后，更新 `review_pack.md` / `数据合规规范.md` 签字位，并将抽中样本 `review_status` 升为 `spot_checked` |
| — | **P0** | （本次未发现）全库关键词扫描 0 命中；抽样未见真实私密聊天、儿童性化/色情描写、成人业务语料混入；`source=seed_golden` 未进入 train | — |

> 说明：L-B1 阻塞的是 **无条件冻结 p1-v1.0 / 对外合规完成表述**，不构成“必须驳回整包、禁止一切 P2 试点准备”的红线级否决。

## 4) 开放项（不阻塞规模门禁）

| ID | 事项 | 建议 |
|---|---|---|
| L-O1 | `p0/law_mapping.csv` 仍为义务对齐草稿 | 维持 `law_mapping_notes.md` 纪律：对外须注明“研究草案”；未 `reviewed` 前不得写成合规证明 |
| L-O2 | 模板扩写文本含编号噪声（如 `回我一句就行（7504179）`） | 属可学性/同质化议题，交 NLP/红队；法律上不构成私密原文混入 |
| L-O3 | `photo_request` 需持续盯防“性化漂移” | 抽检清单中对该标签保持配额；继续坚持 `labels.md`：“只建模索要个人照片行为，不做色情内容” |
| L-O4 | 拒绝话术多为模板生成 | 产品可用性交给 T&S；法学侧仅要求话术不出现监管认证/法定义务已满足类表述（当前样本未见） |
| L-O5 | P1-O2 外部公开许可语料 | 同意 `decisions.md` 暂缓；若引入须先改 Data Card 与许可证审计字段 |

## 5) 对七问的简答

| # | 问题 | 结论 |
|---|---|---|
| 1 | 是否坚持合成红线（无真实未成年私密）？ | **是（就本次实读+抽样+扫描）**。来源枚举仅含 seed/template/paraphrase/combo/normal/hard_negative/adversarial；规范明确禁止真实私密与“授权脱敏原文”捷径；未见成人业务语料。 |
| 2 | train/dev/test/adv 隔离与 golden 不进 train 是否成立？ | **成立**。规范化文本跨 split 交集均为 0；`seed_golden`：train=0 / test=40。 |
| 3 | 8 标签可学性与类别均衡是否足以开 P2？ | **规模与均衡足够开 P2 试点**（每标签 test 正例 ≥1707，validator PASS）。法学不替代算法噪声评估；须以抽检闭环为冻结条件。 |
| 4 | S0/硬负例是否足以控制误拦？ | **门槛达标**（train S0≈28%，另有 hard_negative）。最终误拦风险取决于抽检与 P2 评测，非本次红线否决点。 |
| 5 | adv/拒绝话术是否达到最小对抗与产品可用？ | **达到最小集合**（adv=500、refusal=500）。对抗厚度与话术体验非法学主责；未见违法性或越权认证表述。 |
| 6 | Data Card / 溯源 / 版本纪律是否可审计？ | **基本可审计**：版本目录未原地覆写，schema 含 `source/review_status/annotator/ts`，stats 有 content_hash。缺口是抽检证据尚未落盘。 |
| 7 | **可否冻结并开 P2？** | **有条件**：可开 P2 试点/rc；**不可**在抽检签字完成前冻结为“合规完成”的 `p1-v1.0`，亦不可对外称已满足全部数据合规法定义务或已获监管认证。 |

## 6) 抽样证据（实读）

本次法学红线抽检 **17 条**（含 threat / offline_meeting / normal / photo / privacy / test / adv），并辅以全库敏感词扫描（色情/性化/性剥削等）**0 命中**、类 PII 正则 **0 命中**。

| 桶 | id | labels / level | text 片段 | 红线判断 |
|---|---|---|---|---|
| train_threat | `TR23668` | threat / S3 | “不配合就把聊天记录发给全班…” | 合成胁迫话术；非真实私密原文 |
| train_threat | `TR06412` | threat / S3 | “再不配合，后果很严重…” | 类型化威胁；无性化描写 |
| train_threat | `TR12741` | threat / S3 | “拒绝的话，后果你自己想” | 同上 |
| train_offline | `TR20681` | offline_meeting / S3 | “明天，晚上公园见一面聊啊” | 合成线下约见；无逼真门牌/真实住址 |
| train_offline | `TR18974` | offline_meeting / S3 | “我去接你放学” | 类型化接送诱导 |
| train_offline | `TR19361` | offline_meeting / S2 | “我去您家附近接你” | 模糊“附近”，未出现可识别住址组合 |
| train_normal | `TR14913` | [] / S0 | “周末，刚才音乐练习有点难” | 正常闲聊；标签空 |
| train_normal | `TR23480` | [] / S0 | “上午语文复习完成了” | 正常学习场景 |
| train_normal | `TR00781` | [] / S0 | “昨天历史小测完成了” | 同上 |
| train_photo | `TR18629` | photo_request / S2 | “想收藏你一张生活照” | 个人照片索取；非色情/儿童性化 |
| train_photo | `TR25783` | photo_request / S2 | “把相册近期自己拍的照片挑一张发来” | 同上 |
| train_privacy | `TR29721` | privacy_request / S2 | “你家里今晚谁值班看你” | 合成隐私试探；非真实聊天记录 |
| test_threat | `TE14232` | threat / S3 | “你要是跑，我就追着揭发” | 合成；可进评测 |
| test_offline | `TE00850` | offline_meeting / S3 | “您把地址发我，我上门找你” | 合成上门诱导 |
| adv | `AD00243` | offline_meeting / S2 | “我去公交站接您哦” | 对抗改写仍可标注；无红线违规 |
| adv | `AD00128` | offline_meeting / S3 | “明天放学后我 去接你哈” | 空格插入对抗；内容仍为合成 |
| adv | `AD00490` | offline_meeting / S3 | “明天同一时间路口见啊” | 同上 |

补充对照（不计入上表 17，但用于责任边界核验）：

- golden 在 test：`TE00019` “发张自拍我看看呗”（`seed_golden` / photo_request）— 符合 golden→test 纪律。
- hard_negative：`TR01785` “平台内可以加好友”（labels=[] / S0）— 有助于误拦边界，未见私密原文。
- refusal：`RF0166` “站外联系方式相关发送已被阻止” — 产品提示，未宣称监管认证。

### 隔离与来源核验（脚本实读摘要）

```text
golden_in_train = 0
golden_in_test  = 40
split 规范化文本交集（train/dev/test/adv 两两）= 0
validate_p1.py v0.3 → PASS
train review_status: auto≈29931 / spot_checked≈69  （抽检远未覆盖计划量）
```

## 7) 法学专项意见（对外表述 / 责任边界）

### 7.1 数据红线

- 上位红线（`p0/runtime_redlines.md`）与 P1《数据合规规范》一致且可执行：禁止真实未成年私密、禁止“授权脱敏原文”捷径、禁止成人业务混用。
- `photo_request` 边界在 `labels.md` 已正确限缩为行为风险，禁止色情建模——与《未成年人网络保护》语境下的内容禁区对齐。
- **本次未见 P0 红线违规**；但“未见”≠“已完成法定审计”，须靠抽检签字闭环。

### 7.2 对外表述纪律（保持）

《数据合规规范》§6 表述正确，评审要求继续强制执行：

- **可说**：“训练与评测使用合成数据，未使用真实未成年私密聊天”
- **不可说**：“已满足全部数据合规法定义务 / 已通过某监管认证”（除非另有证书）
- `law_mapping.csv` 仅为草案辅助，**不单独构成合规证明**

当前 `review_pack.md` / `data_card.md` 总体遵守上述边界；在人类法学抽检签字前，任何对外材料不得把 v0.3 写成“已合规验收完成”。

### 7.3 责任边界

| 主张 | 是否允许（现阶段） |
|---|---|
| 合成数据生产、隔离与版本可追溯 | 可（有 Data Card / decisions / stats hash） |
| 已完成 ≥95% 抽检并冻结 p1-v1.0 | **否**（签字位空） |
| 系统已满足全部未成年人网络保护数据义务 | **否** |
| 可启动 P2 模型训练试点（rc 数据） | **有条件可**（须在实验/内部文档标明 `p1-v0.3` 未冻结） |
| 运行时审计存原文 | **否**（继续遵循 runtime_redlines：仅 hash） |

---

## 8) 委员签字

| 项目 | 内容 |
|---|---|
| 角色 | 法学/未成年人网络保护（委员 #1） |
| 投票 | 有条件通过 |
| 对第 7 问 | 有条件：可开 P2；不可无条件冻结 |
| 日期 | 2026-08-08 |
