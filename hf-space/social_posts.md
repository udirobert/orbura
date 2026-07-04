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

## PHASE 2: Results post (post when training completes + eval runs)

### X/Twitter Post 2 (results)

Results are in! Our AutoScientist fine-tuned Llama-3.2-3B beats the baseline on structured health recovery coaching:

[INSERT EVAL TABLE]

Baseline: [X]% → Fine-tuned: [Y]%
Improvement: [+Z]pp

Dataset + weights: [HF link] [Kaggle link]
Live demo: [HF Space link]

#AutoScientistChallenge #HealthcareAI

@adaption_ai

---

### LinkedIn Post 2 (results)

Results from our AutoScientist Challenge submission are in 🧬

Our fine-tuned Llama-3.2-3B shows measurable improvement over the baseline on structured health recovery prescription generation:

[INSERT EVAL TABLE]

What we learned:
→ Small models (3B) can produce reliable structured medical output when trained on high-quality, deterministic data
→ Adaption's data augmentation (reasoning traces + prompt rephrasing) made a bigger difference than we expected — quality went from C to A
→ AutoScientist's co-optimized recipe outperformed our manually configured hyperparameters
→ The entire pipeline — scoring, dataset generation, augmentation, training — took under a day

Dataset + weights released (Apache 2.0):
🔗 Hugging Face: [link]
🔗 Kaggle: [link]
🔗 Live demo: [link]

#AutoScientistChallenge #HealthcareAI #SmallModels #FineTuning #OpenSource

@adaption-labs

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
