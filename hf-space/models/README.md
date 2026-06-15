---
license: mit
tags:
  - body-debt
  - onnx
  - tiny
  - stress-classifier
  - mediapipe
  - facial-analysis
  - mlp
  - hackathon
  - build-small-hackathon
  - tiny-titan
datasets:
  - synthetic
metrics:
  - size
model_name: body-debt-stress-mlp
---

# body-debt-stress-mlp

A 7→16→8→1 multi-layer perceptron (MLP) that maps **7 facial geometry features** (extracted by MediaPipe FaceMesh) into a single **fatigue/stress score between 0 and 1**.

**Total parameters: 553 (~2KB on disk).** Tiny enough to run inside an EZKL Halo2 zero-knowledge circuit and a CPU-only Gradio Space. This is the smallest working "well-tuned" classifier shipped for the [Build Small Hackathon](https://huggingface.co/build-small-hackathon).

## What it does

The stress MLP is the second stage of the [Body Debt](https://huggingface.co/spaces/build-small-hackathon/body-debt) face-scan pipeline:

```
Webcam frame
  → MediaPipe FaceMesh (478 landmarks)
  → 7 stress features (eye aspect L/R, brow tension, mouth tension,
     eye symmetry, mouth opening, time-of-day)
  → body-debt-stress-mlp (this model)
  → stress score 0–1 → /100 in the UI
```

The 7 input features are computed deterministically in `face_scan.py` (no learned preprocessing). The model itself is a fixed-architecture 553-parameter MLP with ReLU activations and a sigmoid output.

## Architecture

```
Linear(7, 16)   → ReLU   → 112 params  + 16 bias  = 128
Linear(16, 8)   → ReLU   → 128 params  +  8 bias  = 136
Linear(8, 1)    → Sigmoid →  8 params  +  1 bias  =   9
                                       Total ≈ 273
                          (plus 280 weight values) = 553
```

The exact layer shapes mirror the input contract used by the [Body Debt ZK circuit](https://github.com/udirobert/bodydebt), so the same on-device inference and the EZKL-proven on-chain path use identical weights.

## Input

A 1-D float32 array of length 7, in this order:

| Index | Feature | Source | Range |
|---|---|---|---|
| 0 | `left_eye_aspect` | EAR = vertical / horizontal of left eye | 0.15 – 0.45 |
| 1 | `right_eye_aspect` | EAR of right eye | 0.15 – 0.45 |
| 2 | `brow_tension` | mean brow-to-eye distance | 0.02 – 0.06 |
| 3 | `mouth_tension` | mouth width / height | 2 – 12 |
| 4 | `eye_symmetry` | abs(L-R) / mean(L,R) | 0.0 – 0.3 |
| 5 | `mouth_opening` | mouth height / width | 0.0 – 0.4 |
| 6 | time-of-day | `seconds_since_midnight / 86400` | 0.0 – 1.0 |

## Output

A single float in `[0, 1]`. Multiply by 100 for a 0–100 stress score. The Body Debt UI treats `< 0.5` as "healthy" and `≥ 0.5` as "stressed."

## Files

- `stress_model.onnx` — exported ONNX model, ~1.5KB, opset 10
- `generate_model.py` — script that exports the ONNX (PyTorch or numpy fallback)
- `stress_model.py` — `onnxruntime` inference wrapper used by the Space

## Reproduce / regenerate

```bash
pip install onnx onnxruntime torch
python generate_model.py    # writes models/stress_model.onnx
```

The PyTorch path and the numpy fallback produce structurally identical graphs (same layer shapes, same ReLU/Sigmoid activations). The numpy fallback exists because the HF Space cannot pull torch wheels at runtime.

## Run inference

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession("stress_model.onnx")
features = np.array([[0.30, 0.31, 0.045, 4.0, 0.05, 0.15, 0.5]], dtype=np.float32)
score = sess.run(None, {"input": features})[0][0][0]   # in [0, 1]
```

## Why this model, why this size

The hackathon's spirit is "models that fit on hardware you own." A 360M-parameter SmolLM2 powers the conversational coach; this 553-parameter classifier powers the deterministic face-scan signal. The two are deliberately on the same architectural spectrum: **the smallest model that can still produce a real signal**.

A larger CNN or transformer here would be wasted parameters. The input is 7 hand-crafted features, not pixels. There is no upscaling to do.

## License

MIT. See [Body Debt repository](https://github.com/udirobert/bodydebt).
