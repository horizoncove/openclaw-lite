#!/usr/bin/env python3
"""Evaluate baseline on test (+ optional adv) and write report."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import classification_report, f1_score, recall_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import LABELS, ROOT, binarize, load_split

ART = ROOT / "artifacts" / "baseline_tfidf"
REPORTS = ROOT / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)

HIGH_RISK = ["contact_request", "offline_meeting", "threat"]


def eval_split(bundle, split: str) -> dict:
    rows = load_split(split)
    X, y = binarize(rows)
    y = np.asarray(y)
    Xt = bundle["vectorizer"].transform(X).tocsr().copy()
    pred = bundle["classifier"].predict(Xt)
    per_label = {}
    for i, lab in enumerate(LABELS):
        per_label[lab] = {
            "f1": round(float(f1_score(y[:, i], pred[:, i], zero_division=0)), 4),
            "recall": round(float(recall_score(y[:, i], pred[:, i], zero_division=0)), 4),
            "support": int(y[:, i].sum()),
        }
    # normal = all-zero
    y_normal = (y.sum(axis=1) == 0).astype(int)
    p_normal = (pred.sum(axis=1) == 0).astype(int)
    # false block proxy: true normal predicted any positive label
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
        "report_text": classification_report(
            y, pred, target_names=LABELS, zero_division=0
        ),
    }


def main() -> None:
    model_path = ART / "model.joblib"
    if not model_path.exists():
        raise SystemExit(f"missing model: {model_path}; run train_baseline.py first")
    bundle = joblib.load(model_path)
    out = {
        "model_meta": json.loads((ART / "meta.json").read_text(encoding="utf-8")),
        "test": eval_split(bundle, "test"),
        "adv": eval_split(bundle, "adv"),
        "gates": {
            "macro_f1_target": 0.80,
            "high_risk_recall_target": 0.90,
            "normal_fp_target": 0.03,
        },
    }
    # gate checks on test
    t = out["test"]
    out["gate_results"] = {
        "macro_f1": t["macro_f1"] >= 0.80,
        "high_risk_recall": all(v >= 0.90 for v in t["high_risk_recall"].values()),
        "normal_fp": t["normal_false_positive_rate"] <= 0.03,
    }
    (REPORTS / "baseline_eval.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    md = [
        "# P2 Baseline Eval Report",
        "",
        f"- model: `{out['model_meta']['model']}`",
        f"- data: p1/{out['model_meta']['data_version']}",
        f"- test macro F1: **{t['macro_f1']}** (target ≥0.80) → {'PASS' if out['gate_results']['macro_f1'] else 'FAIL'}",
        f"- high-risk recall: {t['high_risk_recall']} (target ≥0.90) → {'PASS' if out['gate_results']['high_risk_recall'] else 'FAIL'}",
        f"- normal FP rate: **{t['normal_false_positive_rate']}** (target ≤0.03) → {'PASS' if out['gate_results']['normal_fp'] else 'FAIL'}",
        f"- adv macro F1: **{out['adv']['macro_f1']}**",
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
    (REPORTS / "baseline_eval.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps({"test": {k: t[k] for k in ("macro_f1", "micro_f1", "high_risk_recall", "normal_false_positive_rate")}, "gates": out["gate_results"], "adv_macro_f1": out["adv"]["macro_f1"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
