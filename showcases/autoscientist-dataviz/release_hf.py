#!/usr/bin/env python3
"""Upload dataset and model card placeholders to Hugging Face."""
import json
import os
from pathlib import Path

try:
    from huggingface_hub import HfApi
except ImportError:
    raise SystemExit("pip install huggingface_hub")

REPO_ROOT = Path(__file__).parents[2]
ENV_PATH = REPO_ROOT / ".env"
DATA_DIR = Path(__file__).parent / "data"
CARDS_DIR = Path(__file__).parent


def load_env():
    if os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN"):
        return
    if not ENV_PATH.exists():
        return
    with open(ENV_PATH) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[7:]
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k in ("HF_TOKEN", "HUGGINGFACE_TOKEN"):
                os.environ["HF_TOKEN"] = v


def main():
    load_env()
    api = HfApi()
    user = api.whoami()["name"]
    data_repo = f"{user}/orbura-autoscientist-dataviz-data"
    model_repo = f"{user}/orbura-autoscientist-dataviz-model"

    api.create_repo(data_repo, repo_type="dataset", exist_ok=True)
    api.create_repo(model_repo, repo_type="model", exist_ok=True)

    for filename in ["adaption_train_10k.jsonl", "adaption_val_2k.jsonl"]:
        path = DATA_DIR / filename
        if path.exists():
            api.upload_file(
                path_or_fileobj=str(path),
                path_in_repo=filename,
                repo_id=data_repo,
                repo_type="dataset",
            )
            print(f"Uploaded {filename} to {data_repo}")

    dataset_card = CARDS_DIR / "DATASET_CARD.md"
    if dataset_card.exists():
        api.upload_file(
            path_or_fileobj=str(dataset_card),
            path_in_repo="README.md",
            repo_id=data_repo,
            repo_type="dataset",
        )
        print("Uploaded dataset card")

    model_card = CARDS_DIR / "MODEL_CARD.md"
    if model_card.exists():
        api.upload_file(
            path_or_fileobj=str(model_card),
            path_in_repo="README.md",
            repo_id=model_repo,
            repo_type="model",
        )
        print("Uploaded model card placeholder")

    print(f"Data repo: https://huggingface.co/datasets/{data_repo}")
    print(f"Model repo: https://huggingface.co/{model_repo}")


if __name__ == "__main__":
    main()
