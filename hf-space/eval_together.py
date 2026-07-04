"""
Evaluate the AutoScientist fine-tuned model via Together AI API.

AutoScientist deploys the fine-tuned model to Together AI. This script
calls it via the Together AI chat completions API and scores against
our deterministic ground truth.

Usage:
    export TOGETHER_API_KEY=...
    python eval_together.py --model <together-model-name> --baseline meta-llama/Llama-3.2-3B-Instruct

    # Quick test
    python eval_together.py --model <model> --n-samples 10
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

import requests

HERE = Path(__file__).parent
DATASETS_DIR = HERE / "datasets"
TOGETHER_API = "https://api.together.xyz/v1/chat/completions"

AGENTS = ["triage", "coach", "schedule", "reflection"]


# Reuse parsing + scoring from eval_finetuned.py
sys.path.insert(0, str(HERE))
from eval_finetuned import (
    parse_triage, parse_coach, parse_schedule, parse_reflection,
    score_triage, score_coach, score_schedule, score_reflection,
)


def together_inference(
    model: str,
    messages: list[dict],
    api_key: str,
    max_tokens: int = 300,
    temperature: float = 0.1,
    retries: int = 3,
) -> str:
    """Call Together AI chat completions API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    for attempt in range(retries):
        try:
            resp = requests.post(TOGETHER_API, headers=headers, json=payload, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  Retry {attempt+1}/{retries} after {wait}s: {e}")
                time.sleep(wait)
            else:
                raise


def evaluate_agent_together(
    model: str,
    agent: str,
    test_file: Path,
    api_key: str,
    n_samples: Optional[int] = None,
) -> dict:
    """Evaluate a Together AI model on one agent's test set."""
    examples = []
    with open(test_file) as f:
        for line in f:
            examples.append(json.loads(line))

    if n_samples:
        examples = examples[:n_samples]

    all_metrics = []
    for i, ex in enumerate(examples):
        messages = ex["messages"]
        personality = ex.get("personality", "honest")

        try:
            output = together_inference(model, messages, api_key)
        except Exception as e:
            print(f"  [{agent} {i}] Inference failed: {e}")
            output = ""

        # Score based on agent type
        if agent == "triage":
            pred = parse_triage(output)
            gt = messages[-1]["content"]  # assistant message
            metrics = score_triage(pred, gt)
        elif agent == "coach":
            pred = parse_coach(output)
            gt = messages[-1]["content"]
            metrics = score_coach(pred, gt)
        elif agent == "schedule":
            pred = parse_schedule(output)
            gt = messages[-1]["content"]
            metrics = score_schedule(pred, gt)
        elif agent == "reflection":
            pred = parse_reflection(output)
            gt = messages[-1]["content"]
            metrics = score_reflection(pred, gt, personality)

        all_metrics.append(metrics)

        if (i + 1) % 20 == 0:
            avg = sum(m["overall"] for m in all_metrics) / len(all_metrics)
            print(f"  [{agent}] {i+1}/{len(examples)} — running avg: {avg:.1%}")

    # Aggregate
    if not all_metrics:
        return {"agent": agent, "n": 0, "overall": 0.0}

    avg_metrics = {}
    for key in all_metrics[0]:
        if key == "overall":
            avg_metrics[key] = sum(m[key] for m in all_metrics) / len(all_metrics)
        else:
            avg_metrics[key] = sum(m.get(key, 0) for m in all_metrics) / len(all_metrics)

    return {"agent": agent, "n": len(all_metrics), "metrics": avg_metrics}


def main():
    parser = argparse.ArgumentParser(description="Evaluate model via Together AI API")
    parser.add_argument("--model", required=True, help="Together AI model name (fine-tuned)")
    parser.add_argument("--baseline", default="meta-llama/Llama-3.2-3B-Instruct", help="Baseline model name")
    parser.add_argument("--agents", nargs="*", default=AGENTS, help="Agents to evaluate")
    parser.add_argument("--n-samples", type=int, default=None, help="Limit samples per agent")
    parser.add_argument("--skip-baseline", action="store_true", help="Skip baseline evaluation")
    args = parser.parse_args()

    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        raise SystemExit("Set TOGETHER_API_KEY environment variable")

    results = {}

    # Baseline
    if not args.skip_baseline:
        print(f"\n{'='*60}")
        print(f"BASELINE: {args.baseline}")
        print(f"{'='*60}")
        results["baseline"] = {}
        for agent in args.agents:
            test_file = DATASETS_DIR / f"{agent}_test.jsonl"
            if not test_file.exists():
                print(f"  [skip] {test_file} not found")
                continue
            print(f"\n  Evaluating {agent}...")
            result = evaluate_agent_together(args.baseline, agent, test_file, api_key, args.n_samples)
            results["baseline"][agent] = result
            print(f"  → {agent}: {result['metrics']['overall']:.1%}")

    # Fine-tuned
    print(f"\n{'='*60}")
    print(f"FINE-TUNED: {args.model}")
    print(f"{'='*60}")
    results["finetuned"] = {}
    for agent in args.agents:
        test_file = DATASETS_DIR / f"{agent}_test.jsonl"
        if not test_file.exists():
            print(f"  [skip] {test_file} not found")
            continue
        print(f"\n  Evaluating {agent}...")
        result = evaluate_agent_together(args.model, agent, test_file, api_key, args.n_samples)
        results["finetuned"][agent] = result
        print(f"  → {agent}: {result['metrics']['overall']:.1%}")

    # Comparison table
    print(f"\n{'='*60}")
    print("COMPARISON")
    print(f"{'='*60}")
    print(f"{'Agent':<12} {'Baseline':>10} {'Fine-tuned':>12} {'Improvement':>12}")
    print("-" * 48)
    for agent in args.agents:
        b = results.get("baseline", {}).get(agent, {}).get("metrics", {}).get("overall", 0)
        f = results.get("finetuned", {}).get(agent, {}).get("metrics", {}).get("overall", 0)
        diff = f - b
        print(f"{agent:<12} {b:>10.1%} {f:>12.1%} {diff:>+11.1%}")

    # Save results
    results_path = HERE / "eval_results_together.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {results_path}")


if __name__ == "__main__":
    main()
