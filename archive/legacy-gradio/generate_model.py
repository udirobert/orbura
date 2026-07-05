"""
Generate the stress classifier ONNX model (7→16→8→1 MLP with ReLU).
Same architecture as the original Body Debt ZK circuit.
Run: python generate_model.py
"""

import numpy as np

try:
    import torch
    import torch.nn as nn

    class StressMLP(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(
                nn.Linear(7, 16),
                nn.ReLU(),
                nn.Linear(16, 8),
                nn.ReLU(),
                nn.Linear(8, 1),
                nn.Sigmoid(),
            )

        def forward(self, x):
            return self.net(x)

    model = StressMLP()
    model.eval()

    # Export to ONNX
    dummy_input = torch.randn(1, 7)
    import os
    os.makedirs("models", exist_ok=True)
    torch.onnx.export(
        model,
        dummy_input,
        "models/stress_model.onnx",
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=10,
    )
    print("✓ Exported models/stress_model.onnx")

except ImportError:
    print("PyTorch not available — generating ONNX with numpy + onnx library")
    import onnx
    from onnx import helper, TensorProto, numpy_helper

    # Build the same 7→16→8→1 MLP manually
    rng = np.random.default_rng(42)

    def make_linear(name, in_f, out_f):
        W = rng.normal(0, 0.3, (out_f, in_f)).astype(np.float32)
        b = np.zeros(out_f, dtype=np.float32)
        W_init = numpy_helper.from_array(W, name=f"{name}_W")
        b_init = numpy_helper.from_array(b, name=f"{name}_b")
        matmul = helper.make_node("Gemm", [f"{name}_in", f"{name}_W", f"{name}_b"], [f"{name}_out"], transB=1)
        return matmul, [W_init, b_init]

    nodes = []
    initializers = []

    # Layer 1: 7→16
    n, inits = make_linear("l1", 7, 16)
    nodes.append(helper.make_node("Identity", ["input"], ["l1_in"]))
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Relu", ["l1_out"], ["r1_out"]))

    # Layer 2: 16→8
    n, inits = make_linear("l2", 16, 8)
    nodes.append(helper.make_node("Identity", ["r1_out"], ["l2_in"]))
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Relu", ["l2_out"], ["r2_out"]))

    # Layer 3: 8→1
    n, inits = make_linear("l3", 8, 1)
    nodes.append(helper.make_node("Identity", ["r2_out"], ["l3_in"]))
    nodes.append(n)
    initializers.extend(inits)
    nodes.append(helper.make_node("Sigmoid", ["l3_out"], ["output"]))

    graph = helper.make_graph(
        nodes,
        "stress_mlp",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [None, 7])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [None, 1])],
        initializer=initializers,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 10)])
    model.ir_version = 7
    import os
    os.makedirs("models", exist_ok=True)
    onnx.save(model, "models/stress_model.onnx")
    print("✓ Exported models/stress_model.onnx (numpy fallback)")
