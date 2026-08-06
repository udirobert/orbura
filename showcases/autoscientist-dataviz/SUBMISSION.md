# Submission checklist — AutoScientist Challenge Part 2 (Data Visualization)

Deadline: **August 10, 2026**

## Dataset & weights
- [x] Dataset generated (10k train + 2k val, 7 task types, 4 chart types)
- [x] Dataset uploaded to Hugging Face — https://huggingface.co/datasets/Papajams/orbura-dataviz-dataset
- [x] Dataset uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-dataset
- [x] Adaption augmentation run (5k rows, reasoning traces + deduplication) — **succeeded**
- [x] Augmented dataset uploaded to Hugging Face — https://huggingface.co/datasets/Papajams/orbura-dataviz-augmented
- [x] Augmented dataset uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-augmented
- [x] Model trained via AutoScientist — **two models trained**
- [x] Llama 3.2-3B weights uploaded to HF — https://huggingface.co/Papajams/orbura-dataviz-llama32-3b-autoscientist
- [x] Llama 3.2-3B weights uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-llama32-3b
- [x] Mistral 7B weights uploaded to HF — https://huggingface.co/Papajams/orbura-dataviz-mistral-7b-autoscientist
- [x] Mistral 7B weights uploaded to Kaggle — https://www.kaggle.com/datasets/udingethe/orbura-dataviz-mistral-7b

## Training results

| Metric | Llama 3.2-3B | Mistral 7B |
|---|---|---|
| Win rate | 52.01% | **53.77%** |
| LoRA rank | 16 | 16 |
| LoRA alpha | 32 | 32 |
| Learning rate | 1e-5 | 1e-5 |
| LR scheduler | cosine | cosine |
| Epochs | 1 | 1 |
| Iterations | 3/3 | 3/3 |
| Augmentation quality gain | E→D (+30%) | E→D (+30%) |
| Completion quality gain | +102.5% | +102.5% |

## Documentation
- [x] Model card (`MODEL_CARD.md`)
- [x] Dataset card (`DATASET_CARD.md`)
- [x] Eval harness (`eval_finetuned.py`)
- [x] Augmentation run script (`run_adaption.py`)
- [x] Publish scripts (`publish_hf.py`, `publish_kaggle.py`)
- [x] Social post templates (`social_posts.md`)
- [x] Training notebook for Clusy (`train_dataviz.ipynb`)

## Demo & social
- [x] Judge page updated (`/autoscientist` — Part 2 section)
- [ ] Demo running
- [ ] LinkedIn post tagging `@adaption_ai` and `adaption-labs`
- [ ] X post tagging `@adaption_ai` and `adaption-labs`

## Validation
- [x] Naive baseline scored: 17.6% overall
- [x] AutoScientist training complete — both models, 3 iterations each
- [x] Mistral 7B is the best model: 53.77% win rate
- [ ] Submission form submitted before August 10

## Published artifacts

| Artifact | Hugging Face | Kaggle |
|---|---|---|
| Original dataset (10k + 2k) | [Papajams/orbura-dataviz-dataset](https://huggingface.co/datasets/Papajams/orbura-dataviz-dataset) | [udingethe/orbura-dataviz-dataset](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-dataset) |
| Augmented dataset (5k) | [Papajams/orbura-dataviz-augmented](https://huggingface.co/datasets/Papajams/orbura-dataviz-augmented) | [udingethe/orbura-dataviz-augmented](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-augmented) |
| Llama 3.2-3B model | [Papajams/orbura-dataviz-llama32-3b-autoscientist](https://huggingface.co/Papajams/orbura-dataviz-llama32-3b-autoscientist) | [udingethe/orbura-dataviz-llama32-3b](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-llama32-3b) |
| Mistral 7B model (best) | [Papajams/orbura-dataviz-mistral-7b-autoscientist](https://huggingface.co/Papajams/orbura-dataviz-mistral-7b-autoscientist) | [udingethe/orbura-dataviz-mistral-7b](https://www.kaggle.com/datasets/udingethe/orbura-dataviz-mistral-7b) |
