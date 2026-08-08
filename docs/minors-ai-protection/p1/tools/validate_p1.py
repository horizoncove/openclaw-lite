#!/usr/bin/env python3
"""Validate P1 dataset splits against schema rules and isolation gates."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
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
SPLITS = {"train", "dev", "test", "adv"}
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


def normalize(text: str) -> str:
    text = text.strip().replace("\u3000", " ")
    text = re.sub(r"\s+", "", text)
    text = text.replace("？", "?").replace("！", "!").replace("，", ",")
    return text.lower()


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
    ap.add_argument("--version", default="v0.1")
    ap.add_argument("--min-train", type=int, default=1500)
    ap.add_argument("--min-eval", type=int, default=500)
    ap.add_argument("--min-test-per-label", type=int, default=40)
    ap.add_argument("--min-refusal", type=int, default=200)
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

    # schema-ish checks
    seen_ids = set()
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
            if labs and r.get("expected_level") == "S0":
                errors.append(f"{r.get('id')}: labels present but S0")
            if not labs and r.get("expected_level") != "S0":
                # allow needs_review style? not in v0.1 — warn
                warnings.append(f"{r.get('id')}: empty labels but level {r.get('expected_level')}")
            if "threat" in (labs or []) and r.get("expected_level") != "S3":
                errors.append(f"{r.get('id')}: threat must be S3")

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

    # size gates
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

    s0_train = sum(1 for r in splits["train"] if not r["labels"])
    s0_ratio = s0_train / max(n_train, 1)
    if s0_ratio < 0.25:
        errors.append(f"train S0/hard-neg ratio {s0_ratio:.2%} < 25% ({s0_train}/{n_train})")

    # golden should not be in train
    p0_golden = ROOT.parent / "p0" / "golden" / "golden_set.jsonl"
    if p0_golden.exists():
        for line in p0_golden.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            g = json.loads(line)
            key = normalize(g["text"])
            if norm_map.get(key) == "train":
                errors.append(f"golden leaked into train: {g['text'][:40]}")

    print("P1 validate", args.version)
    print(f"train={n_train} dev={len(splits['dev'])} test={len(splits['test'])} adv={len(splits['adv'])} refusal={len(refusal)}")
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
