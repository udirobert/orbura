# AutoScientist Challenge — Body Debt Submission Plan

**Challenge**: [Adaption Labs AutoScientist Challenge](https://adaptionlabs.ai/blog/autoscientist-challenge)
**Category**: Healthcare (Part 1: June 8 – July 5, winners July 13)
**Prize**: $4,000 first / $1,000 runner-up per category
**Base model**: Qwen3-1.7B-Instruct (Q4 quantized, already in the QVAC pipeline)
**Fine-tune targets**: All 4 agents (Triage, Coach, Schedule, Reflection)

---

## 1. What the challenge requires

1. **Category**: Healthcare — one of 10 categories. Part 1 closes July 5.
2. **Release**: Both the adapted dataset AND the trained weights must go to
   **Hugging Face AND Kaggle**. Not optional.
3. **Relative improvement**: The fine-tuned model must show a measurable
   percentage improvement over a baseline on Adaption's held-out test set.
4. **Bonus**: Demo of AutoScientist usage + social post on LinkedIn and X
   tagging `@adaption_ai` and `adaption-labs`.

Adaption provides $1,000 in credits for data adaptation + free compute for
AutoScientist. The competitive edge is the **dataset**, not the compute.

---

## 2. Why Body Debt fits Healthcare

Body Debt is a deterministic physiological scoring engine that maps lifestyle
stressors (alcohol, sleep, training, illness, stress) to a 5-system body debt
score (cardiovascular, brain, liver, muscular, gut) and produces structured
recovery prescriptions. This is a healthcare task with:

- A **deterministic ground-truth generator** (`hf-space/scoring.py` +
  `hf-space/health_coach.py` `_fallback_advice` / `_fallback_plan`) that can
  produce unlimited labeled (input → output) pairs without human annotation.
- A **structured output format** (PRIORITY/SECONDARY/AVOID and
  RIGHT NOW/THIS MORNING/TODAY/AVOID) that makes evaluation deterministic and
  reproducible — no subjective rubric scoring needed.
- A **shipping baseline model** (Qwen3-1.7B-Instruct Q4 via QVAC) that we can
  benchmark against and show improvement on.

The story for judges: a small on-device health coach that is currently
prompt-only becomes a fine-tuned model that reliably produces
physiologically-correct structured recovery plans — measurable improvement on
format adherence, system-ranking accuracy, and action specificity.

---

## 3. The four fine-tuning targets

Each agent is a separate fine-tuning task with its own input schema, output
schema, and eval metric. All four share the same input: a stressor profile +
the deterministic 5-system scores.

### 3.1 Triage Agent

**Input**: 5-system scores (JSON array of `{system, label, score, clearedAt}`)
+ debt score (0-100).

**Output** (3 lines):
```
PRIORITY: <body system name> <score> — <health reason in 8 words>
SECONDARY: <body system name> <score> — <health reason in 8 words>
AVOID: <one health thing to avoid + biological reason, 12 words max>
```

**Label source**: `_fallback_plan()` in `hf-space/health_coach.py` (lines
201-218) produces deterministic PRIORITY/SECONDARY/AVOID from the system
scores. The avoid mapping is system-specific (brain → late caffeine, liver →
alcohol/fatty foods, muscular → heavy lifts, cardio → intervals/sauna, gut →
sugar/dairy).

**Eval metric**: **Structured accuracy** —
- PRIORITY system matches the highest-scoring system (exact match)
- SECONDARY system matches the second-highest system with score > 10
- AVOID line targets the correct system (keyword match)
- Format compliance: exactly 3 lines, correct prefixes, word count within limits

### 3.2 Coach Agent

**Input**: Triage output + debt score + stressor summary + face stress (optional).

**Output** (4 lines):
```
RIGHT NOW: <one specific health action with quantity, 12-18 words>
THIS MORNING: <one specific health action for next 2-3 hours, 12-18 words>
TODAY: <one key insight about physical capacity today, 12-18 words>
AVOID: <one thing to avoid + biological reason, 12-18 words>
```

**Label source**: `_fallback_advice()` in `hf-space/health_coach.py` (lines
128-148) produces severity-tiered (high >60, moderate 30-60, low ≤30)
structured advice. The "RIGHT NOW" line is fixed (water + electrolytes); the
other three lines vary by severity tier and worst system.

**Eval metric**: **Format adherence + content match** —
- 4 lines with correct prefixes (RIGHT NOW / THIS MORNING / TODAY / AVOID)
- Word count per line within 12-18 range
- RIGHT NOW mentions hydration (water/electrolytes)
- AVOID targets the correct system
- Severity tier matches the debt score band

### 3.3 Schedule Agent

**Input**: Triage output + Coach output + current time + recovery window.

**Output** (4 lines):
```
<time range> | <health action> | <body system>
NOW-10AM | 500ml water + electrolytes, no caffeine | Liver
10AM-12PM | Light walk outside, natural light | Brain
12PM-3PM | Protein-rich lunch, gentle movement | Muscular
3PM-6PM | No intense activity, hydrate | Cardiovascular
```

**Label source**: Needs a new deterministic schedule generator. The schedule
maps the 4 highest-priority systems to 4 time blocks, with system-specific
actions. This is the one target that does NOT have an existing deterministic
fallback — we need to write `generate_schedule()` in the dataset generator.

**Eval metric**: **Slot accuracy** —
- 4 time blocks covering NOW to ~6PM (or 12-hour window)
- Each block has a system that matches the priority ranking
- Actions are system-appropriate (liver → hydration/no caffeine, brain →
  light/natural light, muscular → protein/movement, cardio → no intense
  activity)
- Format: `<time range> | <action> | <system>` with pipe separators

### 3.4 Reflection Agent

**Input**: Coach output + personality voice (honest/gentle/scientific/sarcastic).

**Output** (4 lines, same structure as Coach but rewritten in the chosen voice):
```
RIGHT NOW: <rewritten in voice>
THIS MORNING: <rewritten in voice>
TODAY: <rewritten in voice>
AVOID: <rewritten in voice>
```

**Label source**: The deterministic fallback is the Coach output itself (the
"reflection" preserves all actions, quantities, and biology — only the tone
changes). For training labels, we can generate voice variants by applying
deterministic transformations:
- honest: pass through unchanged (tighten wording)
- gentle: prepend "You've earned this — " style framing
- scientific: append mechanism keywords (cortisol, HRV, glycogen, hepatic)
- sarcastic: prepend a dry callout of the cause

**Eval metric**: **Content preservation + voice consistency** —
- All 4 actions from the Coach output are preserved (no new advice invented)
- AVOID line is not softened
- Voice markers present (scientific → ≥1 mechanism term, sarcastic → dry tone,
  gentle → supportive framing, honest → direct/no-fluff)
- Format: 4 lines with correct prefixes

---

## 4. Dataset schema

Each fine-tuning target gets its own JSONL file. All share the same input
generation pipeline; only the output field differs.

### 4.1 Input profile schema

Generated by sampling the stressor parameter space in
`hf-space/scoring.py`:

```json
{
  "profile_id": "synth_0001",
  "stressors": {
    "alcohol": true,
    "alcohol_type": "spirits",
    "alcohol_count": "5+",
    "training": true,
    "training_area": "legs",
    "training_intensity": "destroyed",
    "sleep": true,
    "sleep_hours": "under_4",
    "stress": false,
    "ill": false,
    "care": false
  },
  "debt_score": 78,
  "system_scores": [
    {"system": "liver", "label": "Liver", "score": 82, "clearedAt": "..."},
    {"system": "brain", "label": "Brain / Cognition", "score": 71, "clearedAt": "..."},
    {"system": "muscular", "label": "Muscular / CNS", "score": 65, "clearedAt": "..."},
    {"system": "cardiovascular", "label": "Cardiovascular", "score": 48, "clearedAt": "..."},
    {"system": "gut", "label": "Gut", "score": 30, "clearedAt": "..."}
  ],
  "stressor_summary": "5+ spirits, destroyed legs workout, under 4h sleep",
  "face_stress": 72.3,
  "personality": "honest",
  "current_time": "morning",
  "recovery_time": "later today"
}
```

### 4.2 Stressor parameter space (for sampling)

| Parameter | Values |
|---|---|
| alcohol | true / false |
| alcohol_type | beer, red_wine, white_wine, spirits, cocktails, champagne |
| alcohol_count | 1-2, 3-4, 5+, lost_count |
| training | true / false |
| training_area | legs, full_body, hiit, cardio, upper, mobility |
| training_intensity | easy, hard, destroyed |
| sleep | true / false |
| sleep_hours | under_4, 4-6, 6-7 |
| stress | true / false |
| ill | true / false |
| ill_severity | mild, moderate, floored |
| care | true / false |
| personality | honest, gentle, scientific, sarcastic |

Full factorial = 2 × 6 × 4 × 2 × 6 × 3 × 2 × 3 × 2 × 2 × 3 × 2 × 4 = ~414k
combinations. We sample ~2,000-5,000 realistic profiles (constrained: e.g.
alcohol_count only when alcohol=true, ill_severity only when ill=true,
lost_count rarely, mobility rarely paired with destroyed).

### 4.3 Output files (one per agent)

```
hf-space/datasets/
  triage_train.jsonl      # {profile_id, input: {...}, output: "PRIORITY: ...\nSECONDARY: ...\nAVOID: ..."}
  triage_test.jsonl       # held-out 200 profiles
  coach_train.jsonl       # {profile_id, input: {...}, output: "RIGHT NOW: ...\nTHIS MORNING: ...\nTODAY: ...\nAVOID: ..."}
  coach_test.jsonl
  schedule_train.jsonl    # {profile_id, input: {...}, output: "NOW-10AM | ...\n..."}
  schedule_test.jsonl
  reflection_train.jsonl  # {profile_id, input: {..., coach_output: "..."}, output: "RIGHT NOW: ...\n..."}
  reflection_test.jsonl
```

Each JSONL line is a chat-formatted example ready for SFT:
```json
{
  "messages": [
    {"role": "system", "content": "<agent system prompt>"},
    {"role": "user", "content": "<formatted input>"},
    {"role": "assistant", "content": "<deterministic label>"}
  ]
}
```

---

## 5. Dataset generation pipeline

### 5.1 New script: `hf-space/generate_finetune_dataset.py`

Extends the existing `generate_trace_dataset.py` pattern but:
- Samples profiles programmatically (not hardcoded 12)
- Generates labels for all 4 agents per profile
- Writes 4 train + 4 test JSONL files
- Adds the new `generate_schedule()` deterministic function
- Adds voice-variant generation for the Reflection agent

### 5.2 Profile sampling strategy

```python
def sample_profile(rng):
    # Constrain to realistic combinations
    alcohol = rng.random() < 0.5
    training = rng.random() < 0.6
    sleep_bad = rng.random() < 0.4
    stress = rng.random() < 0.3
    ill = rng.random() < 0.15
    care = rng.random() < 0.2
    # ... pick sub-parameters, run scoring, return profile dict
```

Target: **3,000 train + 200 test** per agent (3,200 profiles total, shared
across agents — each profile produces 4 training examples, one per agent).

### 5.3 New deterministic functions needed

1. **`generate_schedule(system_scores, current_time, recovery_time)`** —
   maps top-4 systems to 4 time blocks with system-specific actions. Not yet
   in the codebase. ~40 lines following the `_fallback_plan` pattern.

2. **`apply_voice(coach_output, personality)`** — deterministic voice
   transformation. Not yet in the codebase. ~30 lines of string transforms.

Both go in `hf-space/generate_finetune_dataset.py` (or a new
`hf-space/deterministic_labels.py` module imported by the generator).

---

## 6. AutoScientist + Adaptive Data workflow

The Adaption platform has two products that work together:

1. **Adaptive Data** (docs.adaptionlabs.ai) — ingests your dataset, augments
   it (reasoning traces, prompt rephrasing, deduplication, preference pairs),
   and exports enhanced training data. Has a full Python SDK (`pip install adaption`).
2. **AutoScientist** (adaptionlabs.ai/auto-scientist) — takes the enhanced
   dataset + base model, co-optimizes data + training recipes, outputs
   fine-tuned weights. Web-app driven.

The workflow is: **our deterministic dataset → Adaptive Data augmentation →
AutoScientist co-optimization → fine-tuned weights → eval against baseline →
release to HF + Kaggle**.

### Step 1: Set up accounts
- [ ] Sign up at adaptionlabs.ai (done)
- [ ] Connect a Together AI account (provides compute for AutoScientist)
- [ ] Create an Adaption API key at https://adaptionlabs.ai/app/settings?tab=api_keys
- [ ] `pip install adaption`
- [ ] `export ADAPTION_API_KEY="pt_live_..."`
- [ ] Register Kaggle credentials in Adaption (for the Kaggle import path)

### Step 2: Augment the dataset via Adaptive Data SDK

For each of the 4 agents, upload the JSONL to Adaptive Data and run an
augmentation pass. The SDK supports JSONL directly.

```python
from adaption import Adaption

client = Adaption()  # reads ADAPTION_API_KEY

# Upload the triage training data
result = client.datasets.upload_file(
    "hf-space/datasets/triage_train.jsonl",
    name="body-debt-triage-train",
)
dataset_id = result.dataset_id

# Wait for file processing
import time
while True:
    status = client.datasets.get_status(dataset_id)
    if status.row_count is not None:
        break
    time.sleep(2)

# Estimate cost first
estimate = client.datasets.run(
    dataset_id,
    column_mapping={"prompt": "messages", "completion": "messages"},
    estimate=True,
)
print(f"Would cost {estimate.estimated_credits_consumed} credits")

# Run augmentation with reasoning traces + prompt rephrasing
run = client.datasets.run(
    dataset_id,
    column_mapping={"prompt": "messages", "completion": "messages"},
    training_type="instruction_dataset",
    recipe_specification={
        "recipes": {
            "reasoning_traces": True,
            "prompt_rephrase": True,
            "deduplication": True,
        }
    },
)
print(f"Run started: {run.run_id}, ~{run.estimated_minutes} min")

# Wait for completion
final = client.datasets.wait_for_completion(dataset_id, timeout=1800)
print(f"Finished: {final.status}")

# Download augmented data
url = client.datasets.download(dataset_id)
print(f"Download: {url}")
```

Repeat for coach, schedule, and reflection agents.

**Key API parameters** (from docs.adaptionlabs.ai/api/resources/datasets/methods/run):
- `training_type`: `"instruction_dataset"` (SFT) or `"preference_pairs"` (DPO)
- `recipe_specification.recipes`: `reasoning_traces`, `prompt_rephrase`, `deduplication`
- `brand_controls.blueprint`: freeform system prompt for style/tone control
- `brand_controls.length`: `"minimal"`, `"concise"`, `"detailed"`, `"extensive"`
- `brand_controls.hallucination_mitigation`: web-search grounding
- `estimate=True`: get cost quote without starting

### Step 3: Run AutoScientist co-optimization

In the Adaption web app (adaptionlabs.ai/app):
1. Open AutoScientist
2. For each agent, define:
   - **Task**: "Given a 5-system body debt breakdown, produce a structured
     recovery prescription in exactly N lines with format X."
   - **Base model**: Qwen3-1.7B-Instruct (or Qwen2.5-1.5B if Qwen3 unavailable)
   - **Dataset**: the augmented dataset from Step 2
   - **Eval metric**: structured accuracy (format adherence + system ranking +
     action specificity — the same metrics in `eval_finetuned.py`)
3. Let AutoScientist co-optimize data + training recipes until convergence
4. Download the fine-tuned checkpoint

### Step 4: Export and convert weights
- Download the 4 fine-tuned checkpoints from AutoScientist
- For the QVAC pipeline (on-device): convert to GGUF Q4 using llama.cpp:
  ```bash
  python -m llama_cpp.convert_hf_to_gguf path/to/model --outtype f16
  llama-quantize model-f16.gguf model-q4.gguf q4_k_m
  ```
- For HF release: keep as HF format (safetensors)

### Step 5: Evaluate against baseline
```bash
# Baseline (zero-shot Qwen3-1.7B)
python eval_finetuned.py --model Qwen/Qwen3-1.7B --skip-baseline --n-samples 200

# Fine-tuned
python eval_finetuned.py --model path/to/fine-tuned --baseline Qwen/Qwen3-1.7B
```

The eval harness produces a comparison table:
```
Agent       | Baseline | Fine-tuned | Improvement
------------|----------|------------|------------
Triage      |   45.2%  |    89.0%   |   +43.8pp
Coach       |   32.0%  |    81.5%   |   +49.5pp
Schedule    |   18.5%  |    72.0%   |   +53.5pp
Reflection  |   55.0%  |    88.0%   |   +33.0pp
```

---

## 7. Release checklist

### 7.1 Hugging Face (partially scaffolded)

| Artifact | HF repo | Script | Status |
|---|---|---|---|
| Stress MLP (ONNX) | `Papajams/body-debt-stress-mlp` | `publish_mlp.py` | Done |
| Agent traces (12 profiles) | `Papajams/body-debt-traces` | `publish_traces.py` | Done |
| Fine-tuned Triage model | `Papajams/body-debt-triage-qwen3` | **new** `publish_finetuned.py` | TODO |
| Fine-tuned Coach model | `Papajams/body-debt-coach-qwen3` | **new** | TODO |
| Fine-tuned Schedule model | `Papajams/body-debt-schedule-qwen3` | **new** | TODO |
| Fine-tuned Reflection model | `Papajams/body-debt-reflection-qwen3` | **new** | TODO |
| Fine-tune dataset (all 4) | `Papajams/body-debt-finetune-dataset` | **new** `publish_finetune_dataset.py` | TODO |

### 7.2 Kaggle (not scaffolded — needs new scripts)

Kaggle requires the `kaggle` CLI + API token (`~/.kaggle/kaggle.json`).

| Artifact | Kaggle dataset slug | Status |
|---|---|---|
| Fine-tune dataset | `udirobert/body-debt-finetune-dataset` | TODO |
| Fine-tuned weights (4 models) | `udirobert/body-debt-qwen3-finetuned` | TODO |

New script: `hf-space/publish_kaggle.py` — uses `kaggle datasets create` /
`kaggle datasets version` to upload. Each model goes as a Kaggle "dataset"
(Kaggle doesn't have a model hub; weights are uploaded as datasets).

### 7.3 Model cards

Each HF model repo needs a README.md (model card) with:
- Task description
- Base model + fine-tuning method
- Dataset description + link
- Eval results (baseline vs fine-tuned, % improvement)
- Intended use + limitations
- License (Apache 2.0 to match Qwen3)

---

## 8. Evaluation harness

### New script: `hf-space/eval_finetuned.py`

Runs baseline (zero-shot Qwen3-1.7B) and fine-tuned models on the 200-profile
test set for each agent, computes the metrics from section 3, and prints a
comparison table:

```
Agent       | Baseline | Fine-tuned | Improvement
------------|----------|------------|------------
Triage      |   45.2%  |    89.0%   |   +43.8pp
Coach       |   32.0%  |    81.5%   |   +49.5pp
Schedule    |   18.5%  |    72.0%   |   +53.5pp
Reflection  |   55.0%  |    88.0%   |   +33.0pp
```

The harness loads models via `transformers` (HF format) or `llama.cpp` (GGUF)
and runs inference on the test JSONL. Metrics are computed by parsing the
output against the deterministic ground truth.

---

## 9. Demo + social post (bonus)

### Demo
The existing HF Space (`Papajams/body-debt`) already demos the SmolLM2 coach.
For the challenge, update the Space to:
- Load one of the fine-tuned Qwen3 models (or keep SmolLM2 as a second demo)
- Show the before/after comparison (base vs fine-tuned output)
- Display the eval metrics

Alternatively, the deployed app at `bodydebt.thisyearnofear.com` can A/B
the base QVAC model vs the fine-tuned model in the QVAC pipeline.

### Social post
Post on LinkedIn and X:
- Tag `@adaption_ai` (X) and `adaption-labs` (LinkedIn)
- Show the improvement table
- Link to the HF + Kaggle releases
- Show the live demo

---

## 10. Timeline

| Week | Task |
|---|---|
| Week 1 | Connect Together AI. Write `generate_finetune_dataset.py` + `generate_schedule()` + `apply_voice()`. Generate 3,200 profiles. |
| Week 2 | Upload datasets to AutoScientist. Run co-optimization loop for all 4 agents. Write eval harness. |
| Week 3 | Export fine-tuned weights. Run eval. Write `publish_finetuned.py` + `publish_kaggle.py`. Release to HF + Kaggle. |
| Week 4 | Update HF Space demo. Write model cards. Social post. Submit before July 5. |

---

## 11. Open questions (resolve in Adaption Discord)

1. **Held-out test set**: Does Adaption have a fixed Healthcare test set, or
   do we define our own task + test set? The rules say "our held out in house
   test sets for each category" — need to confirm whether our structured-output
   task qualifies or whether we need to also beat them on a generic healthcare
   benchmark.
2. **Model format**: Does AutoScientist export HF format, or Together AI
   format? Need to confirm for the GGUF conversion step.
3. **Qwen3 availability**: Is Qwen3-1.7B available on AutoScientist, or do we
   need to use Qwen2.5-1.5B? Check the model list in the platform.
4. **Kaggle model vs dataset**: Kaggle doesn't have a model hub — confirm that
   uploading weights as a Kaggle "dataset" satisfies the release requirement.

---

## 12. File inventory

| File | Purpose | Status |
|---|---|---|
| `hf-space/deterministic_labels.py` | `generate_schedule()` + `apply_voice()` + `generate_triage()` + `generate_coach()` | Done (v2) |
| `hf-space/generate_finetune_dataset.py` | Scales profile generation to 3,200, produces 4 train + 4 test JSONL | Done |
| `hf-space/datasets/*.jsonl` | 8 JSONL files, 12,800 total examples | Done (v2) |
| `hf-space/datasets/augmented_combined.csv` | Adaption-augmented combined dataset (5,462 rows, v1 — triage-only) | Deprecated |
| `hf-space/datasets/augmented_train.jsonl` | Flat JSONL of augmented data for HF publishing | Deprecated |
| `hf-space/eval_finetuned.py` | Baseline vs fine-tuned eval harness with structured metrics | Done |
| `hf-space/eval_together.py` | Eval via Together AI API (for AutoScientist-deployed model) | Done |
| `hf-space/publish_finetune_dataset.py` | Upload original dataset to HF Dataset Hub | Done |
| `hf-space/publish_augmented_dataset.py` | Upload augmented dataset to HF Dataset Hub | Done |
| `hf-space/publish_model.py` | Upload fine-tuned model weights to HF Model Hub | Done |
| `hf-space/publish_kaggle.py` | Upload dataset + weights to Kaggle (original + augmented + weights) | Done |
| `hf-space/run_adaption.py` | Adaptive Data SDK script (v2: prompt_rephrase disabled, --combined flag) | Done (v2) |
| `hf-space/demo_autoscientist.py` | Before/after comparison demo (Gradio) | Done |
| `hf-space/social_posts.md` | LinkedIn + X post templates (Phase 1 + Phase 2) | Done |
| AutoScientist training (v1) | Llama-3.2-3B LoRA, 4x H100 | Completed, 49% win rate |
| AutoScientist training (v2) | Mistral 7B Instruct, 28k rows (domain + general purpose) | Completed, 66% win rate |

---

## 13. Post-mortem: v1 training run (49% win rate)

### What happened

The first AutoScientist training run completed successfully (100% training
success) but achieved only a **49% win rate** against the baseline on
Adaption's held-out healthcare test set. Fine-tuning actually *hurt* the
model's general healthcare performance.

### Root causes

1. **Dataset was 99% triage, 0% coach, 0% schedule.** The augmented
   dataset uploaded to AutoScientist (`body_debt_unified_coach`) contained
   5,462 rows, but analysis showed 5,426 triage examples and only 36
   reflection examples. Zero coach and zero schedule examples made it
   through. The model overfit to one narrow output format
   (PRIORITY/SECONDARY/AVOID) and forgot how to do general healthcare
   reasoning.

2. **Labels didn't match system prompt format.** The system prompt said
   `PRIORITY: <system> <score> — <health reason in 8 words>` but the
   label was just `PRIORITY: Cardiovascular 22/100` — missing the health
   reason entirely. Coach lines were 4-8 words when the prompt asked for
   12-18. AVOID was missing biological reasons. The model learned to
   produce terse, incomplete outputs — worse than what the zero-shot
   baseline generates by just reading the prompt.

3. **Prompt rephrasing changed system prompts.** Adaption's
   `prompt_rephrase` recipe rewrote system prompts into different formats
   ("# Role: Physiological Recovery Scheduler"). At inference time the
   model sees the original QVAC system prompts, not the rephrased ones —
   a train/inference mismatch that confused the model.

### Fixes applied (v2)

1. **Fixed `generate_triage`**: Added `HEALTH_REASONS` dict with 8-word
   health reasons per system. Now emits `PRIORITY: Liver 82/100 —
   Metabolic clearance needs reduced toxin load`. Always emits exactly
   3 lines (was skipping SECONDARY when score ≤ 10).

2. **Rewrote `generate_coach`**: Replaced the `health_coach._fallback_advice`
   import with a dedicated `COACH_THIS_MORNING` / `COACH_TODAY` /
   `COACH_AVOID` dict system. 12-18 words per line, severity-tiered
   (high/moderate/low), system-specific biological reasons in every line.

3. **Enriched `generate_schedule`**: Schedule actions now include
   biological reasons (e.g., "no caffeine to support hepatic clearance"
   instead of just "no caffeine").

4. **Disabled `prompt_rephrase`** in `run_adaption.py`: Only
   `reasoning_traces` + `deduplication` are enabled. System prompts
   are preserved verbatim.

5. **Added `--combined` flag** to `run_adaption.py`: Merges all 4 agents
   into one dataset file before upload, ensuring balanced representation.

### Verification

All 12,800 examples pass format validation:
- Triage: 3 lines, PRIORITY/SECONDARY have `— <reason>`, AVOID present
- Coach: 4 lines, 12-18 words per line, hydration in RIGHT NOW
- Schedule: 4 lines, pipe format, 4 time blocks
- Reflection: 4 lines, voice markers present

All 4 agents score 100% when the eval harness parses and scores their
own ground truth.

---

## 14. v2 results (66% win rate)

### Training

- **Model**: Mistral 7B Instruct (AutoScientist-selected)
- **Training data**: 28,036 rows
  - 5,618 domain (Body Debt 4-agent pipeline with reasoning traces)
  - 22,418 general purpose (medical/healthcare Q&A to preserve general reasoning)
- **Augmentation**: domain (14,440 points, 145 credits) + general purpose (8,000 points, 80 credits)
- **Total credits**: 225

### Results

| Metric | v1 | v2 |
|--------|----|----|
| Win rate | 49% | **66%** |
| Model | Llama-3.2-3B | Mistral 7B Instruct |
| Training rows | 5,462 | 28,036 |
| Agent balance | 99% triage | 33/33/31/3 |
| prompt_rephrase | enabled | disabled |
| Labels match prompts | no | yes |

### What worked

1. **All 4 agents represented** — the model learned all four output
   formats instead of overfitting to one.
2. **Labels match system prompts** — the model learned the correct
   format (health reasons, word counts, biological mechanisms).
3. **prompt_rephrase disabled** — no train/inference mismatch.
4. **General purpose data** — 22k general medical Q&A rows prevented
   the model from forgetting general healthcare reasoning.
5. **Reasoning traces** — taught the model *how to think* about
   physiological recovery, not just pattern-match.

### Published artifacts

- **Original dataset**: https://huggingface.co/datasets/Papajams/body-debt-finetune-dataset
- **Augmented dataset**: https://huggingface.co/datasets/Papajams/body-debt-augmented-v2
- **Model weights (HF)**: https://huggingface.co/Papajams/body-debt-mistral-7b-autoscientist
- **Model weights (Kaggle)**: https://www.kaggle.com/datasets/udingethe/body-debt-mistral-7b-autoscientist
- **Dataset (Kaggle)**: https://www.kaggle.com/datasets/udingethe/body-debt-finetune-dataset
- **Augmented (Kaggle)**: https://www.kaggle.com/datasets/udingethe/body-debt-autoscientist-v2
- **Live app**: https://bodydebt.thisyearnofear.com
- **Source code**: https://github.com/udirobert/bodydebt
