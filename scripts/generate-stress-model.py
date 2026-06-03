"""
Generate a tiny ONNX stress classifier model for EZKL ZK circuit compilation.

Architecture: Gemm → Sigmoid (opset 10 for tract/EZKL compatibility)
  Input:  5 floats [leftEyeAspect, rightEyeAspect, browTension, mouthTension, timeNorm]
  Output: 1 float  (stress probability)

Uses opset 10 + Gemm to match working EZKL example patterns.

Requirements: pip install torch onnx numpy
Run: python scripts/generate-stress-model.py
"""

import torch
import torch.nn as nn
import onnx
import numpy as np
import json
import os


class StressClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        # Single linear layer + sigmoid
        self.fc = nn.Linear(5, 1)
        self.sigmoid = nn.Sigmoid()

        # Weights: negative for eye openness, positive for tension
        with torch.no_grad():
            self.fc.weight.copy_(
                torch.tensor([[-2.0, -2.0, 3.0, 1.5, 0.1]], dtype=torch.float32)
            )
            self.fc.bias.copy_(torch.tensor([0.5], dtype=torch.float32))

    def forward(self, x):
        return self.sigmoid(self.fc(x))


def main():
    model = StressClassifier()
    model.eval()

    out_dir = "public/ezkl"
    os.makedirs(out_dir, exist_ok=True)
    model_path = os.path.join(out_dir, "model.onnx")

    # Export with opset 10 (ezkl tract examples use this)
    torch.onnx.export(
        model,
        torch.randn(1, 5),
        model_path,
        input_names=["input"],
        output_names=["output"],
        opset_version=10,
        do_constant_folding=True,
    )

    # Update input.json for witness generation
    input_path = os.path.join(out_dir, "input.json")
    with open(input_path, "w") as f:
        json.dump({
            "input_data": [[0.25, 0.26, 0.08, 0.18, 0.42]],
            "input_shapes": [[1, 5]],
        }, f, indent=2)

    # Validate
    onnx_model = onnx.load(model_path)
    onnx.checker.check_model(onnx_model)

    # Inspect nodes for debugging
    print("Nodes:")
    for node in onnx_model.graph.node:
        print(f"  {node.op_type}: {node.input} -> {node.output}")
    print(f"  Opset: {onnx_model.opset_import[0].version}")
    print(f"  Input: {onnx_model.graph.input[0].name} -> {onnx_model.graph.input[0].type.tensor_type.shape}")

    # Test
    test_input = np.array([[0.25, 0.26, 0.08, 0.18, 0.42]], dtype=np.float32)
    with torch.no_grad():
        output = model(torch.from_numpy(test_input)).numpy()
    print(f"  Test output: {output[0][0]:.4f}")
    print(f"  Saved: {model_path}")


if __name__ == "__main__":
    main()
