"""
Publish the Body Debt fine-tuning dataset to Hugging Face.

Uploads all 8 JSONL files (4 train + 4 test) plus a README model card
to a public HF dataset repo. This is one of the two required release
destinations for the AutoScientist Challenge (the other is Kaggle).

Usage:
    export HF_TOKEN=hf_xxx...
    python publish_finetune_dataset.py

    # Custom repo
    BODY_DEBT_FINETUNE_REPO=yourorg/your-repo python publish_finetune_dataset.py
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ID = os.environ.get("BODY_DEBT_FINETUNE_REPO", "Papajams/body-debt-finetune-dataset")
HERE = Path(__file__).parent
DATASETS_DIR = HERE / "datasets"
README_PATH = HERE / "datasets" / "README.md"

AGENTS = ["triage", "coach", "schedule", "reflection"]


def ensure_readme() -> None:
    """Generate a dataset card if one doesn't exist."""
    if README_PATH.exists():
        return
    readme = f"""---
license: apache-2.0
task_categories:
  - text-generation
language:
  - en
tags:
  - healthcare
  - fine-tuning
  - structured-output
  - recovery
  - autoscientist-challenge
---

# Body Debt Fine-Tuning Dataset

Structured recovery prescription dataset for fine-tuning small language models
on the Body Debt 4-agent health coaching pipeline.

## Dataset Description

- **Domain**: Healthcare / physiological recovery
- **Base model**: Qwen3-1.7B-Instruct
- **Total examples**: 12,800 (3,000 train + 200 test per agent × 4 agents)
- **Generation method**: Deterministic scoring engine + template-based labels
- **License**: Apache 2.0

## Structure

The dataset contains 4 sub-tasks, one per QVAC pipeline agent:

| Agent | Input | Output format | Train | Test |
|-------|-------|---------------|-------|------|
| Triage | 5-system scores | PRIORITY / SECONDARY / AVOID (3 lines) | 3,000 | 200 |
| Coach | Triage + stressors | RIGHT NOW / THIS MORNING / TODAY / AVOID (4 lines) | 3,000 | 200 |
| Schedule | Triage + Coach + time | 4 time-blocked recovery actions | 3,000 | 200 |
| Reflection | Coach + personality | Coach output rewritten in chosen voice | 3,000 | 200 |

Each JSONL line is a chat-formatted example:
```json
{{
  "messages": [
    {{"role": "system", "content": "<agent system prompt>"}},
    {{"role": "user", "content": "<formatted input>"}},
    {{"role": "assistant", "content": "<deterministic label>"}}
  ]
}}
```

## Generation Pipeline

1. **Profile sampling**: Stressor profiles sampled from a constrained
   parameter space (alcohol type/count, training area/intensity, sleep
   hours, stress, illness, care actions).

2. **Deterministic scoring**: Each profile is scored by the Body Debt
   5-system engine (`scoring.py`), producing cardiovascular, brain,
   liver, muscular, and gut scores (0-100).

3. **Label generation**: Deterministic template functions produce the
   ground-truth output for each agent:
   - Triage: `_fallback_plan()` logic (system ranking + avoid mapping)
   - Coach: `_fallback_advice()` logic (severity-tiered prescriptions)
   - Schedule: `generate_schedule()` (top-4 systems → time blocks)
   - Reflection: `apply_voice()` (deterministic voice transformation)

4. **Chat formatting**: Each example is wrapped in the exact system
   prompt used by the QVAC pipeline at inference time, ensuring
   train/inference prompt alignment.

## Reproducibility

```bash
python generate_finetune_dataset.py --n-train 3000 --n-test 200 --seed 42
```

## Intended Use

Fine-tuning small language models (1-2B parameters) for structured
health recovery coaching. NOT for medical diagnosis or treatment
recommendations. The deterministic labels are physiologically grounded
but simplified — they are training targets, not clinical guidelines.

## Citation

If you use this dataset, cite the Body Debt project and the AutoScientist
Challenge submission.
"""
    README_PATH.parent.mkdir(parents=True, exist_ok=True)
    README_PATH.write_text(readme)
    print(f"  Generated {README_PATH.name}")


def main() -> None:
    if not DATASETS_DIR.exists():
        raise SystemExit(
            f"Missing {DATASETS_DIR}. Run `python generate_finetune_dataset.py` first."
        )

    # Check that at least the train files exist
    missing = []
    for agent in AGENTS:
        for split in ["train", "test"]:
            f = DATASETS_DIR / f"{agent}_{split}.jsonl"
            if not f.exists():
                missing.append(f.name)
    if missing:
        raise SystemExit(f"Missing dataset files: {', '.join(missing)}")

    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `huggingface-cli login` or set HF_TOKEN."
        ) from e

    ensure_readme()

    print(f"Creating dataset repo at {REPO_ID} (if it does not exist)...")
    api.create_repo(
        repo_id=REPO_ID,
        repo_type="dataset",
        private=False,
        exist_ok=True,
    )

    patterns = [f"{agent}_{split}.jsonl" for agent in AGENTS for split in ["train", "test"]]
    patterns.append("README.md")

    print(f"Uploading {len(patterns)} files to {REPO_ID}...")
    api.upload_folder(
        folder_path=str(DATASETS_DIR),
        repo_id=REPO_ID,
        repo_type="dataset",
        allow_patterns=patterns,
    )

    print(f"Done. View the dataset at: https://huggingface.co/datasets/{REPO_ID}")


if __name__ == "__main__":
    main()
