#!/usr/bin/env python3
"""Publish the Data Visualization dataset and model to Kaggle.

Kaggle requires the `kaggle` CLI + API token (~/.kaggle/kaggle.json).

Usage:
  pip install kaggle
  export KAGGLE_USERNAME=...
  export KAGGLE_KEY=...
  python3 publish_kaggle.py --dataset-only
  python3 publish_kaggle.py --model path/to/model_dir
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"
CARD_PATH = Path(__file__).parent / "DATASET_CARD.md"
MODEL_CARD_PATH = Path(__file__).parent / "MODEL_CARD.md"
DATASET_SLUG = "orbura-dataviz-dataset"
MODEL_SLUG = "orbura-dataviz-model"


def run_kaggle(args: list[str], check: bool = True):
    cmd = ["kaggle"] + args
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"  stderr: {result.stderr}")
        raise RuntimeError(f"kaggle command failed: {' '.join(args)}")
    return result


def package_dataset(tmp_dir: Path) -> Path:
    """Stage dataset files into a clean directory for kaggle datasets create."""
    import shutil

    staging = tmp_dir / "dataset"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    # Copy data files
    for name in ["adaption_train_10k.jsonl", "adaption_val_2k.jsonl"]:
        src = OUT_DIR / name
        if src.exists():
            shutil.copy2(src, staging / name)

    # Copy dataset card as README
    if CARD_PATH.exists():
        shutil.copy2(CARD_PATH, staging / "README.md")

    # Write dataset-metadata.json
    metadata = {
        "title": "Orbura AutoScientist Data Visualization Dataset",
        "id": f"{os.environ.get('KAGGLE_USERNAME', 'udirobert')}/{DATASET_SLUG}",
        "licenses": [{"name": "Apache-2.0"}],
        "isPrivate": False,
        "description": (
            "Synthetic instruction-tuning corpus for data visualization tasks: "
            "matplotlib code generation, chart QA, code-to-description, style transfer, "
            "and bug repair. Generated deterministically for the AutoScientist Challenge "
            "Part 2 (Data Visualization)."
        ),
    }
    with open(staging / "dataset-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    return staging


def package_model(model_path: str, tmp_dir: Path) -> Path:
    """Stage model weights into a directory for kaggle datasets create."""
    import shutil

    staging = tmp_dir / "model"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    src = Path(model_path)
    if src.is_dir():
        for item in src.iterdir():
            if item.is_file():
                shutil.copy2(item, staging / item.name)
    else:
        shutil.copy2(src, staging / src.name)

    # Copy model card as README
    if MODEL_CARD_PATH.exists():
        shutil.copy2(MODEL_CARD_PATH, staging / "README.md")

    metadata = {
        "title": "Orbura AutoScientist Data Visualization Model",
        "id": f"{os.environ.get('KAGGLE_USERNAME', 'udirobert')}/{MODEL_SLUG}",
        "licenses": [{"name": "Apache-2.0"}],
        "isPrivate": False,
        "description": (
            "Fine-tuned model for data visualization tasks, trained via AutoScientist "
            "(Adaption Labs) for the AutoScientist Challenge Part 2 (Data Visualization)."
        ),
    }
    with open(staging / "dataset-metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    return staging


def publish_dataset():
    import tempfile

    username = os.environ.get("KAGGLE_USERNAME", "udirobert")
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        staging = package_dataset(tmp_path)
        print(f"\nStaged dataset in {staging}")

        # Try to create; if it exists, version it
        result = run_kaggle(["datasets", "create", "-p", str(staging)], check=False)
        if result.returncode != 0:
            print("  Dataset may already exist, creating new version...")
            run_kaggle(["datasets", "version", "-p", str(staging), "-m", "Updated dataset"])
        print(f"\nDataset: https://www.kaggle.com/datasets/{username}/{DATASET_SLUG}")


def publish_model(model_path: str):
    import tempfile

    username = os.environ.get("KAGGLE_USERNAME", "udirobert")
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        staging = package_model(model_path, tmp_path)
        print(f"\nStaged model in {staging}")

        result = run_kaggle(["datasets", "create", "-p", str(staging)], check=False)
        if result.returncode != 0:
            print("  Dataset may already exist, creating new version...")
            run_kaggle(["datasets", "version", "-p", str(staging), "-m", "Updated model weights"])
        print(f"\nModel: https://www.kaggle.com/datasets/{username}/{MODEL_SLUG}")


def main():
    parser = argparse.ArgumentParser(description="Publish Data Viz dataset/model to Kaggle")
    parser.add_argument("--dataset-only", action="store_true", help="Upload dataset only")
    parser.add_argument("--model", default=None, help="Path to fine-tuned model directory")
    args = parser.parse_args()

    if not os.environ.get("KAGGLE_USERNAME") or not os.environ.get("KAGGLE_KEY"):
        print("Error: KAGGLE_USERNAME and KAGGLE_KEY must be set")
        print("  export KAGGLE_USERNAME=your_username")
        print("  export KAGGLE_KEY=your_api_key")
        print("  (or configure ~/.kaggle/kaggle.json)")
        sys.exit(1)

    if args.dataset_only:
        publish_dataset()

    if args.model:
        publish_model(args.model)

    if not args.dataset_only and not args.model:
        print("Nothing to do. Use --dataset-only and/or --model <path>")
        sys.exit(1)


if __name__ == "__main__":
    main()
