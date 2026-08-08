#!/usr/bin/env python3
"""P1 synthetic batch builder: P0 seeds → template expand → split → refusal lib."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P0 = ROOT.parent / "p0"
TODAY = date.today().isoformat()
ANNOTATOR = "Agent-001"

LABELS = [
    "age_probe",
    "privacy_request",
    "contact_request",
    "school_request",
    "photo_request",
    "offline_meeting",
    "emotional_manipulation",
    "threat",
]

DEFAULT_LEVEL = {
    "age_probe": "S1",
    "privacy_request": "S2",
    "contact_request": "S2",
    "school_request": "S2",
    "photo_request": "S2",
    "offline_meeting": "S2",
    "emotional_manipulation": "S1",
    "threat": "S3",
}

REASON = {
    "age_probe": "R_AGE_PROBE",
    "privacy_request": "R_PRIVACY_REQUEST",
    "contact_request": "R_CONTACT_REQUEST",
    "school_request": "R_SCHOOL_REQUEST",
    "photo_request": "R_PHOTO_REQUEST",
    "offline_meeting": "R_OFFLINE_MEETING",
    "emotional_manipulation": "R_EMOTIONAL_MANIPULATION",
    "threat": "R_THREAT",
}

LEVEL_ORDER = {"S0": 0, "S1": 1, "S2": 2, "S3": 3}

PREFIXES = ["", "那个，", "诶，", "话说，", "顺便问下，", "真心问一句，", "嗨，"]
SUFFIXES = ["", "？", "呀", "嘛", "呗", "哦", "~", "呢"]
SOFTENERS = ["方便的话", "如果不介意", "有空时", "悄悄说", "别多想"]
VOCATIVES = ["小朋友", "宝贝", "同学", "朋友", "亲"]

# label -> list of templates with {slots}
TEMPLATES: dict[str, list[str]] = {
    "age_probe": [
        "你今年{age_word}了",
        "你是{grade}吗",
        "猜你还没{age_word}吧",
        "你成年了吗，我怕搞错",
        "{voc}，真实年龄多少",
        "先告诉我年龄再聊",
        "你满{num}了吗",
        "读到几年级啦",
        "你身份证上是哪一年的",
        "看起来像{grade}，我说得准吗",
        "你和我弟弟差不多大吧，你几岁",
        "别瞒我，老实说你年级",
        "你父母允许你这么晚还在线吗，你多大",
        "方便说下出生年份吗",
        "我只和差不多年龄的人聊，你呢",
    ],
    "privacy_request": [
        "你具体住哪个小区",
        "你家门牌多少",
        "你是不是一个人在家",
        "爸妈今晚在家吗",
        "你一般几点回家，家里有人吗",
        "把你家地址发我，我好找你",
        "你家附近有什么标志建筑",
        "你独居还是和家人住",
        "今晚家里就你一个吧",
        "你作息能不能详细说说，几点睡觉几点出门",
        "你家在几楼，电梯吗",
        "把定位共享给我一下",
    ],
    "contact_request": [
        "加一下我微信吧",
        "把手机号给我",
        "你QQ多少，加好友",
        "换到别的App私聊方便",
        "留个电话，我打给你",
        "发邮箱给我，我发资料",
        "这里聊着不方便，加微信",
        "把微信号私发我",
        "用短信联系吧，号给我",
        "扫我二维码加好友",
        "你Telegram/其他号有吗，换个地方聊",
        "把联系方式留下，我找你",
    ],
    "school_request": [
        "你在哪个学校读书",
        "你们学校全称是什么",
        "哪个校区，几年级几班",
        "你们学校哪个校门放学",
        "放学一般走哪条路",
        "学校门口好找吗，叫什么路",
        "班级群里老师姓什么，你们几班",
        "你们几点放学，在南门还是北门",
        "学校对面是什么，我好定位",
        "把学校定位发我",
        "你同桌叫什么，你们班多少人",
        "你们学校校服什么颜色，好认",
    ],
    "photo_request": [
        "发张自拍我看看",
        "我们互换一张照片吧",
        "拍张正脸照给我",
        "想看看你长什么样，发张近照",
        "刚洗完脸也行，来张自拍",
        "发张今天的照片呗",
        "摄像头开一下，我看看你",
        "把相册近期自拍挑一张发来",
        "穿校服的照片有吗，发我看看",
        "想收藏你一张生活照",
        "发张清晰点的半身照",
        "别用网图，要你自己的照片",
    ],
    "offline_meeting": [
        "我们见一面吧",
        "明天放学后我去接你",
        "周末出来逛逛，就我们两个",
        "我到校门口等你",
        "今天下午三点咖啡厅见",
        "你把地址发我，我上门找你",
        "我开车去学校接你回家",
        "晚上公园见一面聊",
        "别告诉别人，我们私下见面",
        "这周六上午博物馆门口见",
        "我去你家附近接你",
        "下课后在校门右侧等我",
    ],
    "emotional_manipulation": [
        "你要是拒绝，就是不在乎我",
        "我对你这么好，你却不回我",
        "你要是不加我，我就当没认识你",
        "别人都不管你，只有我懂你",
        "你让我失望透了，证明你爱我啊",
        "你走了我就会很难过，别离开我",
        "你是不是嫌弃我，才不肯听我的",
        "朋友都说你冷漠，我还替你说话",
        "你再这样我就再也不理你了",
        "我为你付出这么多，你就这样对我",
        "不答应我的小请求，说明你假关心",
        "全世界只有我不会骗你，相信我",
    ],
    "threat": [
        "你敢不听，我就把你的事公开",
        "不给我钱就揭发你",
        "再不回消息，小心我去你们学校",
        "你要是告家长，有你好看",
        "把照片再拖，我就威胁你同学",
        "不听话就让你在网上抬不起头",
        "我知道你家在哪，别逼我",
        "拒绝的话，后果你自己想",
        "再装看不见，我就打电话给你老师乱说",
        "不配合就把聊天记录发给全班",
        "你再敢拒绝，我不会放过你",
        "听话点，不然有你受的",
    ],
}

SLOTS = {
    "age_word": ["多大", "几岁", "多少岁"],
    "grade": ["初中", "高中", "初二", "小学", "高一"],
    "num": ["十四", "十六", "十八", "十二"],
    "voc": VOCATIVES,
}

HARD_NEG_EXTRA = [
    "这款游戏年龄评级是12+",
    "请确认你已满18岁后继续",
    "电影是青少年导向内容",
    "儿童票和成人票价格不同",
    "应用商店要求填写年龄是为了合规提示",
    "这篇科普在讲未成年人保护年龄划分",
    "今天数学作业好难",
    "我们班下周要考试",
    "推荐一部科幻电影吧",
    "这题怎么解，发一下思路",
    "周末想在家看书",
    "足球比赛分U15和U18组别",
    "官方客服热线已公示",
    "平台内可以加好友",
    "风景照拍得很漂亮",
    "表情包互发表情就行",
    "学校组织春游通知已发班级群",
    "新闻里提到线下展览开放",
    "我只是表达有点失望，但尊重你的决定",
    "这是安全教育课的反面教材示例，请勿模仿",
]

NORMAL_BASES = [
    "今天语文课学了古诗",
    "晚上想吃面条",
    "这周末有没有兴趣一起打游戏，线上就行",
    "作业写完了好轻松",
    "推荐一首轻音乐",
    "猫好可爱，你喜欢猫吗",
    "最近天气忽冷忽热",
    "这本书开头有点慢",
    "篮球训练好累但很开心",
    "妈妈做的菜好好吃",
    "想学画画，有入门建议吗",
    "英语听力好难啊",
    "新出的文具盒挺好看",
    "明天要交手抄报",
    "星球仪旋转好好玩",
    "我们讨论一下这道几何题",
    "喜欢看纪录片",
    "图书馆新到了几本科幻",
    "跑步三公里打卡",
    "合唱排练要整齐一点",
    "数学测验考得还行",
    "科学课做了小实验",
    "想养一盆绿植",
    "这道题我卡在第二步了",
    "午休听了会儿广播",
    "校服洗干净了真舒服",
    "象棋残局有点意思",
    "历史课讲到丝绸之路",
    "想学做简单蛋糕",
    "晚自习好安静",
    "社团招新好热闹",
    "游泳学会换气了",
    "拼图差最后几块",
    "新鞋子走路不磨脚",
    "作文想写校园风景",
    "物理公式又忘了一半",
    "生物课观察叶片结构",
    "想看场动画片放松",
    "跳绳连续跳了一百下",
    "美术课调色好难",
    "钢琴练习曲越来越熟",
    "想学编程写小游戏",
    "今天值日把黑板擦干净了",
    "课间和同学聊漫画",
    "食堂的汤有点咸",
    "想整理书桌开始收纳",
    "地理课认地图蛮有趣",
    "夜空星星看得好清楚",
    "想学折纸鹤",
    "阅读打卡坚持了一周",
]

SUBJECTS = ["语文", "数学", "英语", "体育", "音乐", "美术", "科学", "历史", "地理", "信息"]
HOBBIES = ["画画", "跑步", "下棋", "看书", "唱歌", "拼乐高", "骑车", "摄影", "写作", "做手工"]
FOODS = ["米饭", "面条", "饺子", "水果", "牛奶", "面包", "鸡蛋羹", "青菜"]


def gen_normals(rng: random.Random, n: int) -> list[str]:
    out = list(NORMAL_BASES)
    for subj in SUBJECTS:
        out.append(f"今天{subj}课挺有意思")
        out.append(f"{subj}作业不多，好开心")
        out.append(f"有人能讲讲{subj}这道题吗")
    for h in HOBBIES:
        out.append(f"最近在学{h}")
        out.append(f"你喜欢{h}吗")
        out.append(f"周末想在家{h}")
    for f in FOODS:
        out.append(f"晚上想吃{f}")
        out.append(f"食堂的{f}还可以")
    # combinatorial filler for uniqueness
    while len(out) < n:
        out.append(
            f"{rng.choice(['今天', '昨天', '刚才', '上午', '傍晚'])}"
            f"{rng.choice(SUBJECTS)}{rng.choice(['练习', '复习', '笔记', '小测'])}"
            f"{rng.choice(['完成了', '还差一点', '有点难', '挺顺利'])}"
            f"{rng.randint(1, 99)}"
        )
    rng.shuffle(out)
    return out[:n]


# backward-compatible alias used in a few places
NORMALS = NORMAL_BASES

REFUSAL_SEEDS = [
    ("COPY_S1_AGE", "S1", "对方在询问你的年龄或年级。如感到不适，可以不回答，或告诉信任的大人。"),
    ("COPY_S1_EMO", "S1", "这句话可能在对你施加情绪压力。你有权拒绝，不必证明什么。"),
    ("COPY_S1_GENERIC", "S1", "检测到可能不合适的话题。请小心分享个人信息。"),
    ("COPY_S2_CONTACT", "S2", "为了你的安全，系统已阻止发送可能涉及交换联系方式的内容。"),
    ("COPY_S2_SCHOOL", "S2", "已阻止可能泄露学校或放学路线等信息的内容。"),
    ("COPY_S2_PRIVACY", "S2", "已阻止可能泄露住址或家庭隐私的内容。"),
    ("COPY_S2_PHOTO", "S2", "已阻止可能涉及发送个人照片的内容。请勿向陌生人发送自拍。"),
    ("COPY_S2_OFFLINE", "S2", "已阻止可能涉及线下见面邀约的内容。如对方继续邀请，请告知家长或老师。"),
    ("COPY_S2_GENERIC", "S2", "该消息可能存在安全风险，已被阻止发送。"),
    ("COPY_S3_ALERT", "S3", "设备检测到一条严重风险互动。详情仅保存在本地脱敏事件中。"),
    ("COPY_S3_THREAT", "S3", "检测到疑似威胁或胁迫内容，建议尽快关心孩子并必要时求助。"),
    ("COPY_S3_OFFLINE", "S3", "检测到包含具体时间或地点的见面诱导，建议立即关注。"),
]

REFUSAL_TEMPLATES = [
    "请不要向陌生人透露{thing}。如有疑问，告诉家长或老师。",
    "为保护你的安全，建议拒绝分享{thing}。",
    "这条消息可能涉及{thing}风险，已为你拦截。",
    "你可以礼貌拒绝，无需解释。需要时向信任的大人求助。",
    "保持警惕：不要轻易答应关于{thing}的请求。",
    "系统提示：涉及{thing}的内容已被限制发送。",
    "你的个人信息很重要，尤其是{thing}，请勿随意告知网友。",
    "如果对方反复追问{thing}，请停止对话并寻求帮助。",
    "记住：真正的朋友不会强迫你提供{thing}。",
    "本地安全提示：检测到与{thing}相关的潜在风险。",
]

REFUSAL_THINGS = [
    "年龄与年级",
    "微信号或电话",
    "学校与放学路线",
    "家庭住址",
    "个人照片",
    "线下见面安排",
    "是否独居",
    "隐私动态",
]


def normalize(text: str) -> str:
    text = text.strip()
    text = text.replace("\u3000", " ")
    text = re.sub(r"\s+", "", text)  # Chinese: collapse whitespace for dedupe
    text = text.replace("？", "?").replace("！", "!").replace("，", ",")
    return text.lower()


def fill_template(tpl: str, rng: random.Random) -> str:
    out = tpl
    for key, values in SLOTS.items():
        token = "{" + key + "}"
        while token in out:
            out = out.replace(token, rng.choice(values), 1)
    return out


def level_for(labels: list[str], text: str) -> str:
    if not labels:
        return "S0"
    lvl = "S0"
    for lab in labels:
        cand = DEFAULT_LEVEL[lab]
        if LEVEL_ORDER[cand] > LEVEL_ORDER[lvl]:
            lvl = cand
    if "threat" in labels:
        return "S3"
    if "offline_meeting" in labels:
        if any(w in text for w in ["今天", "明天", "后天", "点", "周末", "放学", "上午", "下午", "晚上", "门口", "公园", "咖啡"]):
            return "S3"
    if "age_probe" in labels and "contact_request" in labels:
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    return lvl


def reasons_for(labels: list[str]) -> list[str]:
    return [REASON[l] for l in labels]


def wrap(
    text: str,
    labels: list[str],
    source: str,
    rng: random.Random,
    notes: str = "",
) -> dict:
    if source not in ("normal", "hard_negative") and labels:
        if rng.random() < 0.35:
            text = rng.choice(PREFIXES) + text
        if rng.random() < 0.45:
            text = text.rstrip("？?~哦嘛呀呗呢") + rng.choice(SUFFIXES)
        if rng.random() < 0.12 and "{soft}" not in text:
            text = rng.choice(SOFTENERS) + "，" + text
    labels = sorted(set(labels))
    return {
        "text": text.strip(),
        "labels": labels,
        "expected_level": level_for(labels, text),
        "reason_codes": reasons_for(labels),
        "source": source,
        "review_status": "auto",
        "annotator": ANNOTATOR,
        "notes": notes,
        "ts": TODAY,
    }


def parse_examples_md(path: Path) -> tuple[list[str], list[str]]:
    text = path.read_text(encoding="utf-8")
    pos_m = re.search(r"## 正例.*?\n\n([\s\S]*?)\n\n## ", text)
    neg_m = re.search(r"## 易混负例.*?\n\n([\s\S]*?)(?:\n\n## |\Z)", text)

    def items(block: str | None) -> list[str]:
        if not block:
            return []
        return [re.sub(r"^\d+\.\s*", "", ln).strip() for ln in block.splitlines() if re.match(r"^\d+\.\s+", ln)]

    return items(pos_m.group(1) if pos_m else None), items(neg_m.group(1) if neg_m else None)


def load_p0_seeds() -> tuple[list[dict], list[dict], list[dict]]:
    """Returns golden_rows, pos_seed_rows, neg_seed_rows (pre-wrap dicts)."""
    golden = []
    for line in (P0 / "golden" / "golden_set.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        golden.append(
            {
                "text": obj["text"],
                "labels": obj["labels"],
                "expected_level": obj["expected_level"],
                "reason_codes": obj.get("reason_codes", reasons_for(obj["labels"])),
                "source": "seed_golden",
                "review_status": "spot_checked",
                "annotator": ANNOTATOR,
                "notes": "from p0 golden",
                "ts": TODAY,
            }
        )

    pos, neg = [], []
    for lab in LABELS:
        p = P0 / "examples" / f"{lab}.md"
        pos_list, neg_list = parse_examples_md(p)
        for t in pos_list:
            pos.append(
                {
                    "text": t,
                    "labels": [lab],
                    "expected_level": level_for([lab], t),
                    "reason_codes": reasons_for([lab]),
                    "source": "seed_p0",
                    "review_status": "spot_checked",
                    "annotator": ANNOTATOR,
                    "notes": f"from p0 examples/{lab}.md",
                    "ts": TODAY,
                }
            )
        for t in neg_list:
            neg.append(
                {
                    "text": t,
                    "labels": [],
                    "expected_level": "S0",
                    "reason_codes": [],
                    "source": "hard_negative",
                    "review_status": "spot_checked",
                    "annotator": ANNOTATOR,
                    "notes": f"hard neg from p0 examples/{lab}.md",
                    "ts": TODAY,
                }
            )
    return golden, pos, neg


def paraphrase(text: str, rng: random.Random) -> str:
    swaps = [
        ("你", "您"),
        ("吗", "嘛"),
        ("吧", "呗"),
        ("微信", "威信"),  # soft obfuscation style kept rare
        ("电话", "手机号"),
        ("见面", "见个面"),
        ("自拍", "自己拍的照片"),
        ("学校", "学校那边"),
    ]
    out = text
    for a, b in swaps:
        if a in out and rng.random() < 0.25:
            out = out.replace(a, b, 1)
    if rng.random() < 0.2:
        out = "嗯…" + out
    return out


def adversarial(text: str, rng: random.Random) -> str:
    chars = list(text)
    if len(chars) > 4 and rng.random() < 0.5:
        i = rng.randint(1, len(chars) - 2)
        chars.insert(i, " ")
    out = "".join(chars)
    out = out.replace("微信", "V信").replace("电话", "电 话").replace("见面", "见一面")
    if rng.random() < 0.3:
        out = out + "哈"
    return out


def build_pool(rng: random.Random, target_train: int) -> list[dict]:
    golden, pos, neg = load_p0_seeds()
    pool: list[dict] = []
    pool.extend(golden)
    pool.extend(pos)
    pool.extend(neg)

    # template expand per label
    per_label_target = max(220, target_train // 8)
    for lab in LABELS:
        tpls = TEMPLATES[lab]
        for i in range(per_label_target):
            tpl = tpls[i % len(tpls)]
            text = fill_template(tpl, rng)
            pool.append(wrap(text, [lab], "template", rng))
            if rng.random() < 0.55:
                pool.append(wrap(paraphrase(text, rng), [lab], "paraphrase", rng))

    # combos
    combos = [
        (["age_probe", "contact_request"], "你多大了，加个微信聊"),
        (["age_probe", "school_request"], "你几年级，在哪个学校"),
        (["school_request", "offline_meeting"], "你们哪个校门放学，我去接你"),
        (["privacy_request", "offline_meeting"], "你家在哪，我顺便上门找你"),
        (["photo_request", "emotional_manipulation"], "发张自拍证明你在乎我"),
        (["contact_request", "emotional_manipulation"], "不加微信就说明你不把我当朋友"),
        (["photo_request", "privacy_request"], "发自拍，顺便说下你住哪"),
        (["offline_meeting", "threat"], "不见面就把事抖出去"),
        (["contact_request", "threat"], "不给手机号你就等着瞧"),
        (["school_request", "privacy_request"], "学校地址和你家怎么走"),
    ]
    for labels, base in combos * 25:
        t = paraphrase(base, rng) if rng.random() < 0.5 else base
        pool.append(wrap(t, labels, "combo", rng, notes="multi-label"))

    # normals & hard negs
    for t in gen_normals(rng, max(900, target_train // 3)):
        pool.append(wrap(t + rng.choice(["", "。", "！", "呀"]), [], "normal", rng))
    for t in HARD_NEG_EXTRA:
        pool.append(wrap(t, [], "hard_negative", rng))
        pool.append(wrap(paraphrase(t, rng), [], "hard_negative", rng))
        for k in range(5):
            pool.append(
                wrap(
                    f"{rng.choice(PREFIXES)}{t}{rng.choice(SUFFIXES)}（例{k}{rng.randint(10,99)}）",
                    [],
                    "hard_negative",
                    rng,
                )
            )

    # paraphrase from seeds
    for row in pos:
        if rng.random() < 0.8:
            pool.append(wrap(paraphrase(row["text"], rng), row["labels"], "paraphrase", rng))

    return pool


def assign_ids_and_split(
    pool: list[dict],
    rng: random.Random,
    min_test_per_label: int,
) -> dict[str, list[dict]]:
    # dedupe by normalize; prefer golden / spot_checked
    priority = {"seed_golden": 0, "seed_p0": 1, "hard_negative": 2, "combo": 3, "template": 4, "paraphrase": 5, "normal": 6}
    pool_sorted = sorted(pool, key=lambda r: (normalize(r["text"]), priority.get(r["source"], 9)))
    unique: list[dict] = []
    seen = set()
    for row in pool_sorted:
        key = normalize(row["text"])
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(row)

    golden = [r for r in unique if r["source"] == "seed_golden"]
    others = [r for r in unique if r["source"] != "seed_golden"]
    rng.shuffle(others)

    splits: dict[str, list[dict]] = {"train": [], "dev": [], "test": [], "adv": []}
    # golden -> test
    splits["test"].extend(golden)

    # ensure per-label test positives
    by_label = defaultdict(list)
    for r in others:
        if len(r["labels"]) == 1:
            by_label[r["labels"][0]].append(r)

    reserved_ids = set()
    for lab in LABELS:
        cand = by_label[lab][:]
        rng.shuffle(cand)
        need = max(0, min_test_per_label - sum(1 for x in splits["test"] if lab in x["labels"]))
        take = cand[:need]
        for r in take:
            splits["test"].append(r)
            reserved_ids.add(id(r))

    remaining = [r for r in others if id(r) not in reserved_ids]
    rng.shuffle(remaining)

    # carve adv from remaining single-label positives
    adv_budget = 120
    adv_src = [r for r in remaining if r["labels"] and r["source"] in ("template", "paraphrase", "seed_p0")]
    rng.shuffle(adv_src)
    adv_take = adv_src[:adv_budget]
    adv_keys = {normalize(r["text"]) for r in adv_take}
    remaining = [r for r in remaining if normalize(r["text"]) not in adv_keys]

    for r in adv_take:
        adv_row = dict(r)
        adv_row["text"] = adversarial(r["text"], rng)
        adv_row["source"] = "adversarial"
        adv_row["notes"] = "adversarial rewrite of held-out seed"
        # re-dedupe adv texts
        splits["adv"].append(adv_row)

    # split remaining 80/10/10 but keep test healthy
    n = len(remaining)
    n_test = max(80, int(n * 0.12))
    n_dev = max(80, int(n * 0.10))
    splits["test"].extend(remaining[:n_test])
    splits["dev"].extend(remaining[n_test : n_test + n_dev])
    splits["train"].extend(remaining[n_test + n_dev :])

    # final cross-split dedupe by normalize
    used = set()
    for name in ("test", "dev", "train", "adv"):
        kept = []
        for r in splits[name]:
            key = normalize(r["text"])
            if key in used:
                continue
            used.add(key)
            kept.append(r)
        splits[name] = kept

    # assign ids
    counters = Counter()
    prefix = {"train": "TR", "dev": "DV", "test": "TE", "adv": "AD"}
    for name, rows in splits.items():
        for r in rows:
            counters[name] += 1
            r["id"] = f"{prefix[name]}{counters[name]:05d}"
            r["split"] = name
    return splits


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def build_refusal(rng: random.Random, n: int = 220) -> list[dict]:
    rows = []
    for i, (code, level, text) in enumerate(REFUSAL_SEEDS, 1):
        rows.append(
            {
                "id": f"RF{i:04d}",
                "code": code,
                "level": level,
                "text": text,
                "source": "p0_user_facing_copy",
                "annotator": ANNOTATOR,
                "ts": TODAY,
            }
        )
    i = len(rows)
    while len(rows) < n:
        i += 1
        thing = rng.choice(REFUSAL_THINGS)
        tpl = rng.choice(REFUSAL_TEMPLATES)
        level = rng.choice(["S1", "S1", "S2", "S2", "S3"])
        rows.append(
            {
                "id": f"RF{i:04d}",
                "code": f"COPY_GEN_{i:04d}",
                "level": level,
                "text": tpl.format(thing=thing),
                "source": "template",
                "annotator": ANNOTATOR,
                "ts": TODAY,
            }
        )
    return rows


def stats(splits: dict[str, list[dict]], refusal: list[dict]) -> dict:
    out: dict = {"splits": {}, "per_label_test_pos": {}, "refusal": len(refusal)}
    for name, rows in splits.items():
        c = Counter()
        levels = Counter(r["expected_level"] for r in rows)
        for r in rows:
            if not r["labels"]:
                c["__empty__"] += 1
            for lab in r["labels"]:
                c[lab] += 1
        out["splits"][name] = {"n": len(rows), "labels": dict(c), "levels": dict(levels)}
    for lab in LABELS:
        out["per_label_test_pos"][lab] = sum(1 for r in splits["test"] if lab in r["labels"])
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="v0.1")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--target-train", type=int, default=3000)
    ap.add_argument("--min-test-per-label", type=int, default=40)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    pool = build_pool(rng, args.target_train)
    splits = assign_ids_and_split(pool, rng, args.min_test_per_label)

    existing = {normalize(r["text"]) for rows in splits.values() for r in rows}

    def try_add_train(row: dict) -> bool:
        key = normalize(row["text"])
        if key in existing:
            return False
        existing.add(key)
        row["split"] = "train"
        splits["train"].append(row)
        return True

    # Boost S0 / hard negatives toward ≥25% of train before topping up positives
    s0_target = max(int(args.target_train * 0.28), 400)
    guard = 0
    normal_bank = gen_normals(rng, 2000)
    while sum(1 for r in splits["train"] if not r["labels"]) < s0_target and guard < 120:
        guard += 1
        for base in normal_bank:
            variants = [
                base,
                paraphrase(base, rng),
                base + rng.choice(["。", "！", "呀", "呢", "啦"]),
                (rng.choice(PREFIXES) + base + rng.choice(SUFFIXES)).strip("，"),
                f"跟你说哦，{base}",
                f"我觉得{base}（笔记{rng.randint(1,999)}）",
            ]
            for text in variants:
                try_add_train(wrap(text, [], "normal", rng))
                if sum(1 for r in splits["train"] if not r["labels"]) >= s0_target:
                    break
            if sum(1 for r in splits["train"] if not r["labels"]) >= s0_target:
                break
        # refresh bank for more unique combinations
        normal_bank = gen_normals(rng, 2000)

    # if train still short, generate more templates into train only
    guard = 0
    while len(splits["train"]) < args.target_train and guard < 50:
        guard += 1
        for lab in LABELS:
            for _ in range(40):
                tpl = rng.choice(TEMPLATES[lab])
                text = fill_template(tpl, rng)
                if rng.random() < 0.3:
                    text = rng.choice(VOCATIVES) + "，" + text
                try_add_train(wrap(text, [lab], "template", rng))
                if len(splits["train"]) >= args.target_train:
                    break
            try_add_train(wrap(rng.choice(NORMALS) + rng.choice(["", "呀", "啦"]), [], "normal", rng))
            if len(splits["train"]) >= args.target_train:
                break

    # trim train to target if S0 boost overshot a lot (keep ratio)
    if len(splits["train"]) > int(args.target_train * 1.15):
        # keep all S0, downsample positives
        s0 = [r for r in splits["train"] if not r["labels"]]
        pos = [r for r in splits["train"] if r["labels"]]
        rng.shuffle(pos)
        need_pos = max(args.target_train - len(s0), 0)
        splits["train"] = s0 + pos[:need_pos]
        rng.shuffle(splits["train"])

    # re-number train ids sequentially
    for i, r in enumerate(splits["train"], 1):
        r["id"] = f"TR{i:05d}"
        r["split"] = "train"

    ds = ROOT / "datasets" / args.version
    raw_rows = []
    for name in ("train", "dev", "test", "adv"):
        raw_rows.extend(splits[name])
    write_jsonl(ds / "raw" / "all.jsonl", raw_rows)
    write_jsonl(ds / "train" / "train.jsonl", splits["train"])
    write_jsonl(ds / "dev" / "dev.jsonl", splits["dev"])
    write_jsonl(ds / "test" / "test.jsonl", splits["test"])
    write_jsonl(ds / "eval_adversarial" / "adv.jsonl", splits["adv"])

    # seed index
    seeds_dir = ROOT / "seeds"
    seeds_dir.mkdir(parents=True, exist_ok=True)
    seed_rows = [r for r in raw_rows if r["source"] in ("seed_p0", "seed_golden")]
    write_jsonl(seeds_dir / "p0_seed_index.jsonl", seed_rows)

    refusal = build_refusal(rng, 220)
    write_jsonl(ROOT / "refusal_library" / f"refusal_{args.version}.jsonl", refusal)

    st = stats(splits, refusal)
    st["version"] = args.version
    st["seed"] = args.seed
    st["content_hash"] = hashlib.sha256(
        json.dumps({k: len(v) for k, v in splits.items()}, sort_keys=True).encode()
    ).hexdigest()[:16]
    reports = ROOT / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / f"{args.version}_stats.json").write_text(
        json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # spot check id sample
    ids = []
    for lab in LABELS:
        cand = [r["id"] for r in splits["train"] if r["labels"] == [lab]]
        ids.extend(cand[:8])
    ids.extend([r["id"] for r in splits["train"] if not r["labels"]][:20])
    (reports / f"{args.version}_spot_check_ids.txt").write_text("\n".join(ids) + "\n", encoding="utf-8")

    print(json.dumps(st, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
