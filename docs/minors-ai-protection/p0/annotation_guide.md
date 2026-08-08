# P0 标注手册 v1

适用：合成样本标注、金标复核、P1 数据生产前培训。  
原则：**宁可 `needs_review`，不要漏标高危；禁止使用真实未成年私密原文。**

---

## 1. 标注流程（每人每条）

```text
1) 通读整句（MVP 单句；若给相邻句可一并看）
2) 判断是否存在任一 MVP 标签
3) 可多标；拿不准标 needs_review
4) 按 severity 默认等级 + 升级规则推断 expected_level
5) 填写 reason_codes
6) 自检：是否误把安全教育/系统文案标成正例
```

产出字段（P1 将入库）：

```text
id, text, labels[], expected_level, reason_codes[], notes, annotator, ts
```

---

## 2. 决策树（快速）

```text
是否出现伤害/曝光/勒索恐吓？ → 是 → 必标 threat（S3）
是否约线下见面/接送？ → 是 → offline_meeting
是否要微信电话等站外联系？ → 是 → contact_request
是否要学校/班级/放学路线？ → 是 → school_request
是否要个人照片？ → 是 → photo_request
是否要住址/独居/详细作息？ → 是 → privacy_request
是否试探年龄年级是否未成年？ → 是 → age_probe
是否用愧疚孤立施压？ → 是 → emotional_manipulation
都不是 → S0 或 needs_review
```

---

## 3. 优先级与冲突（摘要）

完整矩阵见 `conflict_matrix.md`。

| 冲突 | 裁决 |
|---|---|
| contact vs privacy | 要的是微信号/电话 → contact；要的是住址作息 → privacy；都有则双标 |
| school vs offline | 双标；出现接送/校门口等 → 等级可到 S3 |
| photo vs 题目照片 | 个人肖像 → photo；题目/风景 → 不标 |
| emotional vs 正常安慰 | 有控制/要挟交换条件 → emotional；纯粹关心 → 不标 |
| threat vs 教学示例 | 明确“这是反面教材/课程例”且无对用户施压 → 通常不标或 needs_review |

---

## 4. 一致性要求

- 培训后先标 **金标集**（`golden/golden_set.jsonl`），个人与金标 **标签宏 F1 ≥ 0.85** 才可进入量产标注  
- 每 100 条抽 10 条双人复标，不一致由 Owner 裁决并写入 `decisions.md`  
- 禁止凭“感觉对方很危险”但无文本证据贴高危标签  

---

## 5. 禁止事项

```text
✗ 粘贴真实未成年私密聊天
✗ 编写违法性内容或儿童性化描述
✗ 为提高召回伪造极端色情样本
✗ 擅自新增第 9 个 MVP 标签
✗ 把成人业务语料混入本项目
```

---

## 6. 通过标准（标注员上岗）

```text
□ 读完本手册与 labels/severity
□ 金标测验通过
□ 能独立解释 U01–U09
□ 知晓数据红线
```
