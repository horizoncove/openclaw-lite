#!/usr/bin/env python3
"""Export tiny multilabel classifier to ONNX and measure size/latency."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from transformers import AutoTokenizer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import LABELS, ROOT, load_split
from train_tiny import TinyMultiLabel

ART = ROOT / "artifacts" / "tiny_roberta_l2h128"


class ExportWrapper(torch.nn.Module):
    """ONNX-friendly: returns logits only."""

    def __init__(self, model: TinyMultiLabel):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        return self.model(input_ids, attention_mask)["logits"]


def main() -> None:
    meta_path = ART / "meta.json"
    model_path = ART / "model.pt"
    if not model_path.exists():
        raise SystemExit(f"missing model: {model_path}; run train_tiny.py first")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    max_length = int(meta["max_length"])

    tokenizer = AutoTokenizer.from_pretrained(ART / "tokenizer")
    model = TinyMultiLabel(meta["backbone"], n_labels=len(LABELS))
    model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
    model.eval()
    wrapper = ExportWrapper(model)
    wrapper.eval()

    texts = [r["text"] for r in load_split("test")[:64]]
    enc = tokenizer(
        texts,
        padding="max_length",
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )
    dummy_ids = enc["input_ids"]
    dummy_mask = enc["attention_mask"]

    onnx_path = ART / "model.onnx"
    torch.onnx.export(
        wrapper,
        (dummy_ids[:1], dummy_mask[:1]),
        str(onnx_path),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq"},
            "attention_mask": {0: "batch", 1: "seq"},
            "logits": {0: "batch"},
        },
        opset_version=17,
        dynamo=False,
    )

    size_mb = onnx_path.stat().st_size / 1024 / 1024

    # ORT latency: warmup + single-sample P50/P95
    import onnxruntime as ort

    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    ids_np = dummy_ids[:1].numpy().astype(np.int64)
    mask_np = dummy_mask[:1].numpy().astype(np.int64)
    feeds = {"input_ids": ids_np, "attention_mask": mask_np}
    for _ in range(20):
        sess.run(None, feeds)
    times = []
    for _ in range(200):
        t0 = time.perf_counter()
        sess.run(None, feeds)
        times.append((time.perf_counter() - t0) * 1000)
    times_sorted = sorted(times)
    p50 = times_sorted[len(times_sorted) // 2]
    p95 = times_sorted[int(len(times_sorted) * 0.95)]

    report = {
        "onnx_path": str(onnx_path),
        "size_mb": round(size_mb, 3),
        "size_target_mb": 30,
        "size_pass": size_mb <= 30,
        "latency_ms_cpu_single": {
            "p50": round(p50, 3),
            "p95": round(p95, 3),
            "n": len(times),
            "note": "CPU ORT single-sample; not mid-range phone",
        },
        "latency_target_p95_ms": 80,
        "latency_pass_cpu_proxy": p95 <= 80,
        "threshold": meta["threshold"],
        "labels": LABELS,
        "max_length": max_length,
        "n_params": meta["n_params"],
    }
    (ART / "onnx_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    # also copy summary into reports/
    reports = ROOT / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "tiny_onnx.md").write_text(
        "\n".join(
            [
                "# P2 Tiny ONNX Export",
                "",
                f"- path: `{onnx_path}`",
                f"- size: **{report['size_mb']} MB** (target ≤30) → {'PASS' if report['size_pass'] else 'FAIL'}",
                f"- CPU ORT P50/P95: **{report['latency_ms_cpu_single']['p50']} / {report['latency_ms_cpu_single']['p95']} ms**",
                f"- P95 target ≤80ms (中端机目标；此处为 CPU 代理) → {'PASS' if report['latency_pass_cpu_proxy'] else 'FAIL (proxy only)'}",
                f"- params: {meta['n_params']}",
                f"- threshold: {meta['threshold']}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
