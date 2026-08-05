#!/usr/bin/env python3
"""Assign building zones to brands per annotated master plan."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_PATH = ROOT / "js" / "brands-data.js"
JSON_PATH = ROOT / "data" / "brands.json"

# macro, macroLabel, building, side, zone
OVERRIDES: dict[str, tuple[str, str, str, str, str]] = {
    "蜜雪冰城": ("hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧"),
    "瑞幸": ("hub-office", "办公商务", "3#", "内侧", "3# · 1F 内侧"),
    "麦当劳": ("hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧"),
    "肯德基": ("hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧"),
    "海底捞（校园店/嗨捞）": ("hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 2F 内侧"),
    "海伦司": ("hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 1F–2F 日咖夜酒"),
    "好特卖": ("hub-hotel", "酒店生活", "5#", "—", "5# · 1F"),
    "嗨特购": ("hub-hotel", "酒店生活", "5#", "—", "5# · 1F"),
    "魅KTV": ("hub-ent", "娱乐 Hub", "7#", "—", "7# · 3F–4F"),
    "罗森": ("hub-hotel", "酒店生活", "4#", "外侧", "4# · 1F 外侧"),
    "唐久/每一天": ("hub-hotel", "酒店生活", "4#", "外侧", "4# · 1F 外侧"),
    "外摆美食市集": ("hub-plaza", "方形广场", "方形广场", "—", "方形广场 · 外摆市集"),
    "魏家凉皮": ("hub-hotel", "酒店生活", "4#", "内侧", "4# · 1F 内侧美食街"),
    "喜茶": ("hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧"),
    "奈雪": ("hub-office", "办公商务", "3#", "内侧", "3# · 1F 内侧"),
    "小米之家": ("hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧"),
    "达美乐": ("hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧"),
    "西安/西北首店级品牌1-2个": ("hub-landmark", "地标广场", "地标广场", "—", "地标广场 · 首店/快闪"),
    "滔搏/胜道体育（多品牌奥莱店）": ("hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧 · 400–600㎡"),
    "Nike Factory Store（直营奥莱）": ("hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧"),
    "Adidas Factory Outlet": ("hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧"),
    "考研机构（文都/新东方考研）": ("hub-office", "办公商务", "3#", "—", "3# · 3F+ 教培（非街铺）"),
    "考公/教资培训": ("hub-office", "办公商务", "3#", "—", "3# · 3F+ 教培（非街铺）"),
    "怡康/老百姓大药房": ("hub-hotel", "酒店生活", "4#", "外侧", "4# · 1F 外侧"),
    "泡泡玛特": ("hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 1F 内侧 · 谷子/潮玩"),
}

ENT_INNER_DINING = {
    "马路边边", "袁记串串香", "九田家", "酒拾烤肉", "半天妖", "兰湘子",
    "连锁烧烤+精酿（如聚点串吧）", "怂火锅", "西塔老太太", "太二酸菜鱼",
    "滨寿司/争鲜", "韩式拌饭/部队锅", "平价寿司/日式拉面", "鸡公煲/黄焖鸡",
    "单人烤鱼饭", "陕西本地面馆/泡馍",
}

ENT_UPPER = {
    "乐刻", "连锁台球俱乐部（星牌/乔氏）", "电竞馆/网咖（杰拉/网鱼）",
    "剧本杀/桌游吧", "密室逃脱", "自助台球厅", "超级猩猩", "汤姆熊/大玩家电玩城",
    "小型Livehouse（疆进酒/MAO类）",
}

ENT_INNER_LIGHT = {"TOP TOY", "抓娃娃专门店", "tufting/手工DIY店", "COMMUNE公社", "Perry's", "社区精酿酒吧"}


def assign(brand: dict) -> dict:
    name = brand["name"]
    cat = brand["cat"]
    subcat = brand.get("subcat", "")
    floor = brand.get("floor", "")

    if name in OVERRIDES:
        macro, macro_label, building, side, zone = OVERRIDES[name]
    elif cat == "运动奥莱":
        macro, macro_label, building, side, zone = (
            "hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧",
        )
    elif cat == "钩子业态":
        macro, macro_label, building, side, zone = (
            "hub-plaza", "方形广场", "方形广场", "—", "方形广场 · 弹性市集",
        )
    elif cat == "教育培训":
        macro, macro_label, building, side, zone = (
            "hub-office", "办公商务", "3#", "—", "3# · 3F+ 教培（非街铺）",
        )
    elif cat == "生活配套":
        if floor.startswith("二层"):
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "4#", "—", "4# · 2F 配套",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "4#", "外侧", "4# · 1F 外侧",
            )
    elif cat == "夜间经济":
        macro, macro_label, building, side, zone = (
            "hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 1F–2F 日咖夜酒",
        )
    elif cat == "文体娱":
        if name in ENT_UPPER or subcat in {"KTV", "健身", "台球", "电竞", "桌游", "密室", "娱乐"}:
            macro, macro_label, building, side, zone = (
                "hub-ent", "娱乐 Hub", "7#", "—", "7# · 3F–4F",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 1F–2F",
            )
    elif cat == "正餐聚餐":
        if name in ENT_INNER_DINING or floor.startswith("二层"):
            macro, macro_label, building, side, zone = (
                "hub-ent", "娱乐 Hub", "7#", "内侧", "7# · 1F–2F 内侧",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "4#", "内侧", "4# · 1F 内侧美食街",
            )
    elif cat == "快餐轻食":
        if floor in {"一层端头", "一层临街"} or name in {"麦当劳", "肯德基", "达美乐", "赛百味"}:
            macro, macro_label, building, side, zone = (
                "hub-office", "办公商务", "3#", "外侧", "3# · 1F 外侧",
            )
        elif subcat in {"烘焙", "甜品"} or name in {"好利来", "鲍师傅", "御品轩", "鲜芋仙", "满记甜品"}:
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "4#", "内侧", "4# · 1F 内侧美食街",
            )
        elif floor == "一层档口":
            macro, macro_label, building, side, zone = (
                "hub-plaza", "方形广场", "方形广场", "—", "方形广场 · 档口/花车",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-plaza", "中央连接", "6#", "—", "6# · 1F 填铺",
            )
    elif cat == "茶饮咖啡":
        if floor in {"一层端头", "一层临街"} or brand["tier"] in {"A", "D"} and floor == "一层":
            macro, macro_label, building, side, zone = (
                "hub-ent", "娱乐 Hub", "7#", "外侧", "7# · 1F 外侧形象店",
            )
        elif name in {"Manner", "M Stand"}:
            macro, macro_label, building, side, zone = (
                "hub-office", "办公商务", "3#", "内侧", "3# · 1F 内侧",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-plaza", "中央连接", "6#", "—", "6# · 1F 填铺",
            )
    elif cat == "零售":
        if name in {"名创优品", "The Green Party", "三福时尚"}:
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "5#", "—", "5# · 1F",
            )
        elif subcat in {"数码", "眼镜"}:
            macro, macro_label, building, side, zone = (
                "hub-west", "西侧配套", "8#", "—", "8# · 1F 办公配套",
            )
        else:
            macro, macro_label, building, side, zone = (
                "hub-hotel", "酒店生活", "4#", "—", "4#/5# · 1F",
            )
    else:
        macro, macro_label, building, side, zone = (
            "hub-plaza", "中央连接", "6#", "—", "6# · 1F 填铺",
        )

    brand["macro"] = macro
    brand["macroLabel"] = macro_label
    brand["building"] = building
    brand["side"] = side
    brand["zone"] = zone
    return brand


def load_brands() -> list[dict]:
    text = JS_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.XPARK_BRANDS\s*=\s*(\[.*?\]);", text, re.S)
    if not match:
        raise SystemExit("Could not parse brands-data.js")
    return json.loads(match.group(1))


def write_outputs(brands: list[dict]) -> None:
    js_body = json.dumps(brands, ensure_ascii=False, indent=2)
    JS_PATH.write_text(
        f"window.XPARK_BRANDS = {js_body};\n",
        encoding="utf-8",
    )
    JSON_PATH.write_text(
        json.dumps(brands, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    brands = [assign(dict(b)) for b in load_brands()]
    write_outputs(brands)
    print(f"Updated {len(brands)} brands")
    print("Macro zones:", Counter(b["macroLabel"] for b in brands))
    print("Buildings:", Counter(b["building"] for b in brands))


if __name__ == "__main__":
    main()
