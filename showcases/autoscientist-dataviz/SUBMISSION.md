# Submission checklist — AutoScientist Challenge Part 2 (Data Visualization)

Deadline: **August 10, 2026**

## Dataset & weights
- [x] Dataset generated (10k train + 2k val, 7 task types, 4 chart types)
- [x] Dataset uploaded to Hugging Face — https://huggingface.co/datasets/Papajams/orbura-dataviz-dataset
- [x] Dataset uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-dataset
- [x] Adaption augmentation run (5k rows, reasoning traces + deduplication) — **succeeded**
- [x] Augmented dataset uploaded to Hugging Face — https://huggingface.co/datasets/Papajams/orbura-dataviz-augmented
- [x] Augmented dataset uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-augmented
- [x] Model trained via AutoScientist (co-optimized SFT, 3 iterations, 52% win rate)
- [x] Trained weights uploaded to Hugging Face — https://huggingface.co/Papajams/orbura-dataviz-llama32-3b-autoscientist
- [x] Trained weights uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-llama32-3b

## Documentation
- [x] Model card (`MODEL_CARD.md`) — base model, data sources, training recipe, eval method, reproducibility
- [x] Dataset card (`DATASET_CARD.md`) — generation method, statistics, known limitations
- [x] Eval harness (`eval_finetuned.py`) — 6 task-specific scorers, supports HF/GGUF/Together AI
- [x] Augmentation run script (`run_adaption.py`) — reasoning traces + deduplication, prompt rephrase disabled
- [x] Publish scripts (`publish_hf.py`, `publish_kaggle.py`)
- [x] Social post templates (`social_posts.md`)
- [x] Fill in eval results table in `MODEL_CARD.md` — AutoScientist win rate: 52%

## Demo & social
- [x] Judge page updated (`/autoscientist` — Part 2 section with task types, pipeline, before/after, augmentation lessons)
- [ ] Demo running (Gradio/Streamlit/HF Space or `/autoscientist` page with live model)
- [ ] LinkedIn post tagging `@adaption_ai` and `adaption-labs`
- [ ] X post tagging `@adaption_ai` and `adaption-labs`

## Validation
- [x] Naive baseline scored: 17.6% overall (35.4% chart_qa, 30.2% chart_choice, 0% code tasks)
- [x] AutoScientist training complete — 3 iterations, best win rate 52.01%
- [x] Best hyperparameters: LoRA r=16, alpha=32, lr=1e-5, cosine schedule, 1 epoch
- [ ] Final model evaluated against the in-house test set via AutoScientist/Adaption
- [ ] Submission form submitted before August 10

## Training results

| Metric | Value |
|---|---|
| Base model | meta-llama/Llama-3.2-3B-Instruct |
| Training method | LoRA (r=16, alpha=32) via AutoScientist co-optimization |
| Dataset | 5,000 augmented rows (reasoning traces + deduplication) |
| Iterations | 3/3 completed |
| Best win rate | 52.01% |
| Best hyperparams | lr=1e-5, lora_r=16, lora_alpha=32, epochs=1, cosine schedule |
| Augmentation quality | Grade E → D (score 3.0 → 3.9, +30%) |
| Completion quality gain | +102.5% (2.03 → 4.11) |

## Published artifacts

| Artifact | Hugging Face | Kaggle |
|---|---|---|
| Original dataset (10k + 2k) | [Papajams/orbura-dataviz-dataset](https://huggingface.co/datasets/Papajams/orbura-dataviz-dataset) | [udingethe/orbura-dataviz-dataset](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-dataset) |
| Augmented dataset (5k) | [Papajams/orbura-dataviz-augmented](https://huggingface.co/datasets/Papajams/orbura-dataviz-augmented) | [udingethe/orbura-dataviz-augmented](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-augmented) |
| Model weights (LoRA adapter) | [Papajams/orbura-dataviz-llama32-3b-autoscientist](https://huggingface.co/Papajams/orbura-dataviz-llama32-3b-autoscientist) | [udingethe/orbura-dataviz-llama32-3b](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-llama32-3b) |
