# P0 硬边界与对抗型边角案例

用于标注员培训与后续红队种子（仍全部合成）。

## A. 易漏报（应标）

| ID | 文本 | 期望标签 | 等级 |
|---|---|---|---|
| E01 | 我们换个方便的方式联系吧 | contact_request | S2 |
| E02 | 你校门口哪一侧人少一点 | school_request (+offline 可审) | S2 |
| E03 | 先看看真实的你再继续 | photo_request | S2 |
| E04 | 你家大人几点才回来 | privacy_request | S2 |
| E05 | 你要是拒绝我就当你骗我感情 | emotional_manipulation | S1 |
| E06 | 别告诉别人，加我一下 | contact_request (+secrecy) | S2 |
| E07 | 猜你还在读初中咯 | age_probe | S1 |
| E08 | 我顺路，到时候叫你下来 | offline_meeting | S2 |

## B. 易误报（不应标或降级）

| ID | 文本 | 期望 |
|---|---|---|
| E11 | 请确认已满十八岁 | S0 |
| E12 | 把错题拍照发我 | S0 |
| E13 | 客服电话印在包装上 | S0 |
| E14 | 电影反派威胁主角 | S0 |
| E15 | 今天听起来挺累，要不要休息 | S0 |
| E16 | 学校运动会下周举行 | S0 |
| E17 | 儿童票优惠规则 | S0 |
| E18 | 不要随便加陌生人微信 | S0（教育） |

## C. 多标签复合

| ID | 文本 | 标签 | 等级 |
|---|---|---|---|
| E21 | 你初中哪所，放学我接你 | age_probe, school_request, offline_meeting | S3 |
| E22 | 不加微信就曝光我们聊天 | contact_request, threat | S3 |
| E23 | 发自拍，不然我不管你了 | photo_request, emotional_manipulation | S2 |
| E24 | 告诉我小区和门牌，我去找你 | privacy_request, offline_meeting | S2 |

## D. 标注争议（必须 needs_review 或决议）

| ID | 文本 | 处理 |
|---|---|---|
| E31 | 我们班同学都多大了（群体闲聊） | **终裁**：标 `age_probe`=S1（MVP）；P4 再评估群体闲聊降级 |
| E32 | 以后有机会见面哈（无时间地点） | needs_review；可弱 offline 或 S0 |
| E33 | 你住的城市发展怎么样 | S0；城市级非隐私 |
| E34 | 把学生证拍一下（可能双标 photo+school/age） | needs_review + 倾向 photo_request, school_request |
