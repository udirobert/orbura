---
base_model: mistralai/Mistral-7B-Instruct-v0.2
library_name: peft
pipeline_tag: text-generation
tags:
  - data-visualization
  - matplotlib
  - auto-scientist
  - adaption
  - chart-qa
  - code-generation
---

# Orbura AutoScientist Data Visualization Model (Mistral 7B)

## Model Details

- **Base model:** mistralai/Mistral-7B-Instruct-v0.2
- **Fine-tuning method:** LoRA (r=16, alpha=32) via AutoScientist co-optimization
- **Dataset:** [Papajams/orbura-dataviz-augmented](https://huggingface.co/datasets/Papajams/orbura-dataviz-augmented) (5,000 rows with reasoning traces)
- **Task:** Data visualization — matplotlib code generation, chart QA, code-to-description, style transfer, bug repair, chart-type selection
- **Competition:** AutoScientist Challenge Part 2 — Data Visualization

## Training

- **Train examples:** 5,000 (augmented with reasoning traces via Adaption Adaptive Data)
- **Validation examples:** 2,000 (deterministic, held-out)
- **Iterations:** 3 (AutoScientist co-optimization loop)
- **Best win rate:** 53.77%
- **LoRA rank:** 16, alpha: 32
- **Learning rate:** 1e-5, cosine schedule
- **Epochs:** 1
- **Training type:** LoRA
- **Batch size:** max (platform-selected)
- **Compute:** Free via Adaption voucher

## Evaluation

Naive baseline: 17.6% on 2k validation set.

Run the eval harness:
```bash
cd showcases/autoscientist-dataviz
python3 eval_finetuned.py --baseline-only
```

Scoring metrics (per-task deterministic evaluation):

| Task | Scoring method |
|---|---|
| `chart_qa` | Exact or numeric-tolerance match |
| `chart_to_code` / `data_to_code` | Chart function + data value overlap (≥80%) |
| `code_to_desc` | Chart type + ≥2 numeric mentions |
| `style_transfer` | Normalized code equivalence |
| `fix_code` | Normalized code equivalence |
| `chart_choice` | First-word (chart type) match |

## Usage

This is a LoRA adapter. Load it with PEFT:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base = AutoModelForCausalLM.from_pretrained("mistralai/Mistral-7B-Instruct-v0.2")
model = PeftModel.from_pretrained(base, "Papajams/orbura-dataviz-mistral-7b-autoscientist")
tokenizer = AutoTokenizer.from_pretrained("Papajams/orbura-dataviz-mistral-7b-autoscientist")

messages = [{"role": "user", "content": "Answer the question using the chart data.\n\n- A: 45\n- B: 78"}]
text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = tokenizer(text, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=256)
print(tokenizer.decode(output[0], skip_special_tokens=True))
```

## Limitations

- Trained on synthetic chart data with 4 chart types (line, bar, scatter, pie).
  Performance on novel chart types (boxplot, heatmap, violin) is not validated.
- The text-only dataset does not test visual chart reading. The multimodal pilot
  (100 rows) begins to address this but is too small for full training.
- Always validate generated matplotlib code before execution.

## Reproducibility

```bash
# 1. Generate the dataset
cd showcases/autoscientist-dataviz
python3 generate_full.py
python3 prepare_adaption.py

# 2. Run Adaption augmentation
python3 run_adaption.py --input data/adaption_train_5k.jsonl

# 3. Train via AutoScientist (adaptionlabs.ai/auto-scientist)
#    Upload the augmented dataset, select Mistral-7B, run co-optimization

# 4. Evaluate
python3 eval_finetuned.py --baseline-only

# 5. Publish
python3 publish_hf.py --model path/to/model
```

## License

Apache 2.0 (base model license applies). Dataset and model generated for the AutoScientist Challenge by [Adaption Labs](https://adaptionlabs.ai).
