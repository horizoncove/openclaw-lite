#!/usr/bin/env python3
"""Load P1 v0.4 JSONL splits for P2 training/eval."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P1 = ROOT.parent / "p1"
CONFIG = json.loads((ROOT / "configs" / "labels.json").read_text(encoding="utf-8"))
LABELS: list[str] = CONFIG["labels"]
DATA_VER = CONFIG["data_version"]


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def split_path(split: str) -> Path:
    if split == "adv":
        return P1 / "datasets" / DATA_VER / "eval_adversarial" / "adv.jsonl"
    return P1 / "datasets" / DATA_VER / split / f"{split}.jsonl"


def load_split(split: str) -> list[dict]:
    return load_jsonl(split_path(split))


def binarize(rows: list[dict]) -> tuple[list[str], list[list[int]]]:
    texts, ys = [], []
    for r in rows:
        texts.append(r["text"])
        labs = set(r.get("labels") or [])
        ys.append([1 if lab in labs else 0 for lab in LABELS])
    return texts, ys


def expected_levels(rows: list[dict]) -> list[str]:
    return [r.get("expected_level", "S0") for r in rows]
