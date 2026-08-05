#!/usr/bin/env python3
"""Eval harness for the AutoScientist Data Visualization track.

Runs a baseline (zero-shot) and/or a fine-tuned model on the 2k validation
set and prints per-task + overall metrics. Supports local HF models, local
GGUF models via llama-cpp, and Together AI hosted endpoints.

Usage:
  # Baseline only (no fine-tuned checkpoint yet)
  python eval_finetuned.py --baseline-only

  # Compare baseline vs fine-tuned
  python eval_finetuned.py --baseline Qwen/Qwen2.5-1.5B --finetuned path/to/model

  # Together AI endpoint
  python eval_finetuned.py --together-model body-debt-dataviz-v1 --baseline-only

  # Custom val file
  python eval_finetuned.py --val data/val_2k.jsonl --baseline-only
"""
import argparse
import json
import re
import statistics
import sys
from pathlib import Path

VAL_PATH = Path(__file__).parent / "data" / "val_2k.jsonl"


# ─── Loading ──────────────────────────────────────────────────────────────────

def load_dataset(path: Path) -> list[dict]:
    rows = []
    with open(path) as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


# ─── Parsers ─────────────────────────────────────────────────────────────────

def parse_data_table(text: str) -> dict[str, int] | None:
    """Extract label→value pairs from a '- Label: value' data table."""
    pairs = re.findall(r"-\s*(\S+):\s*(\d+)", text)
    if not pairs:
        return None
    return {k: int(v) for k, v in pairs}


def parse_csv_table(text: str) -> dict[str, int] | None:
    """Extract label→value pairs from a 'category,value\\n...' CSV block."""
    pairs = re.findall(r"^(\w[\w\s]*?),(\d+)$", text, re.MULTILINE)
    if not pairs:
        return None
    return {k.strip(): int(v) for k, v in pairs}


def extract_code(text: str) -> str:
    """Extract the first Python code block from model output."""
    match = re.search(r"```(?:python)?\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Fallback: look for matplotlib import onward
    idx = text.find("import matplotlib")
    if idx >= 0:
        return text[idx:].strip()
    return text.strip()


def normalize_code(code: str) -> str:
    """Normalize whitespace and quote style for code comparison."""
    code = re.sub(r"'(\w+)':", r'"\1":', code)  # single-quote keys → double
    code = re.sub(r"\s+", " ", code)             # collapse whitespace
    return code.strip()


# ─── Task scorers ────────────────────────────────────────────────────────────

def score_chart_qa(pred: str, ref: str, input_text: str) -> bool:
    """Exact or fuzzy match for chart QA answers."""
    pred = pred.strip()
    ref = ref.strip()
    if pred == ref:
        return True
    # Numeric tolerance
    pred_num = re.findall(r"[-+]?\d*\.?\d+", pred)
    ref_num = re.findall(r"[-+]?\d*\.?\d+", ref)
    if pred_num and ref_num:
        try:
            return abs(float(pred_num[0]) - float(ref_num[0])) < 0.15
        except ValueError:
            pass
    # Case-insensitive containment (for label answers)
    if ref.lower() in pred.lower():
        return True
    return False


def score_code(pred: str, ref: str) -> bool:
    """Code generation: check that the output produces the same chart type
    and references the same data. We don't require exact text match — we
    check structural equivalence."""
    pred_code = extract_code(pred)
    ref_code = extract_code(ref)

    if not pred_code:
        return False

    # Must have matplotlib import
    if "matplotlib" not in pred_code and "plt" not in pred_code:
        return False

    # Must use the correct chart function
    chart_fns = {"plt.plot", "plt.bar", "plt.scatter", "plt.pie"}
    ref_fn = next((fn for fn in chart_fns if fn in ref_code), None)
    if ref_fn and ref_fn not in pred_code:
        return False

    # Must reference the same data values
    ref_values = re.findall(r"\d+", ref_code.split("\n")[1] if "\n" in ref_code else ref_code)
    pred_values = re.findall(r"\d+", pred_code.split("\n")[1] if "\n" in pred_code else pred_code)
    if ref_values and pred_values:
        # At least 80% of ref values should appear in pred
        ref_set = set(ref_values)
        pred_set = set(pred_values)
        overlap = len(ref_set & pred_set) / max(len(ref_set), 1)
        return overlap >= 0.8

    return normalize_code(pred_code) == normalize_code(ref_code)


def score_chart_choice(pred: str, ref: str) -> bool:
    """Chart type selection — first word match."""
    pred_type = pred.strip().lower().split()[0] if pred.strip() else ""
    ref_type = ref.strip().lower().split()[0] if ref.strip() else ""
    return pred_type == ref_type


def score_code_to_desc(pred: str, ref: str) -> bool:
    """Description: check chart type and key numbers are mentioned."""
    pred_lower = pred.lower()
    ref_lower = ref.lower()
    # Must mention the same chart type
    chart_types = ["line", "bar", "scatter", "pie"]
    ref_type = next((ct for ct in chart_types if ct in ref_lower), None)
    if ref_type and ref_type not in pred_lower:
        return False
    # Must mention at least 2 of the same numbers
    ref_nums = set(re.findall(r"\d+\.?\d*", ref))
    pred_nums = set(re.findall(r"\d+\.?\d*", pred))
    overlap = len(ref_nums & pred_nums)
    return overlap >= min(2, len(ref_nums))


def score_style_transfer(pred: str, ref: str) -> bool:
    """Style transfer: check the transformation was applied (structural)."""
    pred_code = extract_code(pred)
    ref_code = extract_code(ref)
    if not pred_code:
        return False
    return normalize_code(pred_code) == normalize_code(ref_code)


def score_fix_code(pred: str, ref: str) -> bool:
    """Bug fix: the corrected code should match the reference."""
    pred_code = extract_code(pred)
    ref_code = extract_code(ref)
    if not pred_code:
        return False
    return normalize_code(pred_code) == normalize_code(ref_code)


def score_example(example: dict, prediction: str) -> bool:
    task = example.get("task", "")
    ref = example.get("output", "").strip()
    input_text = example.get("input", "")
    pred = prediction.strip()

    if task == "chart_qa":
        return score_chart_qa(pred, ref, input_text)
    elif task in ("chart_to_code", "data_to_code"):
        return score_code(pred, ref)
    elif task == "code_to_desc":
        return score_code_to_desc(pred, ref)
    elif task == "style_transfer":
        return score_style_transfer(pred, ref)
    elif task == "fix_code":
        return score_fix_code(pred, ref)
    elif task == "chart_choice":
        return score_chart_choice(pred, ref)
    else:
        return pred == ref


# ─── Inference backends ──────────────────────────────────────────────────────

def load_hf_model(model_path: str):
    """Load a HuggingFace model + tokenizer."""
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path, torch_dtype=torch.float16, device_map="auto",
    )
    return model, tokenizer


def load_gguf_model(model_path: str):
    """Load a GGUF model via llama-cpp."""
    from llama_cpp import Llama
    return Llama(model_path=model_path, n_ctx=2048, n_gpu_layers=-1, verbose=False)


def generate_hf(model, tokenizer, messages: list[dict]) -> str:
    import torch
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        output = model.generate(
            **inputs, max_new_tokens=512, do_sample=False, temperature=1.0,
            pad_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)


def generate_gguf(llm, messages: list[dict]) -> str:
    prompt = ""
    for msg in messages:
        if msg["role"] == "user":
            prompt += f"<|im_start|>user\n{msg['content']}<|im_end|>\n"
        elif msg["role"] == "assistant":
            prompt += f"<|im_start|>assistant\n{msg['content']}<|im_end|>\n"
    prompt += "<|im_start|>assistant\n"
    result = llm(prompt, max_tokens=512, temperature=0.0, stop=["<|im_end|>"])
    return result["choices"][0]["text"].strip()


def generate_together(model_name: str, messages: list[dict], api_key: str) -> str:
    import requests
    resp = requests.post(
        "https://api.together.xyz/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model_name,
            "messages": messages,
            "max_tokens": 512,
            "temperature": 0.0,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ─── Eval runner ──────────────────────────────────────────────────────────────

def run_eval(
    examples: list[dict],
    generate_fn,
    label: str,
    max_samples: int | None = None,
) -> dict:
    if max_samples:
        examples = examples[:max_samples]

    results = {"total": 0, "correct": 0, "tasks": {}}
    for i, ex in enumerate(examples):
        messages = ex.get("messages", [])
        if not messages:
            # Build from instruction + input
            user_content = f"{ex['instruction']}\n\n{ex['input']}"
            messages = [{"role": "user", "content": user_content}]
        else:
            # messages already has user + assistant; keep only user for inference
            messages = [m for m in messages if m["role"] == "user"]

        try:
            pred = generate_fn(messages)
        except Exception as e:
            print(f"  [{i+1}/{len(examples)}] inference error: {e}", file=sys.stderr)
            pred = ""

        ok = score_example(ex, pred)
        task = ex.get("task", "unknown")

        results["total"] += 1
        results["correct"] += int(ok)
        results["tasks"].setdefault(task, {"total": 0, "correct": 0})
        results["tasks"][task]["total"] += 1
        results["tasks"][task]["correct"] += int(ok)

        if (i + 1) % 50 == 0:
            pct = 100 * results["correct"] / results["total"]
            print(f"  [{i+1}/{len(examples)}] {label}: {pct:.1f}%")

    return results


def print_results(label: str, results: dict):
    pct = 100 * results["correct"] / results["total"] if results["total"] else 0
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"  Overall: {results['correct']}/{results['total']} ({pct:.1f}%)")
    print(f"{'='*60}")
    for task, st in sorted(results["tasks"].items()):
        tpct = 100 * st["correct"] / st["total"] if st["total"] else 0
        print(f"  {task:20s} {st['correct']:4d}/{st['total']:4d}  ({tpct:5.1f}%)")
    print()


# ─── Naive baseline (rule-based, no model needed) ─────────────────────────────

def naive_predict(task: str, input_text: str) -> str:
    data = parse_data_table(input_text) or parse_csv_table(input_text)
    q = input_text.lower()

    if task == "chart_qa":
        if not data:
            return "0"
        if "maximum" in q:
            val = max(data.values())
            label = max(data, key=data.get)
            return f"{val} ({label})"
        if "minimum" in q:
            val = min(data.values())
            label = min(data, key=data.get)
            return f"{val} ({label})"
        if "sum" in q or "total" in q:
            return str(sum(data.values()))
        if "average" in q or "mean" in q:
            return str(round(statistics.mean(data.values()), 1))
        if "median" in q:
            return str(round(statistics.median(data.values()), 1))
        if "range" in q:
            return str(max(data.values()) - min(data.values()))
        return "0"

    if task in ("chart_to_code", "data_to_code"):
        return "import matplotlib.pyplot as plt\nplt.plot([1,2,3],[1,2,3])\nplt.show()"

    if task == "code_to_desc":
        return "This code creates a chart using matplotlib."

    if task in ("fix_code", "style_transfer"):
        return "import matplotlib.pyplot as plt\nplt.plot([1,2,3],[1,2,3])\nplt.show()"

    if task == "chart_choice":
        return "bar"

    return ""


def run_naive_baseline(examples: list[dict]) -> dict:
    results = {"total": 0, "correct": 0, "tasks": {}}
    for ex in examples:
        pred = naive_predict(ex.get("task", ""), ex.get("input", ""))
        ok = score_example(ex, pred)
        task = ex.get("task", "unknown")
        results["total"] += 1
        results["correct"] += int(ok)
        results["tasks"].setdefault(task, {"total": 0, "correct": 0})
        results["tasks"][task]["total"] += 1
        results["tasks"][task]["correct"] += int(ok)
    return results


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Eval fine-tuned model on Data Viz val set")
    parser.add_argument("--val", default=str(VAL_PATH), help="Path to validation JSONL")
    parser.add_argument("--baseline", default=None, help="Baseline HF model path or repo ID")
    parser.add_argument("--finetuned", default=None, help="Fine-tuned HF model path or repo ID")
    parser.add_argument("--gguf", default=None, help="GGUF model path (local)")
    parser.add_argument("--together-model", default=None, help="Together AI model name")
    parser.add_argument("--together-baseline", default=None, help="Together AI baseline model name")
    parser.add_argument("--baseline-only", action="store_true", help="Run naive baseline (no model)")
    parser.add_argument("--max-samples", type=int, default=None, help="Limit samples for quick runs")
    args = parser.parse_args()

    val_path = Path(args.val)
    if not val_path.exists():
        print(f"Validation file not found: {val_path}")
        print("Generate it first: python3 generate_full.py")
        sys.exit(1)

    examples = load_dataset(val_path)
    print(f"Loaded {len(examples)} examples from {val_path}")

    if args.max_samples:
        examples = examples[:args.max_samples]
        print(f"Limited to {len(examples)} examples")

    # ── Naive baseline (always run for reference) ──
    print("\n--- Naive baseline (rule-based, no model) ---")
    naive_results = run_naive_baseline(examples)
    print_results("Naive baseline", naive_results)

    if args.baseline_only and not args.baseline and not args.together_baseline:
        return

    # ── HF baseline ──
    if args.baseline:
        print(f"\n--- Loading baseline: {args.baseline} ---")
        model, tokenizer = load_hf_model(args.baseline)
        gen_fn = lambda msgs: generate_hf(model, tokenizer, msgs)
        baseline_results = run_eval(examples, gen_fn, "Baseline")
        print_results(f"Baseline ({args.baseline})", baseline_results)

    # ── Together AI baseline ──
    if args.together_baseline:
        import os
        api_key = os.environ.get("TOGETHER_API_KEY", "")
        if not api_key:
            print("Error: TOGETHER_API_KEY not set")
            sys.exit(1)
        gen_fn = lambda msgs: generate_together(args.together_baseline, msgs, api_key)
        print(f"\n--- Together AI baseline: {args.together_baseline} ---")
        baseline_results = run_eval(examples, gen_fn, "Together baseline")
        print_results(f"Together baseline ({args.together_baseline})", baseline_results)

    # ── Fine-tuned (HF) ──
    if args.finetuned:
        print(f"\n--- Loading fine-tuned: {args.finetuned} ---")
        model, tokenizer = load_hf_model(args.finetuned)
        gen_fn = lambda msgs: generate_hf(model, tokenizer, msgs)
        ft_results = run_eval(examples, gen_fn, "Fine-tuned")
        print_results(f"Fine-tuned ({args.finetuned})", ft_results)

    # ── Fine-tuned (GGUF) ──
    if args.gguf:
        print(f"\n--- Loading GGUF: {args.gguf} ---")
        llm = load_gguf_model(args.gguf)
        gen_fn = lambda msgs: generate_gguf(llm, msgs)
        ft_results = run_eval(examples, gen_fn, "Fine-tuned (GGUF)")
        print_results(f"Fine-tuned GGUF ({args.gguf})", ft_results)

    # ── Together AI fine-tuned ──
    if args.together_model:
        import os
        api_key = os.environ.get("TOGETHER_API_KEY", "")
        if not api_key:
            print("Error: TOGETHER_API_KEY not set")
            sys.exit(1)
        gen_fn = lambda msgs: generate_together(args.together_model, msgs, api_key)
        print(f"\n--- Together AI fine-tuned: {args.together_model} ---")
        ft_results = run_eval(examples, gen_fn, "Together fine-tuned")
        print_results(f"Together fine-tuned ({args.together_model})", ft_results)

    # ── Comparison table ──
    if (args.baseline or args.together_baseline) and (args.finetuned or args.gguf or args.together_model):
        print(f"\n{'='*60}")
        print(f"  Comparison summary")
        print(f"{'='*60}")
        if args.baseline or args.together_baseline:
            bpct = 100 * baseline_results["correct"] / baseline_results["total"]
            print(f"  Baseline:     {bpct:.1f}%")
        if args.finetuned or args.gguf or args.together_model:
            fpct = 100 * ft_results["correct"] / ft_results["total"]
            print(f"  Fine-tuned:   {fpct:.1f}%")
            if (args.baseline or args.together_baseline):
                print(f"  Improvement:  +{fpct - bpct:.1f}pp")
        print()


if __name__ == "__main__":
    main()
