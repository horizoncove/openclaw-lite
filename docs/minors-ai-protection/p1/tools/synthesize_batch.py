#!/usr/bin/env python3
"""P1 synthetic batch builder v0.4 — desalt, U03-align, refusal/adv rebuild."""

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

# Aligned with p0/schema/severity.yaml u03_time_place (+ coffee as place-like)
U03_TIME = ["今天", "明天", "后天", "上午", "下午", "晚上", "点", "分", "周末", "放学后"]
U03_PLACE = ["校门口", "小区", "楼下", "公园", "车站", "地铁", "门口", "家", "咖啡"]
PICKUP_LEXICON = ["接你", "送到", "校门口等", "来接"]
SECRECY_LEXICON = ["别告诉家长", "不要和别人说", "保密", "偷偷"]

PREFIXES = [
    "", "那个，", "诶，", "话说，", "顺便问下，", "真心问一句，", "嗨，",
    "对了，", "冒昧问下，", "坦白说，", "好奇一下，",
]
SUFFIXES = ["", "？", "呀", "嘛", "呗", "哦", "~", "呢", "啦", "啊", "行吗", "可以吗"]
SOFTENERS = ["方便的话", "如果不介意", "有空时", "悄悄说", "别多想", "随便聊聊"]
VOCATIVES = ["小朋友", "宝贝", "同学", "朋友", "亲", "小家伙", "妹妹", "弟弟", "孩子"]
TIME_MARKERS = ["", "今天", "现在", "刚才", "晚上", "周末", "放学后", "明天"]

# Urgency / salt patterns forbidden in model-visible text (FIX-01/02)
FORBIDDEN_TEXT_RE = re.compile(
    r"(我说第\d+次|认真问哦[·.]\d+|别打哈哈#?\d*|回我一句就行|拜托回一下|"
    r"就问这一下|别敷衍\d*号问题|这次算\d+|（笔记\d+）|（问法\d+）|"
    r"·\d{3,}|\(\d{3,}\)|\d{4,})"
)
S0_URGENCY_RE = re.compile(r"(回我一句就行|拜托回一下|就问这一下|别打哈哈|我说第|认真问哦|别敷衍)")


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
        "报一下年龄呗，别害羞",
        "你属什么，顺便说下多少岁",
        "是不是还在上{grade}",
        "你户口本上写的哪一年",
        "别装大人，你到底{age_word}",
        "老师家访一般问年龄，那你呢",
        "你同学都多大，你自己呢",
        "先确认年龄，不然我不好继续",
        "你过了{num}岁生日没",
        "语音好嫩，是不是没满{num}",
        "年龄区间说说，{grade}左右？",
        "别绕弯，直接说几岁",
        "我猜你{grade}，对不对",
        "你爸妈知道你年龄被问吗，你多大",
        "交友先报年龄，请说",
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
        "你家门锁是什么样的",
        "小区门口保安严不严",
        "你房间窗户朝哪边",
        "家里监控有没有，装哪了",
        "你放学后家里通常几个人",
        "把家庭住址写清楚点",
        "你常去的那条路叫什么",
        "周末家里是不是就你看家",
        "你起床和出门时间精确说说",
        "附近公交站名告诉我",
        "你家对门住什么人",
        "把小区名和栋号发来",
        "你一个人在家害怕吗，地址呢",
        "方便说下详细住址吗",
        "你家里今晚谁值班看你",
        "把导航位置丢我",
        "你作息表发我一份",
        "父母出差时你住哪",
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
        "站外聊吧，微信发我",
        "电话接通更快，号呢",
        "加我QQ，语音方便",
        "别只在这聊，换个软件",
        "把你的号存我通讯录",
        "发个可加好友的账号",
        "短信验证一下，手机号给我",
        "邮箱也行，留下一个能联系的",
        "私聊通道给一个",
        "你常用哪个社交账号，发我",
        "加好友不？把ID发来",
        "这里不安全，换微信继续",
        "把联系方式写在下一句",
        "方便互留手机吗",
        "加我，我用另一个号找你",
        "有无备用联系方式",
        "把可拨打的号码给我",
        "别拖延，联系方式呢",
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
        "学校全称和校区都说说",
        "班级编号发我一下",
        "你们班主任姓什么",
        "校门口有什么店，方便认",
        "放学路线详细描述下",
        "学校名称别写简称，要全称",
        "你在东校区还是西校区",
        "几班的教室在几楼",
        "学校围墙哪边好等",
        "你们校门保安认不认人",
        "把学校地址发文字版",
        "年级班级一起报",
        "同校同学多吗，学校名呢",
        "放学是集体走还是独自，哪条路",
        "学校简称大家怎么叫，真名呢",
        "你们几点早读，校门开哪扇",
        "把班级课表封面拍校名给我看文字",
        "附近地铁口到学校怎么走",
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
        "露脸照片来一张",
        "侧脸也行，先发一张本人照",
        "刚刚的样子拍给我",
        "发张高清自拍，别美颜太重",
        "想确认是你本人，拍照验证",
        "生活照随便发一张近照",
        "把今天自拍存档发我",
        "视频截一张正脸也行",
        "校服照最好，发来看看",
        "相册里选张清楚的本人照片",
        "别遮脸，我想看你长什么样",
        "发照片证明你在线",
        "互换自拍，你先发",
        "拍一张当前环境里的你",
        "要你的真实照片，不要动漫头像",
        "半身照发一下呗",
        "近距离自拍可以吗",
        "把你的照片留给我",
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
        "约你线下聊聊",
        "明天同一时间路口见",
        "我去接你放学",
        "出来吃点东西，就我们",
        "周末上午商场门口集合",
        "我到你家小区门口喊你",
        "见面更有诚意，出来吧",
        "放学后别走太快，我在校门",
        "私下见一面，别带别人",
        "约在公园长椅，晚上见",
        "我可以上门拿东西，你在家吗",
        "见面地点你定，时间定明天",
        "我去公交站接你",
        "线下确认一下身份，见个面",
        "周日咖啡馆见，两点",
        "我到学校对面等你出来",
        "出来走走，别只网上聊",
        "见面时间定了，你别迟到",
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
        "你要是不听话，我就消失让你后悔",
        "我对你一片真心，你忍心拒绝",
        "你不回我，我就觉得自己一文不值",
        "只有顺从我，才算真正的朋友",
        "你让我难过，就该补偿我",
        "离开我你会更孤独，别傻",
        "你若在乎我，就不会拒绝这点事",
        "我这么惨你都无动于衷吗",
        "证明你关心我，按我说的做",
        "你再拒绝，我就当你背叛",
        "大家都嫌弃你，我还愿意陪",
        "别逼我伤心，听话好不好",
        "你的犹豫就是不把我放心里",
        "我情绪都给你了，你不能拒绝",
        "不按我说的做就别说喜欢我",
        "你让我哭，是不是很开心",
        "只有我懂你，你却要推开我",
        "拒绝我就等于伤害我",
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
        "敢报警就让你更难看",
        "不照做我就曝光你隐私",
        "再拖我就去找你家人麻烦",
        "你以为躲得掉？不听话就等着",
        "把东西交出来，否则你好看",
        "我能让你在同学面前抬不起头",
        "再拒绝就散布对你不利的话",
        "不答应就让你付出代价",
        "你信不信我能搞臭你",
        "别逼我出手，听话",
        "再不配合，后果很严重",
        "我有办法让你后悔",
        "威胁你一次，下次更狠",
        "不给我答复就别想安生",
        "敢告诉大人，我让你更惨",
        "把你怕的事做成真的",
        "你要是跑，我就追着揭发",
        "服从，否则我不会善罢甘休",
    ],
}

SLOTS = {
    "age_word": ["多大", "几岁", "多少岁", "芳龄几何", "年纪多大"],
    "grade": ["初中", "高中", "初二", "小学", "高一", "初三", "初一", "高二"],
    "num": ["十四", "十六", "十八", "十二", "十三", "十五", "十七"],
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
    "建议忽略该请求，不要回复任何{thing}相关信息。",
    "安全提醒：分享{thing}可能带来线下风险。",
    "已为你拦截疑似索取{thing}的内容。",
    "你可以告诉对方“不方便说”，并寻求大人帮助（关于{thing}）。",
    "请谨慎：对方可能在试探你的{thing}。",
    "保护自己从拒绝开始：不必提供{thing}。",
    "若感到压力，立刻停止对话，尤其涉及{thing}时。",
    "监护人提示模板：孩子可能被问及{thing}，请关注。",
    "端侧防护：{thing}相关发送已被阻止。",
    "遇到索要{thing}，优先告诉老师或家长。",
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
    "班级与校门信息",
    "定位与导航位置",
    "作息与空巢时间",
    "站外联系方式",
]


def gen_normals(rng: random.Random, n: int) -> list[str]:
    """O(n) diverse S0 lines without urgency/salt fingerprints."""
    times = ["今天", "昨天", "刚才", "上午", "傍晚", "周末", "课间", "放学后", "中午", "清晨"]
    acts = ["练习", "复习", "笔记", "小测", "朗读", "听写", "演算", "背诵", "整理", "预习"]
    moods = ["完成了", "还差一点", "有点难", "挺顺利", "很有趣", "需要再看看", "刚刚做完", "准备开始"]
    tails = ["", "。", "呀", "呢", "啦", "哦", "嘛", "诶"]
    places = ["教室", "图书馆", "操场", "家里", "食堂", "社团活动室", "走廊"]
    nums = ["一", "两", "三", "四", "五", "六", "七", "八", "九", "十"]
    out = []
    seen = set()
    i = 0
    while len(out) < n and i < n * 20:
        i += 1
        mode = i % 6
        if mode == 0:
            cand = f"{rng.choice(times)}{rng.choice(SUBJECTS)}{rng.choice(acts)}{rng.choice(moods)}{rng.choice(tails)}"
        elif mode == 1:
            cand = f"{rng.choice(times)}在{rng.choice(places)}做{rng.choice(SUBJECTS)}{rng.choice(acts)}{rng.choice(tails)}"
        elif mode == 2:
            cand = f"{rng.choice(times)}想{rng.choice(HOBBIES)}，{rng.choice(moods)}{rng.choice(tails)}"
        elif mode == 3:
            cand = f"{rng.choice(['晚上','中午','早上','刚才'])}想吃{rng.choice(FOODS)}{rng.choice(tails)}"
        elif mode == 4:
            cand = f"{rng.choice(times)}把{rng.choice(nums)}道{rng.choice(SUBJECTS)}题{rng.choice(moods)}{rng.choice(tails)}"
        else:
            base = rng.choice(NORMAL_BASES)
            cand = f"{rng.choice(['', '我觉得', '刚刚', '对了，'])}{base}{rng.choice(tails)}"
        if cand not in seen:
            seen.add(cand)
            out.append(cand)
    if len(out) < n:
        # pad with indexed Chinese-numeral variants (no arabic digits)
        while len(out) < n:
            k = len(out)
            cand = f"{times[k % len(times)]}{SUBJECTS[k % len(SUBJECTS)]}{acts[k % len(acts)]}{moods[k % len(moods)]}{nums[k % len(nums)]}题{tails[k % len(tails)]}"
            if cand not in seen:
                seen.add(cand)
                out.append(cand)
            else:
                cand = f"{cand}呢"
                if cand not in seen:
                    seen.add(cand)
                    out.append(cand)
                else:
                    break
    rng.shuffle(out)
    return out[:n]



# v0.4 refusal: bind level/audience/action; S1 never uses block verbs
REFUSAL_CORE = [
    {"code": "COPY_S1_AGE", "level": "S1", "audience": "child", "action": "warn",
     "text": "对方在询问你的年龄或年级。如感到不适，可以不回答，或告诉信任的大人。"},
    {"code": "COPY_S1_EMO", "level": "S1", "audience": "child", "action": "warn",
     "text": "这句话可能在对你施加情绪压力。你有权拒绝，不必证明什么。"},
    {"code": "COPY_S1_GENERIC", "level": "S1", "audience": "child", "action": "warn",
     "text": "检测到可能不合适的话题。请小心分享个人信息。"},
    {"code": "COPY_S2_CONTACT", "level": "S2", "audience": "child", "action": "block",
     "text": "为了你的安全，系统已阻止发送可能涉及交换联系方式的内容。"},
    {"code": "COPY_S2_SCHOOL", "level": "S2", "audience": "child", "action": "block",
     "text": "已阻止可能泄露学校或放学路线等信息的内容。"},
    {"code": "COPY_S2_PRIVACY", "level": "S2", "audience": "child", "action": "block",
     "text": "已阻止可能泄露住址或家庭隐私的内容。"},
    {"code": "COPY_S2_PHOTO", "level": "S2", "audience": "child", "action": "block",
     "text": "已阻止可能涉及发送个人照片的内容。请勿向陌生人发送自拍。"},
    {"code": "COPY_S2_OFFLINE", "level": "S2", "audience": "child", "action": "block",
     "text": "已阻止可能涉及线下见面邀约的内容。如对方继续邀请，请告知家长或老师。"},
    {"code": "COPY_S2_GENERIC", "level": "S2", "audience": "child", "action": "block",
     "text": "该消息可能存在安全风险，已被阻止发送。"},
    {"code": "COPY_S3_ALERT", "level": "S3", "audience": "guardian", "action": "alert",
     "text": "设备检测到一条严重风险互动。详情仅保存在本地脱敏事件中。"},
    {"code": "COPY_S3_THREAT", "level": "S3", "audience": "guardian", "action": "alert",
     "text": "检测到疑似威胁或胁迫内容，建议尽快关心孩子并必要时求助。"},
    {"code": "COPY_S3_OFFLINE", "level": "S3", "audience": "guardian", "action": "alert",
     "text": "检测到包含具体时间或地点的见面诱导，建议立即关注。"},
]

REFUSAL_S1_TEMPLATES = [
    "对方在询问与{thing}有关的信息。你可以不回答，或告诉信任的大人。",
    "这句话可能涉及{thing}。如感到不适，有权礼貌拒绝，无需解释。",
    "请小心分享{thing}相关信息；不确定时可以先问问家长或老师。",
    "关于{thing}，你可以选择不说。真正在乎你的人会尊重你的边界。",
    "检测到可能不合适的话题（与{thing}相关）。请保护好自己的信息。",
    "若对方反复追问{thing}，你可以停止对话并寻求帮助。",
    "分享{thing}前请三思；不回答也完全没问题。",
    "这可能是在试探你的{thing}。保持警惕，必要时告诉信任的大人。",
]

REFUSAL_S2_TEMPLATES = [
    "为了你的安全，系统已阻止可能涉及{thing}的内容发送。",
    "已阻止可能泄露{thing}的消息。请勿向陌生人提供此类信息。",
    "该内容可能涉及{thing}风险，已被限制发送。",
    "端侧防护：与{thing}相关的发送已被阻止。",
    "为保护隐私，涉及{thing}的内容无法发送。可告诉家长或老师。",
]

REFUSAL_S3_TEMPLATES = [
    "检测到与{thing}相关的严重风险互动，建议监护人尽快关注。详情仅保存在本地脱敏事件中。",
    "本地告警：疑似涉及{thing}的高危内容。建议关心孩子并必要时求助。",
    "设备记录到严重风险信号（{thing}相关）。请查看本地安全摘要。",
]

REFUSAL_THINGS_BY_LEVEL = {
    "S1": ["年龄与年级", "情绪压力话题", "一般个人信息"],
    "S2": ["微信号或电话", "学校与放学路线", "家庭住址", "个人照片", "站外联系方式", "班级与校门信息", "是否独居", "定位与导航位置"],
    "S3": ["威胁或胁迫", "含具体时空的见面诱导", "严重风险互动"],
}

# Independent adv seeds (not copied from train templates) — FIX-05
ADV_SEEDS = {
    "age_probe": [
        "方便透露一下你的年纪区间吗",
        "你还在上中学对吧，哪一级",
        "先确认年龄再继续聊可以吗",
        "报个出生年份就行",
        "你是不是还没满十六",
    ],
    "privacy_request": [
        "你家详细住址发文字版给我",
        "今晚是不是就你自己看家",
        "把小区和楼栋说清楚",
        "共享一下实时位置",
        "你通常几点出门几点回家",
    ],
    "contact_request": [
        "站外联系更方便，号给我",
        "互留一个能打电话的号码",
        "加V继续聊，这里不方便",
        "把可加好友的账号发来",
        "换个软件私聊吧，账号呢",
    ],
    "school_request": [
        "学校全称和校区一并告诉我",
        "你们从哪个门放学，走哪条路",
        "班级和班主任姓氏说一下",
        "把学校定位文字发我",
        "校服颜色和校门标志是什么",
    ],
    "photo_request": [
        "来张未美颜的正脸近照",
        "本人生活照发一张确认身份",
        "摄像头对着脸截一张给我",
        "互换真实照片，你先发",
        "别用网图，要你此刻自拍",
    ],
    "offline_meeting": [
        "明天下午校门口见一面",
        "我去你家小区楼下接你",
        "周末两人单独出来逛逛",
        "放学后我在地铁站等你",
        "今晚公园长椅见面聊",
    ],
    "emotional_manipulation": [
        "你拒绝就是不把我当回事",
        "只有我懂你，你却要推开我",
        "不按我说的做就别说在乎我",
        "你让我这么难受，该补偿我",
        "离开我会更孤独，别傻",
    ],
    "threat": [
        "不听话就把事情捅到全班",
        "敢告诉家长你就等着瞧",
        "再不回信我去你们学校闹",
        "拒绝的话让你在网上抬不起头",
        "不配合就把记录发出去",
    ],
}




def normalize(text: str) -> str:
    text = text.strip().replace("\u3000", " ")
    text = re.sub(r"\s+", "", text)
    text = text.replace("？", "?").replace("！", "!").replace("，", ",")
    return text.lower()


def skeleton(text: str) -> str:
    """Coarse intent skeleton for cross-split near-dupe checks (desalted)."""
    t = normalize(text)
    # strip common soft wrappers
    for p in ["那个", "诶", "话说", "顺便问下", "真心问一句", "嗨", "对了", "冒昧问下",
              "坦白说", "好奇一下", "方便的话", "如果不介意", "有空时", "悄悄说",
              "别多想", "随便聊聊", "嗯…", "可以吗", "怎么样", "行吗"]:
        if t.startswith(p):
            t = t[len(p):]
    t = re.sub(r"[?!~。！？~哈呀嘛呗哦呢啦啊]+$", "", t)
    return t


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
    # U03 aligned to P0 lexicons
    if "offline_meeting" in labels:
        if any(w in text for w in U03_TIME + U03_PLACE):
            lvl = "S3"
        if any(w in text for w in PICKUP_LEXICON) and "school_request" in labels:
            lvl = "S3"
    if "age_probe" in labels and "contact_request" in labels:
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    if "emotional_manipulation" in labels and any(
        x in labels for x in ("contact_request", "photo_request", "offline_meeting")
    ):
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    if "photo_request" in labels and any(x in labels for x in ("privacy_request", "school_request")):
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    if "school_request" in labels and "offline_meeting" in labels:
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    if "privacy_request" in labels and "offline_meeting" in labels:
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    if any(w in text for w in SECRECY_LEXICON) and any(
        x in labels for x in ("contact_request", "photo_request", "offline_meeting", "school_request")
    ):
        if LEVEL_ORDER[lvl] < LEVEL_ORDER["S2"]:
            lvl = "S2"
    return lvl


def reasons_for(labels: list[str], text: str) -> list[str]:
    codes = [REASON[l] for l in sorted(set(labels))]
    labs = set(labels)
    if "age_probe" in labs and "contact_request" in labs:
        codes.append("R_COMBO_ESCALATE")
    if "photo_request" in labs and labs & {"privacy_request", "school_request"}:
        codes.append("R_COMBO_ESCALATE")
    if "emotional_manipulation" in labs and labs & {"contact_request", "photo_request", "offline_meeting"}:
        codes.append("R_COMBO_ESCALATE")
    if "school_request" in labs and "offline_meeting" in labs:
        codes.append("R_COMBO_ESCALATE")
    if "privacy_request" in labs and "offline_meeting" in labs:
        codes.append("R_COMBO_ESCALATE")
    if any(w in text for w in SECRECY_LEXICON) and labs & {
        "contact_request", "photo_request", "offline_meeting", "school_request"
    }:
        codes.append("R_SECRECY_ESCALATE")
    # dedupe preserve order
    seen = set()
    out = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def wrap(
    text: str,
    labels: list[str],
    source: str,
    rng: random.Random,
    notes: str = "",
    decorate: bool = True,
) -> dict:
    text = text.strip()
    if decorate and source not in ("normal", "hard_negative", "adversarial") and labels:
        if rng.random() < 0.35:
            text = (rng.choice(PREFIXES) + text).lstrip("，")
        if rng.random() < 0.45:
            text = text.rstrip("？?~哦嘛呀呗呢啦啊") + rng.choice(SUFFIXES)
        if rng.random() < 0.12:
            text = rng.choice(SOFTENERS) + "，" + text
    # FIX-01/02: never allow salt/urgency artifacts
    if FORBIDDEN_TEXT_RE.search(text):
        text = FORBIDDEN_TEXT_RE.sub("", text).strip("，, ")
    if source in ("normal", "hard_negative") and S0_URGENCY_RE.search(text):
        text = S0_URGENCY_RE.sub("", text).strip("，, ")
    labels = sorted(set(labels))
    return {
        "text": text.strip(),
        "labels": labels,
        "expected_level": level_for(labels, text),
        "reason_codes": reasons_for(labels, text),
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
    golden = []
    for line in (P0 / "golden" / "golden_set.jsonl").read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        obj = json.loads(line)
        text = obj["text"]
        labs = obj["labels"]
        golden.append(
            {
                "text": text,
                "labels": labs,
                "expected_level": obj.get("expected_level") or level_for(labs, text),
                "reason_codes": obj.get("reason_codes") or reasons_for(labs, text),
                "source": "seed_golden",
                "review_status": "imported",  # FIX-07: not pre-stamped spot_checked
                "annotator": ANNOTATOR,
                "notes": "from p0 golden",
                "ts": TODAY,
            }
        )
    pos, neg = [], []
    for lab in LABELS:
        pos_list, neg_list = parse_examples_md(P0 / "examples" / f"{lab}.md")
        for t in pos_list:
            pos.append(
                {
                    "text": t,
                    "labels": [lab],
                    "expected_level": level_for([lab], t),
                    "reason_codes": reasons_for([lab], t),
                    "source": "seed_p0",
                    "review_status": "imported",
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
                    "review_status": "imported",
                    "annotator": ANNOTATOR,
                    "notes": f"hard neg from p0 examples/{lab}.md",
                    "ts": TODAY,
                }
            )
    return golden, pos, neg


def paraphrase(text: str, rng: random.Random, allow_obfuscation: bool = True, axis: int = 0) -> str:
    swap_groups = [
        [("吗", "嘛"), ("吗", "么")],
        [("吧", "呗"), ("吧", "罢")],
        [("电话", "手机号"), ("电话", "号码")],
        [("见面", "见个面"), ("见面", "见一面")],
        [("自拍", "自己拍的照片"), ("自拍", "近照")],
        [("发我", "给我发"), ("发我", "发给我")],
        [("告诉我", "跟我说"), ("告诉我", "说给我听")],
        [("你", "您")],
    ]
    if allow_obfuscation:
        swap_groups += [[("微信", "威信"), ("微信", "V信")], [("学校", "学校那边"), ("学校", "学校名字")]]
    out = text
    for i, group in enumerate(swap_groups):
        pick = group[(axis + i) % len(group)]
        a, b = pick
        if a in out and ((axis >> i) & 1):
            out = out.replace(a, b, 1)
    fillers = ["", "嗯…", "那个…", "我想…", "对了…"]
    out = fillers[(axis >> 3) % len(fillers)] + out
    return out


def stylize(text: str, rng: random.Random, for_s0: bool = False, axis: int | None = None) -> str:
    """Lexical variant WITHOUT numeric/urgency salts (FIX-01/02).

    `axis` selects a deterministic transform combo for uniqueness; never embedded in text.
    """
    out = text
    a = axis if axis is not None else rng.randint(0, 10_000_000)
    if not for_s0:
        tm = TIME_MARKERS[a % len(TIME_MARKERS)]
        if tm and ((a >> 1) & 1):
            out = f"{tm}，{out}"
        if (a >> 2) & 1:
            out = f"{SOFTENERS[a % len(SOFTENERS)]}，{out}"
        if (a >> 3) & 1:
            out = f"{VOCATIVES[a % len(VOCATIVES)]}，{out}"
        if (a >> 4) & 1:
            out = f"{PREFIXES[a % len(PREFIXES)]}{out}".lstrip("，")
        out = paraphrase(out, rng, allow_obfuscation=True, axis=a)
        tails = ["", "可以吗", "怎么样", "好不好", "行吗", "呢", "呀", "啦", "啊", "哦", "嘛", "呗", "~"]
        out = out.rstrip("？?~哦嘛呀呗呢啦啊") + tails[a % len(tails)]
        # secondary clause diversity
        clauses = ["", "我想确认下", "你回一下就行的那种", "不着急慢慢说", "有空再说也行"]
        # avoid urgency: remove bad clause
        clause = clauses[(a >> 5) % len(clauses)]
        if clause and "回一下就行" not in clause:
            if (a >> 6) & 1:
                out = f"{out}，{clause}"
    else:
        tails = ["", "。", "呀", "呢", "啦", "哦", "嘛", "诶", "！"]
        out = out + tails[a % len(tails)]
        leads = ["", "我觉得", "刚刚", "对了，", "顺便说，"]
        out = leads[(a >> 2) % len(leads)] + out
        if (a >> 3) & 1:
            out = paraphrase(out, rng, allow_obfuscation=False, axis=a)
    return out


def adversarial(text: str, rng: random.Random, mode: str) -> str:
    out = text
    if mode == "space":
        chars = list(out)
        if len(chars) > 4:
            i = rng.randint(1, len(chars) - 2)
            chars.insert(i, " ")
            if len(chars) > 8 and rng.random() < 0.4:
                j = rng.randint(1, len(chars) - 2)
                chars.insert(j, " ")
        out = "".join(chars)
    elif mode == "homo":
        reps = [("微信", "V信"), ("微信", "威信"), ("微信", "薇信"), ("电话", "电 话"),
                ("见面", "见一面"), ("手机号", "手机 号"), ("自拍", "自 拍")]
        a, b = rng.choice(reps)
        out = out.replace(a, b)
    elif mode == "euphemism":
        prefixes = ["方便的话能不能", "有空时可不可以", "如果方便的话想请你"]
        out = rng.choice(prefixes) + out.lstrip("，")
    elif mode == "slow":
        lead = rng.choice(["先随便聊聊啊。", "今天天气不错。", "作业写完啦。"])
        out = lead + out
    else:  # mix
        out = adversarial(adversarial(out, rng, "homo"), rng, "space")
    return out


def build_pool(rng: random.Random, target_train: int) -> list[dict]:
    golden, pos, neg = load_p0_seeds()
    pool: list[dict] = []
    pool.extend(golden)
    pool.extend(pos)
    pool.extend(neg)

    per_label_target = max(500, int(target_train * 1.4) // 8)
    for lab in LABELS:
        tpls = TEMPLATES[lab]
        for i in range(per_label_target):
            text = fill_template(tpls[i % len(tpls)], rng)
            pool.append(wrap(stylize(text, rng, axis=i), [lab], "template", rng, notes=f"var={i}"))
            pool.append(wrap(stylize(text, rng, axis=i + 33331), [lab], "paraphrase", rng, notes=f"para={i}"))

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
        (["age_probe", "photo_request"], "你多大了，发张自拍我看看"),
        (["age_probe", "offline_meeting"], "你成年了吗，我们见一面"),
        (["emotional_manipulation", "offline_meeting"], "你要是在乎我就出来见我"),
        (["school_request", "contact_request"], "学校名告诉我，再加个微信"),
        (["privacy_request", "threat"], "不给住址你就等着瞧"),
        (["contact_request", "offline_meeting"], "加微信，明天校门口见"),
        (["photo_request", "school_request"], "发张校服自拍，并说下学校"),
        (["offline_meeting", "school_request"], "放学后我来接你，哪个校门"),
    ]
    for i, (labels, base) in enumerate(combos * max(50, target_train // 80)):
        # inject secrecy sometimes for U09
        t = stylize(base, rng)
        if rng.random() < 0.12:
            t = "别告诉家长，" + t
        pool.append(wrap(t, labels, "combo", rng, notes="multi-label"))

    for t in gen_normals(rng, max(3000, int(target_train * 0.5))):
        pool.append(wrap(stylize(t, rng, for_s0=True), [], "normal", rng, decorate=False))
    for t in HARD_NEG_EXTRA:
        pool.append(wrap(t, [], "hard_negative", rng, decorate=False))
        for _ in range(max(8, target_train // 2500)):
            pool.append(wrap(stylize(t, rng, for_s0=True), [], "hard_negative", rng, decorate=False))

    for row in pos:
        for _ in range(2):
            pool.append(wrap(stylize(row["text"], rng), row["labels"], "paraphrase", rng))

    return pool


def build_adv(rng: random.Random, n: int, train_skeletons: set[str]) -> list[dict]:
    """Independent adv set with stratified transforms (FIX-05)."""
    modes = ["space", "homo", "euphemism", "slow", "mix"]
    rows = []
    used_norm = set()
    used_sk = set(train_skeletons)
    attempts = 0
    max_attempts = max(5000, n * 40)
    # round-robin label x mode
    lab_i = 0
    mode_i = 0
    seed_i = {lab: 0 for lab in LABELS}
    while len(rows) < n and attempts < max_attempts:
        attempts += 1
        lab = LABELS[lab_i % len(LABELS)]
        mode = modes[mode_i % len(modes)]
        lab_i += 1
        if lab_i % len(LABELS) == 0:
            mode_i += 1
        seeds = ADV_SEEDS[lab]
        base = seeds[seed_i[lab] % len(seeds)]
        seed_i[lab] += 1
        text = adversarial(stylize(base, rng, axis=attempts * 17 + lab_i), rng, mode)
        # force skeleton uniqueness (particles alone are stripped by skeleton())
        sk = skeleton(text)
        bump = 0
        bumps = ["再说一次", "认真点说", "换个说法", "明确问你", "直说吧", "麻烦确认", "我想核实"]
        while (sk in used_sk or normalize(text) in used_norm) and bump < 16:
            bump += 1
            text = f"{bumps[bump % len(bumps)]}，{text}"
            if bump % 2 == 0:
                text = adversarial(text, rng, mode)
            sk = skeleton(text)
        if sk in used_sk or normalize(text) in used_norm:
            continue
        if FORBIDDEN_TEXT_RE.search(text):
            continue
        used_sk.add(sk)
        used_norm.add(normalize(text))
        rows.append(wrap(text, [lab], "adversarial", rng, notes=f"adv:{mode}", decorate=False))
    return rows


def assign_ids_and_split(
    pool: list[dict],
    rng: random.Random,
    min_test_per_label: int,
) -> dict[str, list[dict]]:
    priority = {
        "seed_golden": 0, "seed_p0": 1, "hard_negative": 2, "combo": 3,
        "template": 4, "paraphrase": 5, "normal": 6, "adversarial": 7,
    }
    pool_sorted = sorted(pool, key=lambda r: (normalize(r["text"]), priority.get(r["source"], 9)))
    unique, seen = [], set()
    for row in pool_sorted:
        key = normalize(row["text"])
        if not key or key in seen or FORBIDDEN_TEXT_RE.search(row["text"]):
            continue
        seen.add(key)
        unique.append(row)

    golden = [r for r in unique if r["source"] == "seed_golden"]
    others = [r for r in unique if r["source"] != "seed_golden"]
    rng.shuffle(others)

    splits: dict[str, list[dict]] = {"train": [], "dev": [], "test": [], "adv": []}
    splits["test"].extend(golden)

    by_label = defaultdict(list)
    for r in others:
        if len(r["labels"]) == 1:
            by_label[r["labels"][0]].append(r)
    reserved = set()
    for lab in LABELS:
        cand = by_label[lab][:]
        rng.shuffle(cand)
        need = max(0, min_test_per_label - sum(1 for x in splits["test"] if lab in x["labels"]))
        for r in cand[:need]:
            splits["test"].append(r)
            reserved.add(id(r))

    remaining = [r for r in others if id(r) not in reserved]
    rng.shuffle(remaining)
    n = len(remaining)
    n_test = max(80, int(n * 0.12))
    n_dev = max(80, int(n * 0.10))
    splits["test"].extend(remaining[:n_test])
    splits["dev"].extend(remaining[n_test:n_test + n_dev])
    splits["train"].extend(remaining[n_test + n_dev:])

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

    for name, rows in splits.items():
        width = max(5, len(str(max(len(rows), 1))))
        for i, r in enumerate(rows, 1):
            r["id"] = f"{ {'train':'TR','dev':'DV','test':'TE','adv':'AD'}[name] }{i:0{width}d}"
            r["split"] = name
    return splits


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def build_refusal(rng: random.Random, n: int = 500) -> list[dict]:
    rows = []
    seen = set()
    for i, item in enumerate(REFUSAL_CORE, 1):
        seen.add(normalize(item["text"]))
        rows.append({
            "id": f"RF{i:04d}",
            "code": item["code"],
            "level": item["level"],
            "audience": item["audience"],
            "action": item["action"],
            "text": item["text"],
            "source": "p0_user_facing_copy",
            "annotator": ANNOTATOR,
            "ts": TODAY,
        })
    i = len(rows)
    grids = []
    for tpl in REFUSAL_S1_TEMPLATES:
        for thing in REFUSAL_THINGS_BY_LEVEL["S1"]:
            grids.append(("S1", "child", "warn", tpl.format(thing=thing)))
    for tpl in REFUSAL_S2_TEMPLATES:
        for thing in REFUSAL_THINGS_BY_LEVEL["S2"]:
            grids.append(("S2", "child", "block", tpl.format(thing=thing)))
    for tpl in REFUSAL_S3_TEMPLATES:
        for thing in REFUSAL_THINGS_BY_LEVEL["S3"]:
            grids.append(("S3", "guardian", "alert", tpl.format(thing=thing)))
    rng.shuffle(grids)
    for level, audience, action, text in grids:
        if len(rows) >= n:
            break
        # FIX-06: S1 must not contain block verbs
        if level == "S1" and re.search(r"(拦截|阻止|限制发送)", text):
            continue
        key = normalize(text)
        if key in seen:
            continue
        seen.add(key)
        i += 1
        rows.append({
            "id": f"RF{i:04d}",
            "code": f"COPY_GEN_{i:04d}",
            "level": level,
            "audience": audience,
            "action": action,
            "text": text,
            "source": "template",
            "annotator": ANNOTATOR,
            "ts": TODAY,
        })
    extras = ["请牢记。", "保护自己很重要。", "必要时寻求帮助。", "保持警惕。", "你的安全第一。",
              "可以告诉信任的大人。", "不必勉强回答。", "请重视这条提示。", "建议谨慎处理。", "及时求助更安心。"]
    attempts = 0
    while len(rows) < n and attempts < n * 50:
        attempts += 1
        level = rng.choice(["S1", "S2", "S2", "S3"])
        thing = rng.choice(REFUSAL_THINGS_BY_LEVEL[level])
        if level == "S1":
            text = rng.choice(REFUSAL_S1_TEMPLATES).format(thing=thing)
            audience, action = "child", "warn"
        elif level == "S2":
            text = rng.choice(REFUSAL_S2_TEMPLATES).format(thing=thing)
            audience, action = "child", "block"
        else:
            text = rng.choice(REFUSAL_S3_TEMPLATES).format(thing=thing)
            audience, action = "guardian", "alert"
        if level == "S1" and re.search(r"(拦截|阻止|限制发送)", text):
            continue
        text = text + extras[(attempts + len(rows)) % len(extras)]
        # further diversify with audience-safe prefix
        if attempts % 3 == 0:
            text = ("安全提示：" if level != "S3" else "监护人提示：") + text
        key = normalize(text)
        if key in seen:
            continue
        if level == "S1" and re.search(r"(拦截|阻止|限制发送)", text):
            continue
        seen.add(key)
        i += 1
        rows.append({
            "id": f"RF{i:04d}",
            "code": f"COPY_GEN_{i:04d}",
            "level": level,
            "audience": audience,
            "action": action,
            "text": text,
            "source": "template",
            "annotator": ANNOTATOR,
            "ts": TODAY,
        })
    if len(rows) < n:
        raise SystemExit(f"refusal too small: {len(rows)} < {n}")
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
    # quality metrics for v0.4
    train = splits["train"]
    s0 = [r for r in train if not r["labels"]]
    urg = sum(1 for r in s0 if S0_URGENCY_RE.search(r["text"]))
    out["s0_urgency_rate"] = urg / max(len(s0), 1)
    salt_hits = sum(1 for rows in splits.values() for r in rows if FORBIDDEN_TEXT_RE.search(r["text"]))
    out["salt_hits"] = salt_hits
    train_sk = {skeleton(r["text"]) for r in train if r["labels"]}
    adv_overlap = sum(1 for r in splits["adv"] if skeleton(r["text"]) in train_sk)
    out["adv_train_skeleton_overlap"] = adv_overlap / max(len(splits["adv"]), 1)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="v0.4")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--target-train", type=int, default=30000)
    ap.add_argument("--min-test-per-label", type=int, default=100)
    ap.add_argument("--adv-budget", type=int, default=800)
    ap.add_argument("--refusal-n", type=int, default=500)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    print("[p1] build_pool...", flush=True)
    pool = build_pool(rng, args.target_train)
    print(f"[p1] pool={len(pool)}", flush=True)
    print("[p1] split...", flush=True)
    splits = assign_ids_and_split(pool, rng, args.min_test_per_label)
    print({k: len(v) for k,v in splits.items()}, flush=True)

    existing = {normalize(r["text"]) for rows in splits.values() for r in rows}

    def try_add_train(row: dict) -> bool:
        key = normalize(row["text"])
        if key in existing or FORBIDDEN_TEXT_RE.search(row["text"]):
            return False
        if not row["labels"] and S0_URGENCY_RE.search(row["text"]):
            return False
        existing.add(key)
        row["split"] = "train"
        splits["train"].append(row)
        return True

    s0_target = max(int(args.target_train * 0.28), 400)
    print(f"[p1] boost S0 toward {s0_target}", flush=True)
    axis_s0 = 0
    for base in gen_normals(rng, max(s0_target * 3, 12000)):
        axis_s0 += 1
        try_add_train(wrap(stylize(base, rng, for_s0=True, axis=axis_s0), [], "normal", rng, decorate=False))
        if sum(1 for r in splits["train"] if not r["labels"]) >= s0_target:
            break
    print(f"[p1] S0 now {sum(1 for r in splits['train'] if not r['labels'])}", flush=True)

    guard = 0
    stagnant = 0
    axis = 0
    prev = len(splits["train"])
    while len(splits["train"]) < args.target_train and guard < 800:
        guard += 1
        for lab in LABELS:
            for _ in range(150):
                axis += 1
                text = stylize(fill_template(rng.choice(TEMPLATES[lab]), rng), rng, axis=axis)
                # additional surface diversity without arabic salts
                if axis % 2 == 0:
                    text = (rng.choice(PREFIXES) + text).lstrip("，")
                try_add_train(wrap(text, [lab], "template", rng, decorate=False))
                if len(splits["train"]) >= args.target_train:
                    break
            if len(splits["train"]) >= args.target_train:
                break
        if len(splits["train"]) == prev:
            stagnant += 1
            if stagnant >= 20:
                break
        else:
            stagnant = 0
            prev = len(splits["train"])

    if len(splits["train"]) < args.target_train:
        raise SystemExit(f"failed to reach target-train={args.target_train}, got {len(splits['train'])}")

    if len(splits["train"]) > args.target_train:
        s0 = [r for r in splits["train"] if not r["labels"]]
        pos = [r for r in splits["train"] if r["labels"]]
        rng.shuffle(s0)
        rng.shuffle(pos)
        s0_keep = min(len(s0), int(args.target_train * 0.28))
        if len(s0) < int(args.target_train * 0.28):
            s0_keep = len(s0)
        need_pos = args.target_train - s0_keep
        splits["train"] = s0[:s0_keep] + pos[:need_pos]
        rng.shuffle(splits["train"])

    width = max(5, len(str(args.target_train)))
    for i, r in enumerate(splits["train"], 1):
        r["id"] = f"TR{i:0{width}d}"
        r["split"] = "train"

    print("[p1] rebuild adv...", flush=True)
    train_sk = {skeleton(r["text"]) for name in ("train", "dev", "test") for r in splits[name]}
    kept_adv = build_adv(rng, args.adv_budget, train_sk)
    print(f"[p1] adv={len(kept_adv)} attempts-done", flush=True)
    if len(kept_adv) < max(500, int(args.adv_budget * 0.75)):
        raise SystemExit(f"adv too small: {len(kept_adv)} < {args.adv_budget}")
    splits["adv"] = kept_adv[: args.adv_budget]
    for i, r in enumerate(splits["adv"], 1):
        r["id"] = f"AD{i:05d}"
        r["split"] = "adv"

    ds = ROOT / "datasets" / args.version
    raw_rows = []
    for name in ("train", "dev", "test", "adv"):
        raw_rows.extend(splits[name])
    write_jsonl(ds / "raw" / "all.jsonl", raw_rows)
    write_jsonl(ds / "train" / "train.jsonl", splits["train"])
    write_jsonl(ds / "dev" / "dev.jsonl", splits["dev"])
    write_jsonl(ds / "test" / "test.jsonl", splits["test"])
    write_jsonl(ds / "eval_adversarial" / "adv.jsonl", splits["adv"])

    seeds_dir = ROOT / "seeds"
    seeds_dir.mkdir(parents=True, exist_ok=True)
    write_jsonl(seeds_dir / "p0_seed_index.jsonl", [r for r in raw_rows if r["source"] in ("seed_p0", "seed_golden")])

    refusal = build_refusal(rng, args.refusal_n)
    write_jsonl(ROOT / "refusal_library" / f"refusal_{args.version}.jsonl", refusal)

    st = stats(splits, refusal)
    st["version"] = args.version
    st["seed"] = args.seed
    st["gen_params"] = {
        "target_train": args.target_train,
        "min_test_per_label": args.min_test_per_label,
        "adv_budget": args.adv_budget,
        "refusal_n": args.refusal_n,
        "generator": "synthesize_batch.py@v0.4",
        "fixes": ["FIX-01", "FIX-02", "FIX-03", "FIX-04", "FIX-05", "FIX-06", "FIX-07", "FIX-09"],
    }
    # FIX-07 honest content hash over all texts
    payload = "\n".join(sorted(normalize(r["text"]) for r in raw_rows)).encode()
    st["content_hash"] = hashlib.sha256(payload).hexdigest()
    reports = ROOT / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / f"{args.version}_stats.json").write_text(
        json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (reports / f"{args.version}_gen_params.json").write_text(
        json.dumps(st["gen_params"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # stratified spot-check id sample (~288)
    ids = []
    for lab in LABELS:
        cand = [r["id"] for r in splits["train"] if r["labels"] == [lab]]
        ids.extend(cand[:20])
    ids.extend([r["id"] for r in splits["train"] if not r["labels"]][:40])
    ids.extend([r["id"] for r in splits["test"] if r["source"] != "seed_golden"][:40])
    ids.extend([r["id"] for r in splits["train"] if r["source"] == "combo"][:24])
    ids.extend([r["id"] for r in splits["adv"]][:24])
    (reports / f"{args.version}_spot_check_ids.txt").write_text("\n".join(ids) + "\n", encoding="utf-8")

    print(json.dumps(st, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
