#!/usr/bin/env python3
"""Publish the Data Visualization dataset and model to Hugging Face.

Uploads:
  - Dataset (train + val JSONL) → HF Datasets
  - Model weights (optional) → HF Model Hub

Usage:
  export HF_TOKEN=hf_xxx
  python3 publish_hf.py --dataset-only
  python3 publish_hf.py --dataset-only --repo Papajams/orbura-dataviz-dataset
  python3 publish_hf.py --model path/to/fine-tuned --repo Papajams/orbura-dataviz-model
"""
import argparse
import json
import os
import sys
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"
CARD_PATH = Path(__file__).parent / "DATASET_CARD.md"
MODEL_CARD_PATH = Path(__file__).parent / "MODEL_CARD.md"


def load_env():
    """Load HF_TOKEN from repo .env if not already set."""
    if os.environ.get("HF_TOKEN"):
        return
    env_path = Path(__file__).parents[2] / ".env"
    if env_path.exists():
        for raw in env_path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[7:]
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k == "HF_TOKEN":
                os.environ["HF_TOKEN"] = v


def publish_dataset(repo_id: str, train_path: Path, val_path: Path, card_path: Path):
    from datasets import Dataset, DatasetDict
    from huggingface_hub import HfApi

    api = HfApi()
    user = api.whoami()["name"]
    if "/" not in repo_id:
        repo_id = f"{user}/{repo_id}"

    print(f"Loading train data from {train_path}...")
    train_rows = [json.loads(l) for l in train_path.read_text().splitlines() if l.strip()]
    val_rows = [json.loads(l) for l in val_path.read_text().splitlines() if l.strip()]

    train_ds = Dataset.from_list(train_rows)
    val_ds = Dataset.from_list(val_rows)
    ds_dict = DatasetDict({"train": train_ds, "validation": val_ds})

    print(f"Train: {len(train_ds)} rows, Validation: {len(val_ds)} rows")
    print(f"Pushing to HF Datasets: {repo_id}...")

    ds_dict.push_to_hub(repo_id, token=os.environ.get("HF_TOKEN"))
    print(f"Dataset uploaded: https://huggingface.co/datasets/{repo_id}")

    # Upload dataset card
    if card_path.exists():
        api.upload_file(
            path_or_fileobj=str(card_path),
            path_in_repo="README.md",
            repo_id=repo_id,
            repo_type="dataset",
            token=os.environ.get("HF_TOKEN"),
        )
        print(f"Dataset card uploaded.")


def publish_model(repo_id: str, model_path: str, card_path: Path):
    from huggingface_hub import HfApi, create_repo

    api = HfApi()
    user = api.whoami()["name"]
    if "/" not in repo_id:
        repo_id = f"{user}/{repo_id}"

    create_repo(repo_id, repo_type="model", exist_ok=True, token=os.environ.get("HF_TOKEN"))
    print(f"Uploading model from {model_path} → {repo_id}...")

    api.upload_folder(
        folder_path=model_path,
        repo_id=repo_id,
        repo_type="model",
        token=os.environ.get("HF_TOKEN"),
    )

    if card_path.exists():
        api.upload_file(
            path_or_fileobj=str(card_path),
            path_in_repo="README.md",
            repo_id=repo_id,
            repo_type="model",
            token=os.environ.get("HF_TOKEN"),
        )

    print(f"Model uploaded: https://huggingface.co/{repo_id}")


def main():
    parser = argparse.ArgumentParser(description="Publish Data Viz dataset/model to Hugging Face")
    parser.add_argument("--dataset-only", action="store_true", help="Upload dataset only")
    parser.add_argument("--model", default=None, help="Path to fine-tuned model directory")
    parser.add_argument("--repo", default=None, help="HF repo ID (auto-prefixed with username)")
    args = parser.parse_args()

    load_env()

    if not os.environ.get("HF_TOKEN"):
        print("Error: HF_TOKEN not set")
        sys.exit(1)

    train_path = OUT_DIR / "adaption_train_10k.jsonl"
    val_path = OUT_DIR / "adaption_val_2k.jsonl"

    if args.dataset_only:
        repo = args.repo or "orbura-dataviz-dataset"
        publish_dataset(repo, train_path, val_path, CARD_PATH)

    if args.model:
        repo = args.repo or "orbura-dataviz-model"
        publish_model(repo, args.model, MODEL_CARD_PATH)

    if not args.dataset_only and not args.model:
        print("Nothing to do. Use --dataset-only and/or --model <path>")
        sys.exit(1)


if __name__ == "__main__":
    main()
