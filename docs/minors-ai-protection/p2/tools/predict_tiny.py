#!/usr/bin/env python3
"""CLI demo: Chinese sentence → multilabel scores (tiny ONNX or PyTorch)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import CONFIG, LABELS, ROOT

ART = ROOT / "artifacts" / "tiny_roberta_l2h128"
LEVEL = CONFIG["default_level"]
ORDER = CONFIG["level_order"]


def level_hint(keys: list[str]) -> str:
    if not keys:
        return "S0"
    ranks = {lv: i for i, lv in enumerate(ORDER)}
    best = "S0"
    for k in keys:
        lv = LEVEL.get(k, "S0")
        if ranks.get(lv, 0) > ranks.get(best, 0):
            best = lv
    return best


def predict_onnx(text: str, meta: dict) -> list[float]:
    import onnxruntime as ort
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(ART / "tokenizer")
    enc = tok(
        text,
        padding="max_length",
        truncation=True,
        max_length=int(meta["max_length"]),
        return_tensors="np",
    )
    sess = ort.InferenceSession(
        str(ART / "model.onnx"), providers=["CPUExecutionProvider"]
    )
    logits = sess.run(
        None,
        {
            "input_ids": enc["input_ids"].astype(np.int64),
            "attention_mask": enc["attention_mask"].astype(np.int64),
        },
    )[0][0]
    return (1.0 / (1.0 + np.exp(-logits))).tolist()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", help="input sentence")
    ap.add_argument("--backend", choices=("onnx",), default="onnx")
    args = ap.parse_args()
    text = args.text
    if not text:
        text = sys.stdin.read().strip()
    if not text:
        raise SystemExit("empty text")
    meta = json.loads((ART / "meta.json").read_text(encoding="utf-8"))
    probs = predict_onnx(text, meta)
    thr = float(meta["threshold"])
    labels = [
        {"key": lab, "score": round(float(p), 4)}
        for lab, p in zip(LABELS, probs)
        if p >= thr
    ]
    labels.sort(key=lambda x: -x["score"])
    out = {
        "labels": labels,
        "expected_level_hint": level_hint([x["key"] for x in labels]),
        "model_ver": "tiny_roberta_l2h128@p2-v0.2",
        "data_ver": "p1-v1.0/v0.4",
        "threshold": thr,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
