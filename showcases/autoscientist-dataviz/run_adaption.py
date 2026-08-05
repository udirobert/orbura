#!/usr/bin/env python3
"""Run Adaption Adaptive Data augmentation on the Data Visualization dataset.

Uploads the train JSONL to Adaption, runs augmentation (reasoning traces +
deduplication only — prompt_rephrase is disabled to avoid train/inference
mismatch, per the Part 1 post-mortem), and downloads the augmented data.

Usage:
  export ADAPTION_API_KEY="pt_live_..."
  python3 run_adaption.py --input data/adaption_train_10k.jsonl
  python3 run_adaption.py --input data/adaption_train_10k.jsonl --estimate-only
  python3 run_adaption.py --input data/adaption_train_10k.jsonl --combined data/adaption_val_2k.jsonl

Requires: pip install adaption
"""
import argparse
import json
import sys
import time
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"


def main():
    parser = argparse.ArgumentParser(description="Run Adaption augmentation on Data Viz dataset")
    parser.add_argument("--input", default=str(OUT_DIR / "adaption_train_10k.jsonl"),
                        help="Path to training JSONL")
    parser.add_argument("--combined", default=None,
                        help="Optional: merge val set into train before upload")
    parser.add_argument("--estimate-only", action="store_true",
                        help="Get cost estimate without starting the run")
    parser.add_argument("--name", default="orbura-dataviz-train",
                        help="Dataset name on Adaption")
    parser.add_argument("--timeout", type=int, default=3600,
                        help="Wait timeout in seconds")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Input not found: {input_path}")
        print("Generate it first: python3 generate_full.py && python3 prepare_adaption.py")
        sys.exit(1)

    try:
        from adaption import Adaption
    except ImportError:
        print("Error: adaption package not installed")
        print("  pip install adaption")
        sys.exit(1)

    # Optionally merge train + val
    if args.combined:
        combined_path = OUT_DIR / "adaption_combined_train_val.jsonl"
        train_rows = [json.loads(l) for l in input_path.read_text().splitlines() if l.strip()]
        val_rows = [json.loads(l) for l in Path(args.combined).read_text().splitlines() if l.strip()]
        all_rows = train_rows + val_rows
        with open(combined_path, "w") as f:
            for row in all_rows:
                f.write(json.dumps(row) + "\n")
        print(f"Merged {len(train_rows)} train + {len(val_rows)} val = {len(all_rows)} total → {combined_path}")
        input_path = combined_path

    client = Adaption()
    print(f"Uploading {input_path} as '{args.name}'...")

    result = client.datasets.upload_file(str(input_path), name=args.name)
    dataset_id = result.dataset_id
    print(f"Uploaded. Dataset ID: {dataset_id}")

    # Wait for processing
    print("Waiting for file processing...")
    while True:
        status = client.datasets.get_status(dataset_id)
        if status.row_count is not None:
            print(f"  Processed: {status.row_count} rows")
            break
        time.sleep(2)

    # Adaption expects context as an array of column names
    column_mapping = {"prompt": "instruction", "completion": "output", "context": ["input"]}

    # Estimate first
    if args.estimate_only:
        estimate = client.datasets.run(
            dataset_id,
            column_mapping=column_mapping,
            estimate=True,
        )
        print(f"\nEstimate: {estimate.estimated_credits_consumed} credits")
        print(f"Estimated time: {getattr(estimate, 'estimated_minutes', '?')} min")
        return

    # Run augmentation — reasoning_traces + deduplication only
    # (prompt_rephrase disabled per Part 1 post-mortem: it rewrites system
    #  prompts, causing train/inference mismatch)
    print("\nStarting augmentation (reasoning_traces + deduplication)...")
    run = client.datasets.run(
        dataset_id,
        column_mapping=column_mapping,
        training_type="instruction_dataset",
        recipe_specification={
            "recipes": {
                "reasoning_traces": True,
                "prompt_rephrase": False,
                "deduplication": True,
            }
        },
    )
    print(f"Run started: {run.run_id}")
    print(f"Estimated: ~{getattr(run, 'estimated_minutes', '?')} min")

    # Wait for completion
    print(f"\nWaiting (timeout {args.timeout}s)...")
    final = client.datasets.wait_for_completion(dataset_id, timeout=args.timeout)
    print(f"Status: {final.status}")

    # Download
    download_url = client.datasets.download(dataset_id)
    output_path = OUT_DIR / "augmented_train.jsonl"
    print(f"\nDownloading augmented data → {output_path}")
    print(f"Download URL: {download_url}")

    import urllib.request
    urllib.request.urlretrieve(download_url, output_path)

    # Count rows
    with open(output_path) as f:
        row_count = sum(1 for line in f if line.strip())
    print(f"Augmented dataset: {row_count} rows → {output_path}")
    print("\nNext steps:")
    print("  1. Review the augmented data")
    print("  2. Upload to AutoScientist for training")
    print("  3. Run eval: python3 eval_finetuned.py --baseline Qwen/Qwen2.5-1.5B --finetuned <model>")


if __name__ == "__main__":
    main()
