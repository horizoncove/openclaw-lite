#!/usr/bin/env python3
"""Fine-tune a tiny Chinese Transformer multilabel classifier on P1 v0.4."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import f1_score
from torch.utils.data import DataLoader, Dataset
from transformers import AutoModel, AutoTokenizer, get_linear_schedule_with_warmup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import LABELS, ROOT, binarize, load_split

DEFAULT_MODEL = "uer/chinese_roberta_L-2_H-128"
ART = ROOT / "artifacts" / "tiny_roberta_l2h128"


class TextMultiLabel(Dataset):
    def __init__(self, encodings: dict, labels: np.ndarray):
        self.encodings = encodings
        self.labels = labels.astype(np.float32)

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> dict:
        item = {k: torch.tensor(v[idx]) for k, v in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])
        return item


class TinyMultiLabel(nn.Module):
    def __init__(self, backbone_name: str, n_labels: int, dropout: float = 0.1):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(backbone_name)
        hidden = self.backbone.config.hidden_size
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(hidden, n_labels)

    def forward(self, input_ids, attention_mask, labels=None):
        out = self.backbone(input_ids=input_ids, attention_mask=attention_mask)
        # mean pool over non-pad tokens (no pooler in this checkpoint)
        mask = attention_mask.unsqueeze(-1).float()
        summed = (out.last_hidden_state * mask).sum(dim=1)
        denom = mask.sum(dim=1).clamp(min=1e-6)
        pooled = summed / denom
        logits = self.classifier(self.dropout(pooled))
        loss = None
        if labels is not None:
            loss = nn.functional.binary_cross_entropy_with_logits(logits, labels)
        return {"loss": loss, "logits": logits}


def encode(tokenizer, texts: list[str], max_length: int) -> dict:
    enc = tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=max_length,
        return_tensors=None,
    )
    return {k: enc[k] for k in ("input_ids", "attention_mask")}


@torch.no_grad()
def predict_probs(model, loader, device) -> np.ndarray:
    model.eval()
    probs = []
    for batch in loader:
        ids = batch["input_ids"].to(device)
        mask = batch["attention_mask"].to(device)
        logits = model(ids, mask)["logits"]
        probs.append(torch.sigmoid(logits).cpu().numpy())
    return np.vstack(probs)


def tune_threshold(y_true: np.ndarray, probs: np.ndarray) -> float:
    best_t, best_f1 = 0.5, -1.0
    for t in np.linspace(0.2, 0.8, 25):
        pred = (probs >= t).astype(int)
        f1 = f1_score(y_true, pred, average="macro", zero_division=0)
        if f1 > best_f1:
            best_f1, best_t = f1, float(t)
    return best_t


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--epochs", type=int, default=2)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--max-length", type=int, default=64)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=ART)
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    args.out.mkdir(parents=True, exist_ok=True)

    train_rows = load_split("train")
    dev_rows = load_split("dev")
    X_train, y_train = binarize(train_rows)
    X_dev, y_dev = binarize(dev_rows)
    y_train_np = np.asarray(y_train, dtype=np.float32)
    y_dev_np = np.asarray(y_dev, dtype=np.float32)

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    train_enc = encode(tokenizer, X_train, args.max_length)
    dev_enc = encode(tokenizer, X_dev, args.max_length)
    train_ds = TextMultiLabel(train_enc, y_train_np)
    dev_ds = TextMultiLabel(dev_enc, y_dev_np)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    dev_loader = DataLoader(dev_ds, batch_size=args.batch_size * 2, shuffle=False)

    model = TinyMultiLabel(args.model, n_labels=len(LABELS)).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    total_steps = max(1, len(train_loader) * args.epochs)
    sched = get_linear_schedule_with_warmup(
        opt, num_warmup_steps=max(1, total_steps // 10), num_training_steps=total_steps
    )

    t0 = time.time()
    history = []
    best_dev = -1.0
    best_state = None
    for epoch in range(1, args.epochs + 1):
        model.train()
        losses = []
        for batch in train_loader:
            opt.zero_grad(set_to_none=True)
            ids = batch["input_ids"].to(device)
            mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)
            out = model(ids, mask, labels)
            out["loss"].backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            sched.step()
            losses.append(float(out["loss"].item()))
        probs = predict_probs(model, dev_loader, device)
        thr = tune_threshold(y_dev_np, probs)
        pred = (probs >= thr).astype(int)
        macro = float(f1_score(y_dev_np, pred, average="macro", zero_division=0))
        micro = float(f1_score(y_dev_np, pred, average="micro", zero_division=0))
        row = {
            "epoch": epoch,
            "train_loss": round(float(np.mean(losses)), 4),
            "dev_macro_f1": round(macro, 4),
            "dev_micro_f1": round(micro, 4),
            "threshold": round(thr, 4),
        }
        history.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
        if macro > best_dev:
            best_dev = macro
            best_state = {
                "model": {k: v.detach().cpu().clone() for k, v in model.state_dict().items()},
                "threshold": thr,
            }

    train_sec = time.time() - t0
    assert best_state is not None
    model.load_state_dict(best_state["model"])
    thr = best_state["threshold"]

    torch.save(model.state_dict(), args.out / "model.pt")
    tokenizer.save_pretrained(args.out / "tokenizer")
    n_params = sum(p.numel() for p in model.parameters())
    meta = {
        "model": "tiny_roberta_l2h128_multilabel",
        "backbone": args.model,
        "labels": LABELS,
        "data_version": "v0.4",
        "n_train": len(X_train),
        "n_dev": len(X_dev),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "max_length": args.max_length,
        "seed": args.seed,
        "device": str(device),
        "n_params": n_params,
        "approx_fp32_mb": round(n_params * 4 / 1024 / 1024, 2),
        "train_seconds": round(train_sec, 2),
        "threshold": round(float(thr), 4),
        "dev_macro_f1_best": round(float(best_dev), 4),
        "history": history,
        "artifact": str(args.out / "model.pt"),
        "note": "small Chinese Transformer for on-device path; export ONNX separately",
    }
    (args.out / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: meta[k] for k in (
        "model", "backbone", "n_params", "approx_fp32_mb", "train_seconds",
        "threshold", "dev_macro_f1_best", "device",
    )}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
