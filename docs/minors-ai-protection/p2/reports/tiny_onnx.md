# P2 Tiny ONNX Export

- path: `/workspace/docs/minors-ai-protection/p2/artifacts/tiny_roberta_l2h128/model.onnx`
- size: **12.147 MB** (target ≤30) → PASS
- CPU ORT P50/P95: **0.682 / 0.706 ms**
- P95 target ≤80ms (中端机目标；此处为 CPU 代理) → PASS
- params: 3184520
- threshold: 0.4
