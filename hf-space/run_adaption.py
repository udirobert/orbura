"""
Run the Adaption Adaptive Data augmentation pipeline for all 4 agents.

Uploads each agent's training JSONL to Adaption, runs the augmentation
(reasoning traces + prompt rephrasing + deduplication), waits for
completion, and downloads the enhanced dataset.

The script first converts our chat-format JSONL (messages array) into
the prompt/completion format Adaption expects, uploads, runs, and
saves the augmented data.

Usage:
    export ADAPTION_API_KEY="pt_live_..."
    python run_adaption.py                    # all agents, full dataset
    python run_adaption.py --agent triage     # single agent
    python run_adaption.py --estimate-only    # just get cost estimates
    python run_adaption.py --n-rows 100       # small test run
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

from adaption import Adaption, DatasetTimeout

HERE = Path(__file__).parent
DATASETS_DIR = HERE / "datasets"
AUGMENTED_DIR = HERE / "datasets" / "augmented"

AGENTS = ["triage", "coach", "schedule", "reflection"]


def convert_chat_to_prompt_completion(input_path: Path, output_path: Path, n_rows: int | None = None) -> int:
    """Convert chat-format JSONL to prompt/completion CSV for Adaption.

    Adaption's instruction_dataset mode expects prompt + completion columns.
    We flatten the messages array: system+user → prompt, assistant → completion.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(input_path) as fin, open(output_path, "w") as fout:
        for i, line in enumerate(fin):
            if n_rows and i >= n_rows:
                break
            ex = json.loads(line)
            messages = ex["messages"]
            # Combine system + user into prompt
            prompt_parts = []
            completion = ""
            for msg in messages:
                if msg["role"] == "system":
                    prompt_parts.append(f"[System]\n{msg['content']}")
                elif msg["role"] == "user":
                    prompt_parts.append(f"[User]\n{msg['content']}")
                elif msg["role"] == "assistant":
                    completion = msg["content"]
            prompt = "\n\n".join(prompt_parts)
            # Write as JSONL with prompt/completion fields
            fout.write(json.dumps({"prompt": prompt, "completion": completion}) + "\n")
            count += 1
    return count


def run_agent(client: Adaption, agent: str, n_rows: int | None, estimate_only: bool) -> dict | None:
    """Run the full augmentation pipeline for one agent."""
    print(f"\n{'='*60}")
    print(f"Agent: {agent}")
    print(f"{'='*60}")

    # Step 1: Convert to prompt/completion format
    input_path = DATASETS_DIR / f"{agent}_train.jsonl"
    converted_path = AUGMENTED_DIR / f"{agent}_train_pc.jsonl"

    if not input_path.exists():
        print(f"  [skip] {input_path} not found")
        return None

    count = convert_chat_to_prompt_completion(input_path, converted_path, n_rows)
    print(f"  Converted {count} examples → {converted_path.name}")

    # Step 2: Upload to Adaption
    print(f"  Uploading to Adaption...")
    result = client.datasets.upload_file(
        str(converted_path),
        name=f"body-debt-{agent}-train",
    )
    dataset_id = result.dataset_id
    print(f"  Dataset ID: {dataset_id}")

    # Step 3: Wait for file processing
    print(f"  Waiting for file processing...")
    while True:
        status = client.datasets.get_status(dataset_id)
        if status.row_count is not None:
            print(f"  Processed: {status.row_count} rows, status={status.status}")
            break
        time.sleep(2)

    # Step 4: Estimate cost
    print(f"  Estimating cost...")
    estimate = client.datasets.run(
        dataset_id,
        column_mapping={"prompt": "prompt", "completion": "completion"},
        training_type="instruction_dataset",
        recipe_specification={
            "recipes": {
                "reasoning_traces": True,
                "prompt_rephrase": True,
                "deduplication": True,
            }
        },
        estimate=True,
    )
    print(f"  Estimated credits: {estimate.estimated_credits_consumed}")
    print(f"  Estimated time: {estimate.estimated_minutes} min")

    if estimate_only:
        print(f"  [estimate-only] skipping run")
        return {"agent": agent, "dataset_id": dataset_id, "estimated_credits": estimate.estimated_credits_consumed, "estimated_minutes": estimate.estimated_minutes}

    # Step 5: Run augmentation
    print(f"  Starting augmentation run...")
    run = client.datasets.run(
        dataset_id,
        column_mapping={"prompt": "prompt", "completion": "completion"},
        training_type="instruction_dataset",
        recipe_specification={
            "recipes": {
                "reasoning_traces": True,
                "prompt_rephrase": True,
                "deduplication": True,
            }
        },
        brand_controls={
            "length": "concise",
        },
    )
    print(f"  Run ID: {run.run_id}")
    print(f"  Credits: {run.estimated_credits_consumed}")
    print(f"  ETA: {run.estimated_minutes} min")

    # Step 6: Wait for completion
    print(f"  Waiting for completion (timeout: 30 min)...")
    try:
        final = client.datasets.wait_for_completion(dataset_id, timeout=1800)
        print(f"  Finished: {final.status}")
        if hasattr(final, "error") and final.error:
            print(f"  Error: {final.error.message}")
            return {"agent": agent, "dataset_id": dataset_id, "status": "failed", "error": final.error.message}
    except DatasetTimeout as e:
        print(f"  Timed out after {e.timeout}s (last status: {e.last_status})")
        return {"agent": agent, "dataset_id": dataset_id, "status": "timeout"}

    # Step 7: Download augmented data
    print(f"  Downloading augmented data...")
    url = client.datasets.download(dataset_id)
    print(f"  Download URL: {url}")

    # Step 8: Check evaluation
    try:
        evaluation = client.datasets.get_evaluation(dataset_id)
        print(f"  Evaluation status: {evaluation.status}")
        if evaluation.quality:
            print(f"  Score before: {evaluation.quality.score_before}")
            print(f"  Score after: {evaluation.quality.score_after}")
            print(f"  Improvement: {evaluation.quality.improvement_percent}%")
    except Exception as e:
        print(f"  Evaluation check skipped: {e}")

    return {"agent": agent, "dataset_id": dataset_id, "status": "succeeded", "download_url": url}


def main():
    parser = argparse.ArgumentParser(description="Run Adaption Adaptive Data augmentation pipeline")
    parser.add_argument("--agent", choices=AGENTS, help="Run single agent (default: all)")
    parser.add_argument("--estimate-only", action="store_true", help="Only get cost estimates, don't run")
    parser.add_argument("--n-rows", type=int, default=None, help="Limit to N rows (for testing)")
    args = parser.parse_args()

    agents = [args.agent] if args.agent else AGENTS

    client = Adaption()  # reads ADAPTION_API_KEY
    print(f"Adaption client ready")

    results = []
    for agent in agents:
        result = run_agent(client, agent, args.n_rows, args.estimate_only)
        if result:
            results.append(result)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    for r in results:
        print(f"  {r['agent']}: {r.get('status', 'estimated')} — dataset_id={r['dataset_id']}")
        if "estimated_credits" in r:
            print(f"    credits: {r['estimated_credits']}, time: {r['estimated_minutes']} min")
        if "download_url" in r:
            print(f"    download: {r['download_url']}")

    # Save results
    results_path = HERE / "adaption_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {results_path}")


if __name__ == "__main__":
    main()
