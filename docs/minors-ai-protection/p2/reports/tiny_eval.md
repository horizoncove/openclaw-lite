# P2 Tiny Transformer Eval Report

- model: `tiny_roberta_l2h128_multilabel` / `uer/chinese_roberta_L-2_H-128`
- params: **3184520** (~12.15 MB fp32)
- data: p1/v0.4
- threshold: 0.4
- test macro F1: **0.9983** (target ≥0.80) → PASS
- high-risk recall: {'contact_request': 0.9994, 'offline_meeting': 0.9982, 'threat': 0.9972} (target ≥0.90) → PASS
- normal FP rate: **0.008** (target ≤0.03) → PASS
- adv macro F1: **0.9563**
- test throughput (batch): ~0.153 ms/sample on `cpu`

## Per-label (test)

| label | f1 | recall | support |
|---|---:|---:|---:|
| age_probe | 0.9987 | 1.0 | 1518 |
| privacy_request | 0.9987 | 0.9993 | 1537 |
| contact_request | 0.999 | 0.9994 | 1553 |
| school_request | 0.9988 | 0.9982 | 1682 |
| photo_request | 0.999 | 0.9993 | 1499 |
| offline_meeting | 0.997 | 0.9982 | 1646 |
| emotional_manipulation | 0.9979 | 0.9979 | 1453 |
| threat | 0.9976 | 0.9972 | 1441 |

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
                threat       1.00      1.00      1.00      1441

             micro avg       1.00      1.00      1.00     12329
             macro avg       1.00      1.00      1.00     12329
          weighted avg       1.00      1.00      1.00     12329
           samples avg       0.86      0.86      0.86     12329

```
