#!/usr/bin/env python3
"""Validate P1 dataset splits (v0.4 gates: desalt, U03, ethics, refusal)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABELS = {
    "age_probe",
    "privacy_request",
    "contact_request",
    "school_request",
    "photo_request",
    "offline_meeting",
    "emotional_manipulation",
    "threat",
}
LEVELS = {"S0", "S1", "S2", "S3"}
REQUIRED = {
    "id",
    "text",
    "labels",
    "expected_level",
    "reason_codes",
    "split",
    "source",
    "review_status",
    "annotator",
    "ts",
}
ALLOWED_REVIEW = {"auto", "imported", "spot_checked", "needs_review", "rejected"}
REASON_ENUM = {
    "R_AGE_PROBE",
    "R_PRIVACY_REQUEST",
    "R_CONTACT_REQUEST",
    "R_SCHOOL_REQUEST",
    "R_PHOTO_REQUEST",
    "R_OFFLINE_MEETING",
    "R_EMOTIONAL_MANIPULATION",
    "R_THREAT",
    "R_FREQ_ESCALATE",
    "R_COMBO_ESCALATE",
    "R_SECRECY_ESCALATE",
    "R_NEEDS_REVIEW",
}

# FIX-01 salt / urgency fingerprints
SALT_RE = re.compile(
    r"(我说第\d+次|认真问哦[·.]\d+|别打哈哈#?\d*|回我一句就行|拜托回一下|"
    r"就问这一下|别敷衍\d*号问题|这次算\d+|（笔记\d+）|（问法\d+）|"
    r"·\d{3,}|\(\d{3,}\))"
)
S0_URGENCY_RE = re.compile(r"(回我一句就行|拜托回一下|就问这一下|别打哈哈|我说第|认真问哦|别敷衍)")

# FIX-09 ethics lint (synthetic corpora should not contain these)
ETHICS_RE = re.compile(
    r"(儿童色情|幼女|援交|裸聊|色情|性交|性爱|强奸|迷奸|"
    r"\d{1,3}号楼\d{3,4}室|详细身份证号)"
)

U03_TIME = ["今天", "明天", "后天", "上午", "下午", "晚上", "点", "分", "周末", "放学后"]
U03_PLACE = ["校门口", "小区", "楼下", "公园", "车站", "地铁", "门口", "家", "咖啡"]


def normalize(text: str) -> str:
    text = text.strip().replace("\u3000", " ")
    text = re.sub(r"\s+", "", text)
    text = text.replace("？", "?").replace("！", "!").replace("，", ",")
    return text.lower()


def skeleton(text: str) -> str:
    t = normalize(text)
    for p in ["那个", "诶", "话说", "顺便问下", "真心问一句", "嗨", "对了", "冒昧问下",
              "坦白说", "好奇一下", "方便的话", "如果不介意", "有空时", "悄悄说",
              "别多想", "随便聊聊", "嗯…", "可以吗", "怎么样", "行吗"]:
        if t.startswith(p):
            t = t[len(p):]
    t = re.sub(r"[?!~。！？~哈呀嘛呗哦呢啦啊]+$", "", t)
    return t


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            raise SystemExit(f"JSON error {path}:{i}: {e}")
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="v0.4")
    ap.add_argument("--min-train", type=int, default=30000)
    ap.add_argument("--min-eval", type=int, default=2000)
    ap.add_argument("--min-test-per-label", type=int, default=100)
    ap.add_argument("--min-refusal", type=int, default=500)
    ap.add_argument("--max-s0-urgency-rate", type=float, default=0.10)
    ap.add_argument("--max-adv-skeleton-overlap", type=float, default=0.05)
    args = ap.parse_args()

    ds = ROOT / "datasets" / args.version
    errors: list[str] = []
    warnings: list[str] = []

    paths = {
        "train": ds / "train" / "train.jsonl",
        "dev": ds / "dev" / "dev.jsonl",
        "test": ds / "test" / "test.jsonl",
        "adv": ds / "eval_adversarial" / "adv.jsonl",
    }
    for name, p in paths.items():
        if not p.exists():
            errors.append(f"missing file: {p}")
    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    splits = {k: load_jsonl(v) for k, v in paths.items()}
    refusal_path = ROOT / "refusal_library" / f"refusal_{args.version}.jsonl"
    if not refusal_path.exists():
        errors.append(f"missing refusal library: {refusal_path}")
        refusal = []
    else:
        refusal = load_jsonl(refusal_path)

    seen_ids = set()
    salt_hits = 0
    ethics_hits = 0
    u03_miss = 0
    for name, rows in splits.items():
        for r in rows:
            missing = REQUIRED - set(r)
            if missing:
                errors.append(f"{name}/{r.get('id')}: missing {sorted(missing)}")
            if r.get("split") != name:
                errors.append(f"{r.get('id')}: split field {r.get('split')} != file {name}")
            if r.get("id") in seen_ids:
                errors.append(f"duplicate id {r.get('id')}")
            seen_ids.add(r.get("id"))
            if not isinstance(r.get("text"), str) or len(r["text"].strip()) < 2:
                errors.append(f"{r.get('id')}: bad text")
            labs = r.get("labels")
            if not isinstance(labs, list) or any(l not in LABELS for l in labs):
                errors.append(f"{r.get('id')}: bad labels {labs}")
            if r.get("expected_level") not in LEVELS:
                errors.append(f"{r.get('id')}: bad level")
            if r.get("review_status") not in ALLOWED_REVIEW:
                errors.append(f"{r.get('id')}: bad review_status {r.get('review_status')}")
            if labs and r.get("expected_level") == "S0":
                errors.append(f"{r.get('id')}: labels present but S0")
            if not labs and r.get("expected_level") != "S0":
                warnings.append(f"{r.get('id')}: empty labels but level {r.get('expected_level')}")
            if "threat" in (labs or []) and r.get("expected_level") != "S3":
                errors.append(f"{r.get('id')}: threat must be S3")
            for code in r.get("reason_codes") or []:
                if code not in REASON_ENUM:
                    errors.append(f"{r.get('id')}: unknown reason_code {code}")
            # FIX-01
            if SALT_RE.search(r.get("text") or ""):
                salt_hits += 1
            # FIX-09
            if ETHICS_RE.search(r.get("text") or ""):
                ethics_hits += 1
            # FIX-03 U03
            if "offline_meeting" in (labs or []):
                if any(w in r["text"] for w in U03_TIME + U03_PLACE):
                    if r.get("expected_level") != "S3":
                        u03_miss += 1
            # FIX-04 combo reason
            labs_set = set(labs or [])
            codes = set(r.get("reason_codes") or [])
            if "age_probe" in labs_set and "contact_request" in labs_set:
                if "R_COMBO_ESCALATE" not in codes:
                    errors.append(f"{r.get('id')}: age+contact missing R_COMBO_ESCALATE")

    if salt_hits:
        errors.append(f"salt/urgency fingerprint hits: {salt_hits}")
    if ethics_hits:
        errors.append(f"ethics lint hits: {ethics_hits}")
    if u03_miss:
        errors.append(f"U03 offline+time/place not S3: {u03_miss}")

    # isolation
    norm_map: dict[str, str] = {}
    for name, rows in splits.items():
        for r in rows:
            key = normalize(r["text"])
            if key in norm_map and norm_map[key] != name:
                errors.append(
                    f"leakage: text appears in {norm_map[key]} and {name} :: {r['text'][:40]}"
                )
            else:
                norm_map[key] = name

    n_train = len(splits["train"])
    n_eval = len(splits["dev"]) + len(splits["test"]) + len(splits["adv"])
    if n_train < args.min_train:
        errors.append(f"train {n_train} < {args.min_train}")
    if n_eval < args.min_eval:
        errors.append(f"eval(dev+test+adv) {n_eval} < {args.min_eval}")
    if len(refusal) < args.min_refusal:
        errors.append(f"refusal {len(refusal)} < {args.min_refusal}")

    for lab in sorted(LABELS):
        n = sum(1 for r in splits["test"] if lab in r["labels"])
        if n < args.min_test_per_label:
            errors.append(f"test positives for {lab}: {n} < {args.min_test_per_label}")

    s0_train = [r for r in splits["train"] if not r["labels"]]
    s0_ratio = len(s0_train) / max(n_train, 1)
    if s0_ratio < 0.25:
        errors.append(f"train S0/hard-neg ratio {s0_ratio:.2%} < 25%")
    urg = sum(1 for r in s0_train if S0_URGENCY_RE.search(r["text"]))
    urg_rate = urg / max(len(s0_train), 1)
    if urg_rate > args.max_s0_urgency_rate:
        errors.append(f"S0 urgency rate {urg_rate:.2%} > {args.max_s0_urgency_rate:.0%}")

    # adv skeleton overlap vs train positives
    train_sk = {skeleton(r["text"]) for r in splits["train"] if r["labels"]}
    if splits["adv"]:
        overlap = sum(1 for r in splits["adv"] if skeleton(r["text"]) in train_sk)
        rate = overlap / len(splits["adv"])
        if rate > args.max_adv_skeleton_overlap:
            errors.append(f"adv∩train skeleton overlap {rate:.2%} > {args.max_adv_skeleton_overlap:.0%}")

    # refusal checks FIX-06
    for r in refusal:
        if r.get("level") == "S1" and re.search(r"(拦截|阻止|限制发送)", r.get("text") or ""):
            errors.append(f"refusal {r.get('id')}: S1 contains block verbs")
        if "audience" not in r or "action" not in r:
            errors.append(f"refusal {r.get('id')}: missing audience/action")

    # golden not in train
    p0_golden = ROOT.parent / "p0" / "golden" / "golden_set.jsonl"
    if p0_golden.exists():
        for line in p0_golden.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            g = json.loads(line)
            if norm_map.get(normalize(g["text"])) == "train":
                errors.append(f"golden leaked into train: {g['text'][:40]}")

    # pre-stamp check: spot_checked should be rare/absent pre-human review
    spot = sum(1 for rows in splits.values() for r in rows if r.get("review_status") == "spot_checked")
    if spot:
        warnings.append(f"spot_checked count={spot} (expected 0 before human review)")

    print("P1 validate", args.version)
    print(
        f"train={n_train} dev={len(splits['dev'])} test={len(splits['test'])} "
        f"adv={len(splits['adv'])} refusal={len(refusal)}"
    )
    print(f"s0_ratio={s0_ratio:.2%} s0_urgency={urg_rate:.2%} salt_hits={salt_hits} u03_miss={u03_miss}")
    for lab in sorted(LABELS):
        n = sum(1 for r in splits["test"] if lab in r["labels"])
        print(f"  test[{lab}]={n}")
    if warnings:
        print(f"warnings: {len(warnings)}")
        for w in warnings[:20]:
            print(" !", w)
    if errors:
        print("FAIL", f"{len(errors)} errors")
        for e in errors[:50]:
            print(" -", e)
        if len(errors) > 50:
            print(f" - ... {len(errors)-50} more")
        return 1
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
