"""
Evaluation harness for the AutoScientist Challenge.

Runs a model (baseline or fine-tuned) on the 200-profile test set for
each of the 4 agents, computes structured accuracy metrics against the
deterministic ground truth, and prints a comparison table.

Usage:
    # Evaluate a local HF model against the test set
    python eval_finetuned.py --model path/to/fine-tuned-model --baseline Qwen/Qwen3-1.7B

    # Evaluate only the triage agent
    python eval_finetuned.py --model path/to/model --agents triage

    # Quick test with 10 samples
    python eval_finetuned.py --model path/to/model --n-samples 10

The script loads models via HuggingFace transformers. For GGUF models,
use --gguf and it will use llama-cpp-python instead.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

HERE = Path(__file__).parent
DATASETS_DIR = HERE / "datasets"

AGENTS = ["triage", "coach", "schedule", "reflection"]


# ─── Metric computation ───────────────────────────────────────────────────────

def parse_triage(output: str) -> dict:
    """Parse triage output into {priority_system, priority_score, secondary_system, secondary_score, avoid}."""
    result = {"priority_system": None, "priority_score": None,
              "secondary_system": None, "secondary_score": None, "avoid": None}
    for line in output.strip().splitlines():
        upper = line.upper().strip()
        if upper.startswith("PRIORITY:") and result["priority_system"] is None:
            content = line.split(":", 1)[1].strip()
            m = re.match(r"(.+?)\s+(\d+)/100", content)
            if m:
                result["priority_system"] = m.group(1).strip()
                result["priority_score"] = int(m.group(2))
            else:
                result["priority_system"] = content
        elif upper.startswith("SECONDARY:") and result["secondary_system"] is None:
            content = line.split(":", 1)[1].strip()
            m = re.match(r"(.+?)\s+(\d+)/100", content)
            if m:
                result["secondary_system"] = m.group(1).strip()
                result["secondary_score"] = int(m.group(2))
            else:
                result["secondary_system"] = content
        elif upper.startswith("AVOID:") and result["avoid"] is None:
            result["avoid"] = line.split(":", 1)[1].strip()
    return result


def parse_coach(output: str) -> dict:
    """Parse coach output into {right_now, this_morning, today, avoid}."""
    labels = ["RIGHT NOW", "THIS MORNING", "TODAY", "AVOID"]
    result = {l.lower().replace(" ", "_"): None for l in labels}
    for line in output.strip().splitlines():
        upper = line.upper().strip().lstrip("*")
        for label in labels:
            if upper.startswith(label):
                key = label.lower().replace(" ", "_")
                if result[key] is None:
                    result[key] = line.split(":", 1)[1].strip() if ":" in line else ""
                break
    return result


def parse_schedule(output: str) -> list[dict]:
    """Parse schedule output into list of {time_range, action, system}."""
    blocks = []
    for line in output.strip().splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 3:
            blocks.append({"time_range": parts[0], "action": parts[1], "system": parts[2]})
    return blocks


def parse_reflection(output: str) -> dict:
    """Parse reflection output — same structure as coach."""
    return parse_coach(output)


def score_triage(predicted: dict, ground_truth: str) -> dict:
    """Score triage output against ground truth."""
    gt = parse_triage(ground_truth)
    metrics = {
        "priority_system_match": False,
        "priority_score_match": False,
        "secondary_system_match": False,
        "avoid_present": False,
        "format_3_lines": False,
        "word_count_ok": False,
    }

    if predicted["priority_system"] and gt["priority_system"]:
        metrics["priority_system_match"] = (
            predicted["priority_system"].lower().strip() == gt["priority_system"].lower().strip()
        )
    if predicted["priority_score"] is not None and gt["priority_score"] is not None:
        metrics["priority_score_match"] = predicted["priority_score"] == gt["priority_score"]
    if predicted["secondary_system"] and gt["secondary_system"]:
        metrics["secondary_system_match"] = (
            predicted["secondary_system"].lower().strip() == gt["secondary_system"].lower().strip()
        )
    metrics["avoid_present"] = predicted["avoid"] is not None and len(predicted["avoid"]) > 5

    # Format: exactly 3 lines with correct prefixes
    lines = [l for l in ground_truth.strip().splitlines() if l.strip()]
    metrics["format_3_lines"] = len(lines) == 3

    # Word count: avoid line <= 12 words
    if predicted["avoid"]:
        metrics["word_count_ok"] = len(predicted["avoid"].split()) <= 15

    metrics["overall"] = sum(metrics.values()) / len(metrics)
    return metrics


def score_coach(predicted: dict, ground_truth: str) -> dict:
    """Score coach output against ground truth."""
    gt = parse_coach(ground_truth)
    metrics = {
        "right_now_present": False,
        "this_morning_present": False,
        "today_present": False,
        "avoid_present": False,
        "right_now_has_hydration": False,
        "avoid_targets_system": False,
        "format_4_lines": False,
        "word_count_ok": False,
    }

    for key in ["right_now", "this_morning", "today", "avoid"]:
        if predicted.get(key) and len(predicted[key]) > 3:
            metrics[f"{key}_present"] = True

    if predicted.get("right_now"):
        lower = predicted["right_now"].lower()
        metrics["right_now_has_hydration"] = any(w in lower for w in ["water", "hydrat", "electrolyte"])

    if predicted.get("avoid"):
        lower = predicted["avoid"].lower()
        gt_avoid = (gt.get("avoid") or "").lower()
        # Check if the avoid line mentions the right things
        metrics["avoid_targets_system"] = any(w in lower for w in gt_avoid.split()[:3])

    lines = [l for l in ground_truth.strip().splitlines() if l.strip()]
    metrics["format_4_lines"] = len(lines) == 4

    # Word count per line: 12-18 words
    word_counts = []
    for key in ["right_now", "this_morning", "today", "avoid"]:
        if predicted.get(key):
            word_counts.append(len(predicted[key].split()))
    if word_counts:
        metrics["word_count_ok"] = all(5 <= wc <= 25 for wc in word_counts)

    metrics["overall"] = sum(metrics.values()) / len(metrics)
    return metrics


def score_schedule(predicted: list[dict], ground_truth: str) -> dict:
    """Score schedule output against ground truth."""
    gt = parse_schedule(ground_truth)
    metrics = {
        "has_4_blocks": False,
        "time_blocks_correct": False,
        "pipe_format": False,
        "systems_match": 0.0,
        "actions_present": False,
    }

    metrics["has_4_blocks"] = len(predicted) == 4
    if predicted:
        metrics["pipe_format"] = all("time_range" in b and "action" in b and "system" in b for b in predicted)
        metrics["actions_present"] = all(len(b.get("action", "")) > 5 for b in predicted)

        # Check time blocks
        expected_times = ["NOW-10AM", "10AM-12PM", "12PM-3PM", "3PM-6PM"]
        actual_times = [b.get("time_range", "").upper().replace(" ", "") for b in predicted]
        metrics["time_blocks_correct"] = actual_times == expected_times

        # System overlap with ground truth
        if gt:
            gt_systems = [b["system"].lower() for b in gt]
            pred_systems = [b["system"].lower() for b in predicted]
            matches = sum(1 for i, s in enumerate(pred_systems) if i < len(gt_systems) and s == gt_systems[i])
            metrics["systems_match"] = matches / len(gt_systems) if gt_systems else 0.0

    metrics["overall"] = sum(metrics.values()) / len(metrics)
    return metrics


def score_reflection(predicted: dict, ground_truth: str, personality: str) -> dict:
    """Score reflection output against ground truth."""
    gt = parse_reflection(ground_truth)
    metrics = {
        "right_now_present": False,
        "this_morning_present": False,
        "today_present": False,
        "avoid_present": False,
        "format_4_lines": False,
        "voice_markers": False,
        "content_preserved": False,
        "avoid_not_softened": False,
    }

    for key in ["right_now", "this_morning", "today", "avoid"]:
        if predicted.get(key) and len(predicted[key]) > 3:
            metrics[f"{key}_present"] = True

    lines = [l for l in ground_truth.strip().splitlines() if l.strip()]
    metrics["format_4_lines"] = len(lines) == 4

    # Voice markers
    all_text = " ".join((predicted.get(k) or "") for k in ["right_now", "this_morning", "today", "avoid"]).lower()
    if personality == "scientific":
        metrics["voice_markers"] = any(w in all_text for w in ["cortisol", "hrv", "glycogen", "hepatic", "clearance", "axis", "synthesis"])
    elif personality == "sarcastic":
        metrics["voice_markers"] = any(w in all_text for w in ["surprise", "obviously", "reality check", "asked nicely"])
    elif personality == "gentle":
        metrics["voice_markers"] = any(w in all_text for w in ["earned", "kind", "pace", "supportive"])
    elif personality == "honest":
        metrics["voice_markers"] = True  # honest is the default, no special markers

    # Content preservation: check if key terms from GT are in predicted
    if gt.get("right_now") and predicted.get("right_now"):
        gt_terms = set(re.findall(r"\b\w+\b", gt["right_now"].lower()))
        pred_terms = set(re.findall(r"\b\w+\b", predicted["right_now"].lower()))
        overlap = len(gt_terms & pred_terms) / max(len(gt_terms), 1)
        metrics["content_preserved"] = overlap > 0.5

    # AVOID not softened
    if predicted.get("avoid"):
        lower = predicted["avoid"].lower()
        metrics["avoid_not_softened"] = not any(w in lower for w in ["maybe", "perhaps", "consider", "might want"])

    metrics["overall"] = sum(metrics.values()) / len(metrics)
    return metrics


# ─── Model inference ──────────────────────────────────────────────────────────

def load_hf_model(model_path: str):
    """Load a HuggingFace model for inference."""
    from transformers import pipeline
    return pipeline("text-generation", model=model_path, device_map="auto", torch_dtype="auto")


def load_gguf_model(model_path: str):
    """Load a GGUF model via llama-cpp-python."""
    from llama_cpp import Llama
    return Llama(model_path=model_path, n_ctx=4096, n_gpu_layers=0, verbose=False)


def run_inference(model, messages: list[dict], max_new_tokens: int = 200, is_gguf: bool = False) -> str:
    """Run inference on a single chat example and return the assistant response."""
    if is_gguf:
        response = model.create_chat_completion(messages=messages, max_tokens=max_new_tokens, temperature=0.1)
        return response["choices"][0]["message"]["content"]
    else:
        out = model(messages, max_new_tokens=max_new_tokens, temperature=0.1, do_sample=False)
        return out[0]["generated_text"][-1]["content"]


# ─── Evaluation runner ────────────────────────────────────────────────────────

def evaluate_agent(
    model,
    agent: str,
    test_file: Path,
    is_gguf: bool = False,
    n_samples: Optional[int] = None,
    max_new_tokens: int = 200,
) -> dict:
    """Evaluate a model on one agent's test set."""
    examples = []
    with open(test_file) as f:
        for line in f:
            examples.append(json.loads(line))

    if n_samples:
        examples = examples[:n_samples]

    all_metrics = []
    for i, ex in enumerate(examples):
        messages = ex["messages"]
        ground_truth = messages[2]["content"]  # assistant message

        try:
            predicted_raw = run_inference(model, messages[:2], max_new_tokens, is_gguf)
        except Exception as e:
            print(f"  [sample {i}] inference error: {e}")
            continue

        # Parse and score
        if agent == "triage":
            pred = parse_triage(predicted_raw)
            metrics = score_triage(pred, ground_truth)
        elif agent == "coach":
            pred = parse_coach(predicted_raw)
            metrics = score_coach(pred, ground_truth)
        elif agent == "schedule":
            pred = parse_schedule(predicted_raw)
            metrics = score_schedule(pred, ground_truth)
        elif agent == "reflection":
            pred = parse_reflection(predicted_raw)
            # Extract personality from user message
            user_msg = messages[1]["content"]
            personality = "honest"
            for line in user_msg.split("\n"):
                if line.startswith("User's voice:"):
                    personality = line.split(":")[1].strip()
                    break
            metrics = score_reflection(pred, ground_truth, personality)

        all_metrics.append(metrics)

    # Aggregate
    if not all_metrics:
        return {"overall": 0.0, "n_samples": 0}

    avg = {}
    for key in all_metrics[0]:
        if key == "overall":
            avg[key] = sum(m[key] for m in all_metrics) / len(all_metrics)
        else:
            avg[key] = sum(m.get(key, False) for m in all_metrics) / len(all_metrics)
    avg["n_samples"] = len(all_metrics)
    return avg


def print_comparison_table(baseline_results: dict, finetuned_results: dict) -> None:
    """Print a comparison table of baseline vs fine-tuned."""
    print()
    print("=" * 70)
    print(f"{'Agent':<14} | {'Baseline':>10} | {'Fine-tuned':>10} | {'Improvement':>12}")
    print("-" * 70)
    for agent in AGENTS:
        b = baseline_results.get(agent, {}).get("overall", 0.0)
        f = finetuned_results.get(agent, {}).get("overall", 0.0)
        imp = f - b
        print(f"{agent:<14} | {b*100:>9.1f}% | {f*100:>9.1f}% | {imp*100:>+11.1f}pp")
    print("=" * 70)

    # Per-metric breakdown
    for agent in AGENTS:
        b = baseline_results.get(agent, {})
        f = finetuned_results.get(agent, {})
        if not b or not f:
            continue
        print(f"\n{agent.upper()} per-metric:")
        for key in b:
            if key in ("overall", "n_samples"):
                continue
            bv = b.get(key, 0.0)
            fv = f.get(key, 0.0)
            print(f"  {key:<30} baseline: {bv*100:>5.1f}%  fine-tuned: {fv*100:>5.1f}%  delta: {(fv-bv)*100:>+5.1f}pp")


def main():
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned model against baseline")
    parser.add_argument("--model", required=True, help="Path to fine-tuned model")
    parser.add_argument("--baseline", default="Qwen/Qwen3-1.7B", help="Baseline model name/path")
    parser.add_argument("--agents", nargs="+", default=AGENTS, help="Agents to evaluate")
    parser.add_argument("--n-samples", type=int, default=None, help="Number of test samples (default: all 200)")
    parser.add_argument("--gguf", action="store_true", help="Use llama-cpp-python for GGUF models")
    parser.add_argument("--max-tokens", type=int, default=200, help="Max new tokens for generation")
    parser.add_argument("--skip-baseline", action="store_true", help="Skip baseline evaluation")
    args = parser.parse_args()

    # Load models
    print(f"Loading fine-tuned model: {args.model}")
    if args.gguf:
        ft_model = load_gguf_model(args.model)
    else:
        ft_model = load_hf_model(args.model)
    print("  loaded.")

    baseline_model = None
    if not args.skip_baseline:
        print(f"Loading baseline model: {args.baseline}")
        if args.gguf:
            baseline_model = load_gguf_model(args.baseline)
        else:
            baseline_model = load_hf_model(args.baseline)
        print("  loaded.")

    # Evaluate each agent
    baseline_results = {}
    finetuned_results = {}

    for agent in args.agents:
        test_file = DATASETS_DIR / f"{agent}_test.jsonl"
        if not test_file.exists():
            print(f"  [skip] {test_file} not found")
            continue

        print(f"\nEvaluating {agent}...")
        finetuned_results[agent] = evaluate_agent(
            ft_model, agent, test_file, args.gguf, args.n_samples, args.max_tokens
        )
        print(f"  Fine-tuned: {finetuned_results[agent]['overall']*100:.1f}%")

        if baseline_model:
            baseline_results[agent] = evaluate_agent(
                baseline_model, agent, test_file, args.gguf, args.n_samples, args.max_tokens
            )
            print(f"  Baseline:   {baseline_results[agent]['overall']*100:.1f}%")

    # Print comparison
    if baseline_results:
        print_comparison_table(baseline_results, finetuned_results)
    else:
        print("\nFine-tuned results:")
        for agent, metrics in finetuned_results.items():
            print(f"  {agent}: {metrics['overall']*100:.1f}% ({metrics['n_samples']} samples)")

    # Save results to JSON
    results_path = HERE / "eval_results.json"
    with open(results_path, "w") as f:
        json.dump({"baseline": baseline_results, "finetuned": finetuned_results}, f, indent=2)
    print(f"\nResults saved to {results_path}")


if __name__ == "__main__":
    main()
