"""
Publish the stress MLP to its own Hugging Face Model repository.

This is what makes the model eligible for the Tiny Titan AND Well-Tuned
bonus badges. The model already lives in hf-space/models/; this script
just creates a new HF Hub repo and uploads the ONNX + the model card.

Usage:
    export HF_TOKEN=hf_xxx...
    python publish_mlp.py
    # or
    huggingface-cli login && python publish_mlp.py
"""

from __future__ import annotations

import os
from pathlib import Path

MODEL_ID = os.environ.get("BODY_DEBT_MLP_REPO", "Papajams/body-debt-stress-mlp")
HERE = Path(__file__).parent
MODEL_DIR = HERE / "models"
ONNX_PATH = MODEL_DIR / "stress_model.onnx"
CARD_PATH = MODEL_DIR / "README.md"


def main() -> None:
    if not ONNX_PATH.exists():
        raise SystemExit(
            f"Missing {ONNX_PATH}. Run `python generate_model.py` first."
        )
    if not CARD_PATH.exists():
        raise SystemExit(f"Missing model card at {CARD_PATH}.")

    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `huggingface-cli login` or set HF_TOKEN."
        ) from e

    print(f"Creating model repo at {MODEL_ID} (if it does not exist)...")
    api.create_repo(
        repo_id=MODEL_ID,
        repo_type="model",
        private=False,
        exist_ok=True,
    )

    print(f"Uploading {ONNX_PATH.name} and {CARD_PATH.name}...")
    api.upload_folder(
        folder_path=str(MODEL_DIR),
        repo_id=MODEL_ID,
        repo_type="model",
        allow_patterns=["stress_model.onnx", "README.md"],
    )

    print(f"Done. View the model at: https://huggingface.co/{MODEL_ID}")


if __name__ == "__main__":
    main()
