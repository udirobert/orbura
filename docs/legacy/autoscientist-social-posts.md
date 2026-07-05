# AutoScientist Challenge — Social Media Posts

## PHASE 1: "Building in public" (post NOW)

### X/Twitter Post 1

Building a fine-tuned health recovery coach for the @adaption_ai AutoScientist Challenge 🧬

The idea: your body has "debt" — not financial, physiological. Poor sleep, alcohol, training, stress each add debt to 5 body systems.

We built a deterministic scoring engine that calculates this, then used Adaption's Adaptive Data to augment 5,400+ training examples.

Quality jumped from C (7.0) to A (9.23) — a 31.9% improvement.

Now AutoScientist is co-optimizing the training recipe on Llama-3.2-3B with LoRA. Running on 4x H100s. Free compute from Adaption 🙏

Weights + dataset going open source on HF + Kaggle.

#AutoScientistChallenge #HealthcareAI #SmallModels

@adaption_ai

---

### LinkedIn Post 1

Building a fine-tuned AI health recovery coach with Adaption Labs' AutoScientist platform 🧬

Here's the concept: your body accumulates "debt" — not financial, but physiological. Poor sleep, alcohol, intense training, stress, illness — each adds debt to five body systems (cardiovascular, brain, liver, muscular, gut). We built a deterministic scoring engine that calculates this debt and produces structured recovery prescriptions.

For the AutoScientist Challenge (Healthcare category), we're training a small model to replace prompt-engineering with fine-tuning. Here's what we've done so far:

1️⃣ Built a deterministic 5-system scoring engine as ground truth — no human annotation needed, unlimited labeled data
2️⃣ Generated 5,462 instruction-tuning examples across a 4-agent pipeline (Triage → Coach → Schedule → Reflection)
3️⃣ Uploaded to Adaption's Adaptive Data platform for augmentation — prompt rephrasing, reasoning traces, deduplication
4️⃣ Quality improved from 7.0 (grade C) to 9.23 (grade A) — a 31.9% improvement
5️⃣ AutoScientist co-optimized the training recipe: LoRA r=32, alpha=64, 3 epochs on Llama-3.2-3B-Instruct
6️⃣ Training is running now on 4x NVIDIA H100 80GB (free compute courtesy of Adaption)

The goal: a 3B parameter model that produces physiologically-correct structured recovery plans — small enough to run on-device, smart enough to replace a much larger model for this narrow task.

Dataset and weights will be released open source (Apache 2.0) on Hugging Face and Kaggle.

Sharing our experience with the Adaption platform: the Adaptive Data augmentation was genuinely impressive. It took our terse deterministic labels and produced richer completions with proper reasoning traces — the kind of data that actually teaches a small model to think, not just pattern-match. The AutoScientist recipe generation removed all the hyperparameter guesswork.

#AutoScientistChallenge #HealthcareAI #SmallModels #FineTuning #AdaptionLabs #AI

@adaption-labs

---

## PHASE 1.5: "Honest update" (post after v1 results, before v2 training)

### X/Twitter Thread 2

Update on the @adaption_ai #AutoScientist Challenge 🧬

Our first training run completed — 100% training success, but only 49% win rate against the baseline.

Fine-tuning actually *hurt* the model. Here's what we got wrong, what we got right, and what we're doing now 🧵👇

---

What went right:

✅ The deterministic Body Debt engine works — 5-system physiological scoring from sleep, alcohol, training, stress
✅ 12,800 structured examples generated with zero human annotation
✅ Adaption's Adaptive Data improved quality 7.0 → 9.23 (+31.9%)
✅ Training pipeline ran clean on 4× H100s

The concept is sound. The execution had three bugs.

---

Bug 1: The augmented dataset was 99% triage, 0% coach, 0% schedule.

Somehow only the triage agent's examples made it through augmentation. The model overfit to one output format (PRIORITY/SECONDARY/AVOID) and forgot how to do general healthcare reasoning.

---

Bug 2: Our labels didn't match our own system prompts.

The prompt said "PRIORITY: <system> <score> — <health reason in 8 words>"
The label was just "PRIORITY: Liver 82/100"

No health reason. Coach lines were 4-8 words when we asked for 12-18. The model learned to produce *worse* output than the zero-shot baseline.

---

Bug 3: Adaption's prompt_rephrase recipe rewrote our system prompts into different formats.

At inference time the model sees the original prompts — not the rephrased ones. Train/inference mismatch. The model was confused before it even started reasoning.

---

What we're doing now (v2):

🔧 Fixed all labels to match system prompt format — health reasons, biological mechanisms, 12-18 word lines
🔧 Merged all 4 agents into one balanced dataset (3,000 each)
🔧 Disabled prompt_rephrase — keeping reasoning traces + deduplication only
🔧 Enriched schedule actions with biological reasons

---

v2 augmentation is running now — 12,000 examples, all 4 agents, prompt_rephrase off.

12,800 examples pass format validation. All 4 agents score 100% when the eval harness parses their ground truth.

Retraining next. Open source throughout:
https://github.com/udirobert/bodydebt

@adaption_ai #AutoScientistChallenge

---

## PHASE 2: Results post (post when training completes + eval runs)

### X/Twitter Thread 3 (results)

Results from v2 training: 66% win rate 🧬

v1: 49% (fine-tuning hurt the model)
v2: 66% (beats baseline 2 out of 3 times)

+17 point swing from fixing three bugs. Here's what changed 🧵👇

@adaption_ai #AutoScientistChallenge

---

v1 had three fatal bugs:

1. Dataset was 99% triage, 0% coach/schedule — model overfit to one format
2. Labels didn't match system prompts — missing health reasons, wrong word counts
3. Prompt rephrasing rewrote system prompts — train/inference mismatch

---

v2 fixes:
- All 4 agents balanced (33/33/31/3)
- Labels match system prompt format exactly (8-word health reasons, 12-18 word coach lines)
- prompt_rephrase disabled
- 28,036 rows (domain + general purpose augmentation)

12,800 examples pass format validation. 100% eval score on ground truth.

---

The biggest lesson: fine-tuning amplifies your data quality. Bad data doesn't just fail to help — it actively degrades the model below baseline.

Get the labels right, balance the tasks, preserve the prompts. Then augmentation does the rest.

---

Model: Mistral 7B Instruct, fine-tuned via @adaption_ai AutoScientist
Dataset + weights: open source (Apache 2.0)
Live app: https://bodydebt.thisyearnofear.com

https://github.com/udirobert/bodydebt

#AutoScientistChallenge #HealthcareAI #SmallModels

---

## Submission Checklist

- [ ] Phase 1 social posts (X + LinkedIn)
- [ ] Dataset released to Hugging Face
- [ ] Dataset released to Kaggle
- [ ] Weights released to Hugging Face
- [ ] Weights released to Kaggle
- [ ] Measurable improvement over baseline (eval harness)
- [ ] Demo built and released
- [ ] Phase 2 social posts (X + LinkedIn) with results
- [ ] Submission form filled out
