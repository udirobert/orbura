"""
Generate an ONNX stress classifier model for EZKL ZK circuit compilation.

Architecture: 7 → 16 → 8 → 1 MLP with ReLU hidden layers (opset 10 for tract/EZKL compatibility)
  Input:  7 floats [leftEyeAspect, rightEyeAspect, browTension, mouthTension,
                     eyeSymmetry, mouthOpening, timeNorm]
  Output: 1 float  (stress probability)

This 3-layer network demonstrates non-trivial ZKML by proving inference
through 2 hidden layers with non-linear ReLU activations, not just a
single linear layer + sigmoid.

Uses opset 10 + Gemm + ReLU to match working EZKL example patterns.

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
    """
    Multi-layer perceptron for stress classification.
    Architecture: 7 → 16 → 8 → 1 with ReLU hidden layers.

    Input features:
      0: leftEyeAspect   (eye openness, lower = fatigued)
      1: rightEyeAspect  (eye openness, lower = fatigued)
      2: browTension     (furrowed brows, higher = stressed)
      3: mouthTension    (lip tightness, higher = stressed)
      4: eyeSymmetry     (asymmetry between eyes, higher = fatigued)
      5: mouthOpening    (jaw tension via height/width, higher = relaxed)
      6: timeNorm        (circadian normalization)
    """
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(7, 16)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(16, 8)
        self.fc3 = nn.Linear(8, 1)
        self.sigmoid = nn.Sigmoid()

        # Sensible weight initialization for stress classification
        with torch.no_grad():
            # Layer 1: detect stress patterns from 7 features
            self.fc1.weight.copy_(torch.tensor([
                [-1.5, -1.5,  2.5,  1.2,  1.8, -1.0,  0.1],  # neuron 0: basic stress
                [-2.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.0],  # neuron 1: left eye fatigue
                [ 0.0, -2.0,  0.0,  0.0,  0.0,  0.0,  0.0],  # neuron 2: right eye fatigue
                [ 0.0,  0.0,  3.0,  0.0,  0.0,  0.0,  0.0],  # neuron 3: brow tension
                [ 0.0,  0.0,  0.0,  2.5,  0.0,  0.0,  0.0],  # neuron 4: mouth tension
                [ 0.0,  0.0,  0.0,  0.0,  3.0, -1.5,  0.0],  # neuron 5: asymmetry + jaw
                [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.5],  # neuron 6: circadian
                [-1.0, -1.0,  1.5,  1.0,  2.0, -0.5,  0.2],  # neuron 7: compound stress
                [ 0.5,  0.5, -1.0, -0.5, -1.0,  1.0,  0.0],  # neuron 8: relaxed pattern
                [-1.2,  1.2,  0.0,  0.0,  2.5,  0.0,  0.0],  # neuron 9: eye asymmetry
                [ 0.0,  0.0,  0.0,  2.0,  0.0, -1.5,  0.0],  # neuron 10: jaw clench
                [ 0.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.3],  # neuron 11: light stress
                [-2.5, -2.5,  3.0,  2.0,  0.0,  0.0,  0.0],  # neuron 12: eye+brow fatigue
                [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.8],  # neuron 13: late night penalty
                [ 1.0,  1.0, -1.5, -1.0, -1.0,  0.5, -0.1],  # neuron 14: healthy baseline
                [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.3],  # neuron 15: early morning bonus
            ], dtype=torch.float32))
            self.fc1.bias.copy_(torch.zeros(16, dtype=torch.float32))

            # Layer 2: combine stress patterns
            self.fc2.weight.copy_(torch.tensor([
                [ 1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5,  1.5, -1.0,  1.0,  1.0,  0.5,  1.2,  0.5, -1.0, -0.3],
                [ 0.0,  0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.5,  0.0,  0.5,  0.0,  0.0,  0.5,  0.0,  0.0,  0.0],
                [ 0.0,  0.0,  0.0,  0.5,  0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.5,  0.0],
                [-0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0, -0.5,  1.5,  0.0, -0.3,  0.0, -0.5, -0.2,  1.0,  0.0],
                [ 1.0,  0.5,  0.5,  1.0,  0.5,  1.0,  1.0,  1.5, -0.5,  0.5,  1.0,  1.0,  1.0,  1.0, -0.5, -0.2],
                [ 0.0,  0.0,  0.0,  0.0,  0.5,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
                [-0.5,  0.0,  0.0, -0.3,  0.0, -0.5,  0.5, -0.5,  0.0,  0.0,  0.0,  0.0, -0.3,  0.8,  0.0, -0.5],
                [ 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0],
            ], dtype=torch.float32))
            self.fc2.bias.copy_(torch.zeros(8, dtype=torch.float32))

            # Layer 3: final stress score
            self.fc3.weight.copy_(torch.tensor([
                [ 1.5,  0.5,  0.3, -1.0,  2.0,  0.0, -0.5,  0.0]
            ], dtype=torch.float32))
            self.fc3.bias.copy_(torch.tensor([0.0], dtype=torch.float32))

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        x = self.sigmoid(self.fc3(x))
        return x


def main():
    model = StressClassifier()
    model.eval()

    out_dir = "public/ezkl"
    os.makedirs(out_dir, exist_ok=True)
    model_path = os.path.join(out_dir, "model.onnx")

    # Export with opset 10 (ezkl tract examples use this)
    torch.onnx.export(
        model,
        torch.randn(1, 7),
        model_path,
        input_names=["input"],
        output_names=["output"],
        opset_version=10,
        do_constant_folding=True,
    )

    # Update input.json for witness generation (7 features now)
    input_path = os.path.join(out_dir, "input.json")
    with open(input_path, "w") as f:
        json.dump({
            "input_data": [[0.25, 0.26, 0.08, 0.18, 0.02, 0.35, 0.42]],
            "input_shapes": [[1, 7]],
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
    test_input = np.array([[0.25, 0.26, 0.08, 0.18, 0.02, 0.35, 0.42]], dtype=np.float32)
    with torch.no_grad():
        output = model(torch.from_numpy(test_input)).numpy()
    print(f"  Test output: {output[0][0]:.4f}")
    print(f"  Saved: {model_path}")


if __name__ == "__main__":
    main()
