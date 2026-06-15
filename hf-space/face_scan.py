"""
Face scan stress feature extraction using MediaPipe FaceMesh.
Ported from src/lib/ai/face-mesh.ts
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np

LANDMARKS = {
    "LEFT_EYE_OUTER": 33,
    "LEFT_EYE_INNER": 133,
    "LEFT_EYE_TOP": 159,
    "LEFT_EYE_BOTTOM": 145,
    "RIGHT_EYE_OUTER": 263,
    "RIGHT_EYE_INNER": 362,
    "RIGHT_EYE_TOP": 386,
    "RIGHT_EYE_BOTTOM": 374,
    "LEFT_EYEBROW_INNER": 107,
    "LEFT_EYEBROW_OUTER": 70,
    "RIGHT_EYEBROW_INNER": 336,
    "RIGHT_EYEBROW_OUTER": 300,
    "MOUTH_TOP": 13,
    "MOUTH_BOTTOM": 14,
    "MOUTH_LEFT": 61,
    "MOUTH_RIGHT": 291,
}


@dataclass
class StressFeatures:
    left_eye_aspect: float
    right_eye_aspect: float
    brow_tension: float
    mouth_tension: float
    eye_symmetry: float
    mouth_opening: float
    timestamp: float


def _distance(p1, p2) -> float:
    return math.sqrt(
        (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2
    )


def _ear(outer, inner, top, bottom) -> float:
    v = _distance(top, bottom)
    h = _distance(outer, inner)
    return v / h if h > 0 else 0


def extract_stress_features(landmarks: list) -> Optional[StressFeatures]:
    """Extract 7 stress features from 478 MediaPipe face landmarks."""
    if not landmarks or len(landmarks) < 468:
        return None

    def p(idx):
        lm = landmarks[idx]
        return (lm.x, lm.y, lm.z)

    left_ear = _ear(
        p(LANDMARKS["LEFT_EYE_OUTER"]),
        p(LANDMARKS["LEFT_EYE_INNER"]),
        p(LANDMARKS["LEFT_EYE_TOP"]),
        p(LANDMARKS["LEFT_EYE_BOTTOM"]),
    )
    right_ear = _ear(
        p(LANDMARKS["RIGHT_EYE_OUTER"]),
        p(LANDMARKS["RIGHT_EYE_INNER"]),
        p(LANDMARKS["RIGHT_EYE_TOP"]),
        p(LANDMARKS["RIGHT_EYE_BOTTOM"]),
    )
    brow_tension = (
        _distance(p(LANDMARKS["LEFT_EYEBROW_INNER"]), p(LANDMARKS["LEFT_EYE_TOP"]))
        + _distance(p(LANDMARKS["RIGHT_EYEBROW_INNER"]), p(LANDMARKS["RIGHT_EYE_TOP"]))
    ) / 2
    mouth_width = _distance(p(LANDMARKS["MOUTH_LEFT"]), p(LANDMARKS["MOUTH_RIGHT"]))
    mouth_height = _distance(p(LANDMARKS["MOUTH_TOP"]), p(LANDMARKS["MOUTH_BOTTOM"]))
    mouth_tension = mouth_width / mouth_height if mouth_height > 0 else 1.0
    eye_symmetry = abs(left_ear - right_ear) / ((left_ear + right_ear) / 2 + 0.001)
    mouth_opening = mouth_height / mouth_width if mouth_width > 0 else 0.1

    import time

    return StressFeatures(
        left_eye_aspect=left_ear,
        right_eye_aspect=right_ear,
        brow_tension=brow_tension,
        mouth_tension=mouth_tension,
        eye_symmetry=eye_symmetry,
        mouth_opening=mouth_opening,
        timestamp=time.time(),
    )


def features_to_array(features: StressFeatures) -> np.ndarray:
    """Convert StressFeatures to a 7-element numpy array for the ONNX model."""
    return np.array(
        [
            features.left_eye_aspect,
            features.right_eye_aspect,
            features.brow_tension,
            features.mouth_tension,
            features.eye_symmetry,
            features.mouth_opening,
            features.timestamp % 86400 / 86400,  # normalized time-of-day
        ],
        dtype=np.float32,
    )


def run_face_scan(image: np.ndarray) -> Optional[StressFeatures]:
    """Run MediaPipe FaceMesh on a BGR image and extract stress features."""
    import mediapipe as mp

    mp_face_mesh = mp.solutions.face_mesh

    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(image)
        if not results.multi_face_landmarks:
            return None
        landmarks = results.multi_face_landmarks[0].landmark
        return extract_stress_features(landmarks)
