#!/usr/bin/env python3
"""Convert generated JSONL into the canonical Adaption column layout."""
import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def load(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def strip(example):
    return {
        "instruction": example["instruction"],
        "input": example["input"],
        "output": example["output"],
        "task": example["task"],
    }


def save(rows, filename):
    out = DATA_DIR / filename
    with open(out, "w") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")
    print(f"Wrote {len(rows)} rows to {out}")


def main():
    random.seed(42)
    train = [strip(r) for r in load(DATA_DIR / "train_10k.jsonl")]
    val = [strip(r) for r in load(DATA_DIR / "val_2k.jsonl")]
    pilot = random.sample(train, 500)

    save(train, "adaption_train_10k.jsonl")
    save(val, "adaption_val_2k.jsonl")
    save(pilot, "adaption_pilot_500.jsonl")

    print("Adaption column mapping:")
    print('  prompt     -> "instruction"')
    print('  completion -> "output"')
    print('  context    -> ["input"]')


if __name__ == "__main__":
    main()
