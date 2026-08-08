#!/usr/bin/env python3
"""Train TF-IDF + OneVsRest logistic baseline on P1 v0.4."""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import f1_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
from datautil import LABELS, ROOT, binarize, load_split

ART = ROOT / "artifacts" / "baseline_tfidf"
ART.mkdir(parents=True, exist_ok=True)


def main() -> None:
    train = load_split("train")
    dev = load_split("dev")
    X_train, y_train = binarize(train)
    X_dev, y_dev = binarize(dev)
    y_train = np.asarray(y_train, dtype=np.int32)
    y_dev = np.asarray(y_dev, dtype=np.int32)

    vec = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 4),
        min_df=2,
        max_features=80000,
    )
    clf = OneVsRestClassifier(
        LogisticRegression(
            max_iter=300,
            solver="liblinear",
            class_weight="balanced",
        ),
        n_jobs=1,  # avoid sparse writeback issues in forked workers
    )

    t0 = time.time()
    Xt = vec.fit_transform(X_train)
    # materialize CSR copy to avoid read-only backing buffers
    Xt = Xt.tocsr().copy()
    clf.fit(Xt, y_train)
    train_sec = time.time() - t0

    Xd = vec.transform(X_dev).tocsr().copy()
    pred = clf.predict(Xd)
    macro = f1_score(y_dev, pred, average="macro", zero_division=0)
    micro = f1_score(y_dev, pred, average="micro", zero_division=0)

    pipe = {"vectorizer": vec, "classifier": clf}

    joblib.dump(pipe, ART / "model.joblib")
    meta = {
        "model": "tfidf_charwb_2_4_ovr_logreg",
        "labels": LABELS,
        "data_version": "v0.4",
        "n_train": len(X_train),
        "n_dev": len(X_dev),
        "train_seconds": round(train_sec, 2),
        "dev_macro_f1": round(float(macro), 4),
        "dev_micro_f1": round(float(micro), 4),
        "artifact": str(ART / "model.joblib"),
        "note": "sklearn baseline; not the final on-device Transformer",
    }
    (ART / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
