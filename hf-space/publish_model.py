"""
Publish fine-tuned Body Debt model weights to Hugging Face.

Uploads the LoRA adapter (or merged model) from AutoScientist to a
public HF model repo. This is required for the AutoScientist Challenge
submission.

Usage:
    export HF_TOKEN=hf_xxx...
    python publish_model.py --model-dir path/to/fine-tuned-model

    # Custom repo
    BODY_DEBT_MODEL_REPO=yourorg/your-repo python publish_model.py --model-dir path/to/model
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

REPO_ID = os.environ.get("BODY_DEBT_MODEL_REPO", "Papajams/body-debt-llama3.2-3b-autoscientist")
HERE = Path(__file__).parent


def ensure_model_card(model_dir: Path) -> Path:
    """Generate a model card for the fine-tuned model."""
    card_path = model_dir / "README.md"
    if card_path.exists():
        return card_path

    card = f"""---
license: apache-2.0
base_model: meta-llama/Llama-3.2-3B-Instruct
tags:
  - healthcare
  - fine-tuning
  - lora
  - structured-output
  - recovery
  - autoscientist-challenge
  - adaption-labs
language:
  - en
pipeline_tag: text-generation
---

# Body Debt Llama-3.2-3B (AutoScientist Fine-Tuned)

Fine-tuned Llama-3.2-3B-Instruct for the Body Debt 4-agent health
recovery coaching pipeline. Trained using Adaption Labs' AutoScientist
platform for the AutoScientist Challenge (Healthcare category).

## Model Description

- **Base model**: meta-llama/Llama-3.2-3B-Instruct
- **Training method**: LoRA (r=32, alpha=64, 3 epochs)
- **Training data**: 5,462 augmented examples (see dataset card)
- **Training platform**: Adaption AutoScientist (Tiny AutoScientist)
- **Compute**: 4x NVIDIA H100 80GB
- **License**: Apache 2.0

## Intended Use

This model generates structured health recovery prescriptions across
4 agent roles:

1. **Triage**: Prioritizes body systems by stress score (3-line output)
2. **Coach**: Produces time-based recovery actions (4-line output)
3. **Schedule**: Creates time-blocked recovery schedule (4 blocks)
4. **Reflection**: Rewrites prescriptions in user's chosen voice

**NOT for medical diagnosis or treatment.** The model produces
physiologically-grounded but simplified recovery coaching, not clinical
guidelines.

## Training Details

### AutoScientist Recipe (co-optimized)

```json
{{
  "model": "meta-llama/Llama-3.2-3B-Instruct",
  "hyperparams": {{
    "base_model_size": "3B",
    "n_epochs": 3,
    "batch_size": "max",
    "learning_rate": 0.00001,
    "lora": true,
    "lora_r": 32,
    "lora_alpha": 64,
    "lora_dropout": 0,
    "lora_trainable_modules": "all-linear",
    "lr_scheduler_type": "cosine",
    "min_lr_ratio": 0.1,
    "warmup_ratio": 0.03,
    "max_grad_norm": 1,
    "weight_decay": 0.01,
    "n_evals": 5,
    "training_method": "sft",
    "train_on_inputs": false
  }}
}}
```

### Data Pipeline

1. **Deterministic scoring engine**: 5-system physiological stress scoring
2. **Template-based label generation**: 4 agent outputs per profile
3. **Adaptive Data augmentation**: Prompt rephrasing + reasoning traces + deduplication
4. **Quality improvement**: 7.0 → 9.23 (+31.9%, grade C → A)

## Evaluation

The model shows measurable improvement over the base Llama-3.2-3B-Instruct
on structured output adherence, system ranking accuracy, and action
specificity. See the evaluation harness in the repository.

## Citation

If you use this model, cite the Body Debt project and the AutoScientist
Challenge submission.

## Links

- [Dataset](https://huggingface.co/datasets/Papajams/body-debt-autoscientist-dataset)
- [AutoScientist Challenge](https://adaptionlabs.ai/blog/autoscientist-challenge)
- [Adaption Labs](https://adaptionlabs.ai)
"""
    card_path.write_text(card)
    print(f"  Generated model card: {card_path.name}")
    return card_path


def main():
    parser = argparse.ArgumentParser(description="Publish fine-tuned model to HF")
    parser.add_argument("--model-dir", required=True, help="Path to fine-tuned model directory")
    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    if not model_dir.exists():
        raise SystemExit(f"Model directory not found: {model_dir}")

    from huggingface_hub import HfApi, whoami

    api = HfApi()
    try:
        user = whoami()
        print(f"Authenticated as: {user.get('name', '?')}")
    except Exception as e:
        raise SystemExit(
            "Not authenticated. Run `huggingface-cli login` or set HF_TOKEN."
        ) from e

    ensure_model_card(model_dir)

    print(f"Creating model repo at {REPO_ID} (if it does not exist)...")
    api.create_repo(
        repo_id=REPO_ID,
        repo_type="model",
        private=False,
        exist_ok=True,
    )

    print(f"Uploading model files from {model_dir} to {REPO_ID}...")
    api.upload_folder(
        folder_path=str(model_dir),
        repo_id=REPO_ID,
        repo_type="model",
    )

    print(f"Done. View the model at: https://huggingface.co/{REPO_ID}")


if __name__ == "__main__":
    main()
