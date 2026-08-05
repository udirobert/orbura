#!/usr/bin/env python3
"""Upload dataset to Kaggle. Weights can be added to a second dataset later."""
import json
import os
import shutil
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).parents[2]
ENV_PATH = REPO_ROOT / ".env"
DATA_DIR = Path(__file__).parent / "data"
RELEASE_DIR = Path(__file__).parent / "kaggle_release"
KAGGLE_DIR = Path.home() / ".kaggle"
KAGGLE_JSON = KAGGLE_DIR / "kaggle.json"


def load_env():
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        return
    if ENV_PATH.exists():
        with open(ENV_PATH) as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                if line.startswith("export "):
                    line = line[7:]
                k, _, v = line.partition("=")
                k = k.strip()
                if k == "KAGGLE_API_TOKEN" and not os.environ.get("KAGGLE_API_TOKEN"):
                    os.environ["KAGGLE_API_TOKEN"] = v.strip().strip('"').strip("'")


def setup_kaggle_json():
    if KAGGLE_JSON.exists():
        return
    if not os.environ.get("KAGGLE_API_TOKEN"):
        raise SystemExit("Set KAGGLE_API_TOKEN in .env or KAGGLE_USERNAME/KAGGLE_KEY env vars")
    token = os.environ["KAGGLE_API_TOKEN"]
    try:
        creds = json.loads(token)
    except json.JSONDecodeError:
        raise SystemExit(
            "KAGGLE_API_TOKEN must be JSON: {\"username\":\"...\",\"key\":\"...\"}"
        )
    KAGGLE_DIR.mkdir(parents=True, exist_ok=True)
    KAGGLE_JSON.write_text(json.dumps(creds))
    KAGGLE_JSON.chmod(0o600)


def get_username():
    return json.loads(KAGGLE_JSON.read_text())["username"]


def build_release(username, slug):
    if RELEASE_DIR.exists():
        shutil.rmtree(RELEASE_DIR)
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)

    for filename in ["adaption_train_10k.jsonl", "adaption_val_2k.jsonl"]:
        src = DATA_DIR / filename
        if src.exists():
            shutil.copy(src, RELEASE_DIR / filename)

    card = Path(__file__).parent / "DATASET_CARD.md"
    if card.exists():
        shutil.copy(card, RELEASE_DIR / "README.md")

    metadata = {
        "title": "Orbura AutoScientist Data Visualization Dataset",
        "id": f"{username}/{slug}",
        "licenses": [{"name": "Apache 2.0"}],
    }
    (RELEASE_DIR / "dataset-metadata.json").write_text(json.dumps(metadata, indent=2))


def kaggle_create_or_version():
    result = subprocess.run(
        ["kaggle", "datasets", "version", "-p", str(RELEASE_DIR), "-m", "update", "-r", "zip"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 and "not found" in result.stderr.lower():
        result = subprocess.run(
            ["kaggle", "datasets", "create", "-p", str(RELEASE_DIR), "-r", "zip"],
            capture_output=True,
            text=True,
        )
    print(result.stdout)
    if result.returncode != 0:
        print("Kaggle stderr:", result.stderr)
        return None
    return result.returncode


def main():
    load_env()
    setup_kaggle_json()
    username = get_username()
    slug = "orbura-autoscientist-dataviz"
    build_release(username, slug)
    kaggle_create_or_version()
    print(f"Dataset page: https://kaggle.com/datasets/{username}/{slug}")


if __name__ == "__main__":
    main()
