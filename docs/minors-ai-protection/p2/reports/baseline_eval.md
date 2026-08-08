# P2 Baseline Eval Report

- model: `tfidf_charwb_2_4_ovr_logreg`
- data: p1/v0.4（**p1-v1.0**）
- test macro F1: **0.9985** (target ≥0.80) → PASS
- high-risk recall: {'contact_request': 0.9987, 'offline_meeting': 0.997, 'threat': 0.9938} (target ≥0.90) → PASS
- normal FP rate: **0.0005** (target ≤0.03) → PASS
- adv macro F1: **0.9209**

> **解读**：指标偏高主要因合成模板同质化；本基线用于打通训练/评测管线，**不代表**真实线上泛化已达标。后续以 Transformer + 难例/adv 压测为准。

## Per-label (test)

| label | f1 | recall | support |
|---|---:|---:|---:|
| age_probe | 0.999 | 0.998 | 1518 |
| privacy_request | 0.999 | 0.998 | 1537 |
| contact_request | 0.9987 | 0.9987 | 1553 |
| school_request | 0.9985 | 0.997 | 1682 |
| photo_request | 0.9987 | 0.9973 | 1499 |
| offline_meeting | 0.9982 | 0.997 | 1646 |
| emotional_manipulation | 0.999 | 0.9979 | 1453 |
| threat | 0.9969 | 0.9938 | 1441 |

## Classification report (test)
```
                        precision    recall  f1-score   support

             age_probe       1.00      1.00      1.00      1518
       privacy_request       1.00      1.00      1.00      1537
       contact_request       1.00      1.00      1.00      1553
        school_request       1.00      1.00      1.00      1682
         photo_request       1.00      1.00      1.00      1499
       offline_meeting       1.00      1.00      1.00      1646
emotional_manipulation       1.00      1.00      1.00      1453
                threat       1.00      0.99      1.00      1441

             micro avg       1.00      1.00      1.00     12329
             macro avg       1.00      1.00      1.00     12329
          weighted avg       1.00      1.00      1.00     12329
           samples avg       0.86      0.86      0.86     12329

```
