#!/usr/bin/env python3
"""Evaluate tiny Transformer on test (+ adv) and write report."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import classification_report, f1_score, recall_score
from torch.utils.data import DataLoader
from transformers import AutoTokenizer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import LABELS, ROOT, binarize, load_split
from train_tiny import TinyMultiLabel, TextMultiLabel, encode, predict_probs

ART = ROOT / "artifacts" / "tiny_roberta_l2h128"
REPORTS = ROOT / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)
HIGH_RISK = ["contact_request", "offline_meeting", "threat"]


def eval_split(model, tokenizer, meta: dict, split: str, device) -> dict:
    rows = load_split(split)
    X, y = binarize(rows)
    y = np.asarray(y)
    enc = encode(tokenizer, X, meta["max_length"])
    ds = TextMultiLabel(enc, y.astype(np.float32))
    loader = DataLoader(ds, batch_size=128, shuffle=False)
    t0 = time.time()
    probs = predict_probs(model, loader, device)
    elapsed = time.time() - t0
    thr = float(meta["threshold"])
    pred = (probs >= thr).astype(int)

    per_label = {}
    for i, lab in enumerate(LABELS):
        per_label[lab] = {
            "f1": round(float(f1_score(y[:, i], pred[:, i], zero_division=0)), 4),
            "recall": round(float(recall_score(y[:, i], pred[:, i], zero_division=0)), 4),
            "support": int(y[:, i].sum()),
        }
    y_normal = (y.sum(axis=1) == 0).astype(int)
    fp_normal = int(((y_normal == 1) & (pred.sum(axis=1) > 0)).sum())
    n_normal = int(y_normal.sum())
    high_idx = [LABELS.index(l) for l in HIGH_RISK]
    high_recall = {
        LABELS[i]: round(float(recall_score(y[:, i], pred[:, i], zero_division=0)), 4)
        for i in high_idx
    }
    return {
        "split": split,
        "n": len(rows),
        "macro_f1": round(float(f1_score(y, pred, average="macro", zero_division=0)), 4),
        "micro_f1": round(float(f1_score(y, pred, average="micro", zero_division=0)), 4),
        "per_label": per_label,
        "high_risk_recall": high_recall,
        "normal_false_positive_rate": round(fp_normal / max(n_normal, 1), 4),
        "n_normal": n_normal,
        "threshold": thr,
        "infer_seconds": round(elapsed, 3),
        "ms_per_sample": round(elapsed * 1000 / max(len(rows), 1), 3),
        "report_text": classification_report(y, pred, target_names=LABELS, zero_division=0),
    }


def main() -> None:
    meta_path = ART / "meta.json"
    model_path = ART / "model.pt"
    if not model_path.exists():
        raise SystemExit(f"missing model: {model_path}; run train_tiny.py first")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(ART / "tokenizer")
    model = TinyMultiLabel(meta["backbone"], n_labels=len(LABELS))
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    model.to(device)
    model.eval()

    out = {
        "model_meta": meta,
        "test": eval_split(model, tokenizer, meta, "test", device),
        "adv": eval_split(model, tokenizer, meta, "adv", device),
        "gates": {
            "macro_f1_target": 0.80,
            "high_risk_recall_target": 0.90,
            "normal_fp_target": 0.03,
        },
    }
    t = out["test"]
    out["gate_results"] = {
        "macro_f1": t["macro_f1"] >= 0.80,
        "high_risk_recall": all(v >= 0.90 for v in t["high_risk_recall"].values()),
        "normal_fp": t["normal_false_positive_rate"] <= 0.03,
    }
    (REPORTS / "tiny_eval.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    md = [
        "# P2 Tiny Transformer Eval Report",
        "",
        f"- model: `{meta['model']}` / `{meta['backbone']}`",
        f"- params: **{meta['n_params']}** (~{meta['approx_fp32_mb']} MB fp32)",
        f"- data: p1/{meta['data_version']}",
        f"- threshold: {meta['threshold']}",
        f"- test macro F1: **{t['macro_f1']}** (target ≥0.80) → {'PASS' if out['gate_results']['macro_f1'] else 'FAIL'}",
        f"- high-risk recall: {t['high_risk_recall']} (target ≥0.90) → {'PASS' if out['gate_results']['high_risk_recall'] else 'FAIL'}",
        f"- normal FP rate: **{t['normal_false_positive_rate']}** (target ≤0.03) → {'PASS' if out['gate_results']['normal_fp'] else 'FAIL'}",
        f"- adv macro F1: **{out['adv']['macro_f1']}**",
        f"- test throughput (batch): ~{t['ms_per_sample']} ms/sample on `{device}`",
        "",
        "## Per-label (test)",
        "",
        "| label | f1 | recall | support |",
        "|---|---:|---:|---:|",
    ]
    for lab, m in t["per_label"].items():
        md.append(f"| {lab} | {m['f1']} | {m['recall']} | {m['support']} |")
    md.append("")
    md.append("## Classification report (test)")
    md.append("```")
    md.append(t["report_text"])
    md.append("```")
    (REPORTS / "tiny_eval.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "test": {
                    k: t[k]
                    for k in (
                        "macro_f1",
                        "micro_f1",
                        "high_risk_recall",
                        "normal_false_positive_rate",
                        "ms_per_sample",
                    )
                },
                "gates": out["gate_results"],
                "adv_macro_f1": out["adv"]["macro_f1"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
