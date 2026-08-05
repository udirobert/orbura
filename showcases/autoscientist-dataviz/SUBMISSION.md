# Submission checklist — AutoScientist Challenge Part 2 (Data Visualization)

Deadline: **August 10, 2026**

## Dataset & weights
- [x] Dataset generated (10k train + 2k val, 7 task types, 4 chart types)
- [x] Dataset uploaded to Hugging Face — https://huggingface.co/datasets/Papajams/orbura-dataviz-dataset
- [x] Dataset uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-dataset
- [ ] Adaption augmentation run (5k rows, reasoning traces + deduplication) — **in progress**
- [ ] Augmented dataset uploaded to Hugging Face
- [ ] Augmented dataset uploaded to Kaggle
- [ ] Model trained via AutoScientist (co-optimized SFT)
- [ ] Trained weights uploaded to Hugging Face Model Hub
- [ ] Trained weights uploaded to Kaggle Models

## Documentation
- [x] Model card (`MODEL_CARD.md`) — base model, data sources, training recipe, eval method, reproducibility
- [x] Dataset card (`DATASET_CARD.md`) — generation method, statistics, known limitations
- [x] Eval harness (`eval_finetuned.py`) — 6 task-specific scorers, supports HF/GGUF/Together AI
- [x] Augmentation run script (`run_adaption.py`) — reasoning traces + deduplication, prompt rephrase disabled
- [x] Publish scripts (`publish_hf.py`, `publish_kaggle.py`)
- [x] Social post templates (`social_posts.md`)
- [ ] Fill in eval results table in `MODEL_CARD.md` after training

## Demo & social
- [x] Judge page updated (`/autoscientist` — Part 2 section with task types, pipeline, before/after, augmentation lessons)
- [ ] Demo running (Gradio/Streamlit/HF Space or `/autoscientist` page with live model)
- [ ] LinkedIn post tagging `@adaption_ai` and `adaption-labs`
- [ ] X post tagging `@adaption_ai` and `adaption-labs`

## Validation
- [x] Naive baseline scored: 17.6% overall (35.4% chart_qa, 30.2% chart_choice, 0% code tasks)
- [ ] Fine-tuned model beats base model on the held-out validation set (run `eval_finetuned.py`)
- [ ] Final model evaluated against the in-house test set via AutoScientist/Adaption
- [ ] Submission form submitted before August 10

## Eval commands (quick reference)

```bash
# Naive baseline (no model needed)
cd showcases/autoscientist-dataviz
python3 eval_finetuned.py --baseline-only

# Baseline vs fine-tuned (HF models)
python3 eval_finetuned.py --baseline Qwen/Qwen2.5-1.5B --finetuned path/to/model

# Quick 100-sample test
python3 eval_finetuned.py --baseline-only --max-samples 100

# Via Together AI
python3 eval_finetuned.py --together-model <model_name> --together-baseline Qwen/Qwen2.5-1.5B
```

## Augmentation + training commands

```bash
# 1. Run Adaption augmentation (5k rows, ~73 min, 50 credits)
cd showcases/autoscientist-dataviz
export ADAPTION_API_KEY="pt_live_..."
python3 run_adaption.py --input data/adaption_train_5k.jsonl --timeout 5400

# 2. Train via AutoScientist (adaptionlabs.ai/auto-scientist)
#    Upload augmented_train.jsonl, select base model, run co-optimization

# 3. Evaluate
python3 eval_finetuned.py --baseline Qwen/Qwen2.5-1.5B --finetuned path/to/model

# 4. Publish
python3 publish_hf.py --model path/to/model --dataset-only
python3 publish_kaggle.py --model path/to/model --dataset-only
```
