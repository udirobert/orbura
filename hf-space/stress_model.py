"""
Stress score inference via ONNX model (7→16→8→1 MLP).
Falls back to a heuristic if model file not available.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np

MODEL_PATH = Path(__file__).parent / "models" / "stress_model.onnx"


def predict_stress_score(features: np.ndarray) -> tuple[float, bool]:
    """
    Run the stress MLP on a 7-feature vector.
    Returns (stress_score 0-100, is_healthy bool).
    """
    if MODEL_PATH.exists():
        return _onnx_predict(features)
    return _heuristic_predict(features)


def _onnx_predict(features: np.ndarray) -> tuple[float, bool]:
    import onnxruntime as ort

    session = ort.InferenceSession(str(MODEL_PATH))
    input_name = session.get_inputs()[0].name
    inp = features.reshape(1, -1).astype(np.float32)
    output = session.run(None, {input_name: inp})
    raw = float(output[0][0][0])
    score = max(0.0, min(100.0, raw * 100))
    return score, score < 50


def _heuristic_predict(features: np.ndarray) -> tuple[float, bool]:
    """Simple heuristic from feature ranges when ONNX model unavailable."""
    left_ear, right_ear, brow, mouth_t, eye_sym, mouth_o, _ = features

    fatigue = 0.0
    avg_ear = (left_ear + right_ear) / 2
    if avg_ear < 0.25:
        fatigue += 30
    elif avg_ear < 0.35:
        fatigue += 15

    if brow < 0.03:
        fatigue += 20
    if eye_sym > 0.15:
        fatigue += 15
    if mouth_t > 8:
        fatigue += 10

    score = max(0, min(100, fatigue))
    return score, score < 50
