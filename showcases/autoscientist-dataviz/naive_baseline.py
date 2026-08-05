#!/usr/bin/env python3
"""A rule-based baseline to sanity-check the dataset. Accepts --input."""
import json
import re
import argparse
from pathlib import Path


def parse_data_table(text):
    pairs = re.findall(r"-\s*(\S+):\s*(\d+)", text)
    if not pairs:
        return None
    return {k: int(v) for k, v in pairs}


def predict_chart_qa(text):
    data = parse_data_table(text)
    if not data:
        return "0"
    question = text.split("Question:")[-1].strip() if "Question:" in text else ""
    q = question.lower()
    if "maximum" in q:
        val = max(data.values())
        label = max(data, key=data.get)
        return f"{val} ({label})"
    if "minimum" in q:
        val = min(data.values())
        label = min(data, key=data.get)
        return f"{val} ({label})"
    if "sum" in q:
        return str(sum(data.values()))
    if "value for category" in q:
        label = question.split("category")[-1].strip().strip("?").strip()
        return str(data.get(label, 0))
    if "higher value" in q:
        match = re.search(r"(\S+)\s+or\s+(\S+)", question)
        if match:
            a = match.group(1).strip(",?")
            b = match.group(2).strip(",?")
            return a if data.get(a, 0) > data.get(b, 0) else b
    return "0"


def predict(task, prompt):
    if task == "chart_qa":
        return predict_chart_qa(prompt)
    if task in ("chart_to_code", "data_to_code"):
        return "import matplotlib.pyplot as plt\nplt.plot([1,2,3],[1,2,3])\nplt.show()"
    if task == "code_to_desc":
        return "This code creates a chart using matplotlib."
    if task in ("fix_code", "style_transfer"):
        return "import matplotlib.pyplot as plt\nplt.plot([1,2,3],[1,2,3])\nplt.show()"
    return ""


def score(example):
    task = example["task"]
    prompt = example["messages"][0]["content"]
    pred = predict(task, prompt)
    ref = example["output"].strip()
    return pred.strip() == ref.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/val_2k.jsonl", help="Path to JSONL dataset")
    args = parser.parse_args()

    val_path = Path(__file__).parent / args.input
    if not val_path.exists():
        print(f"Dataset not found: {val_path}")
        return

    total = 0
    correct = 0
    task_stats = {}
    with open(val_path) as f:
        for line in f:
            ex = json.loads(line)
            ok = score(ex)
            total += 1
            correct += int(ok)
            task_stats.setdefault(ex["task"], {"total": 0, "correct": 0})
            task_stats[ex["task"]]["total"] += 1
            task_stats[ex["task"]]["correct"] += int(ok)

    print(f"Naive baseline exact-match: {correct}/{total} ({100*correct/total:.1f}%)")
    for task, st in sorted(task_stats.items()):
        print(f"  {task}: {st['correct']}/{st['total']} ({100*st['correct']/st['total']:.1f}%)")
    print("\nThe fine-tuned model must beat this trivial baseline. Low/zero scores here mean the dataset is non-trivial for a generic model.")


if __name__ == "__main__":
    main()
