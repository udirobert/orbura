#!/usr/bin/env python3
"""Export the Orbura stress MLP weights from public/ezkl/model.onnx into
zkvm/methods/guest/src/weights.rs for the RISC Zero guest program."""
import onnx
import onnx.numpy_helper as nh
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "public/ezkl/model.onnx"
OUT = ROOT / "zkvm/methods/guest/src/weights.rs"

NAMES = [
    ("fc1.weight", "FC1_W"),
    ("fc1.bias", "FC1_B"),
    ("fc2.weight", "FC2_W"),
    ("fc2.bias", "FC2_B"),
    ("fc3.weight", "FC3_W"),
    ("fc3.bias", "FC3_B"),
]


def fmt(name: str, arr: np.ndarray) -> str:
    a = np.asarray(arr, dtype=np.float32)
    if a.ndim == 1:
        return f"pub const {name}: [f32; {a.shape[0]}] = {a.tolist()};"
    return f"pub const {name}: [[f32; {a.shape[1]}]; {a.shape[0]}] = {a.tolist()};"


def main() -> None:
    model = onnx.load(str(MODEL))
    weights = {i.name: nh.to_array(i) for i in model.graph.initializer}
    lines = [
        "// Generated from public/ezkl/model.onnx — do not edit by hand.",
        "// Regenerate: python3 zkvm/scripts/export_weights.py",
    ]
    for onnx_name, rust_name in NAMES:
        lines.append(fmt(rust_name, weights[onnx_name]))
    OUT.write_text("\n".join(lines) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
