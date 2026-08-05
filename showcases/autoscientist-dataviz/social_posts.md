# Social post templates — AutoScientist Challenge Part 2 (Data Visualization)

## LinkedIn post

We just submitted our entry for the AutoScientist Challenge Part 2 (Data Visualization), run by @adaption_ai / adaption-labs.

After Part 1 (Healthcare, 66% win rate fine-tuning a recovery coach), we took the same approach to data visualization: build a deterministic dataset generator, augment it with Adaption Adaptive Data, and co-optimize a fine-tuned model with AutoScientist.

What we built:
- 10,000 training + 2,000 validation examples across 7 task types: chart QA, code generation, code-to-description, style transfer, bug repair, chart-type selection, and CSV-to-code
- 4 chart types (line, bar, scatter, pie) with 18 chart-QA question types (max, min, sum, avg, median, range, pct_total, ratio, rank, trend, counterfactual, percentage_change, and more)
- A 100-row multimodal pilot with rendered chart images for visual reasoning
- A deterministic eval harness that scores structural code equivalence, not just text matching

The key lesson from Part 1: disable prompt rephrasing. It rewrites system prompts during augmentation, which causes a train/inference mismatch. Reasoning traces + deduplication only.

Dataset and model weights are open-sourced on Hugging Face and Kaggle (Apache 2.0).

🔗 Hugging Face: https://huggingface.co/Papajams
🔗 Kaggle: https://www.kaggle.com/udirobert
🔗 Source: https://github.com/udirobert/orbura

#AutoScientist #AdaptionLabs #DataVisualization #FineTuning #OpenSource #LLM

---

## X / Twitter post (short)

Submitted our AutoScientist Challenge Part 2 entry: a fine-tuned model for data visualization tasks (chart QA, matplotlib code gen, bug repair, style transfer).

10k deterministic training examples, 7 task types, 4 chart types. Key lesson from Part 1: disable prompt rephrase, keep reasoning traces.

Open dataset + weights on HF + Kaggle. @adaption_ai

🔗 https://huggingface.co/Papajams

---

## X / Twitter post (thread)

1/ Submitted our Part 2 entry for the @adaption_ai AutoScientist Challenge: a fine-tuned model for data visualization.

7 task types: chart QA, code generation, CSV-to-code, code-to-description, style transfer, bug repair, chart-type selection.

4 chart types: line, bar, scatter, pie. 18 QA question types.

2/ The dataset is fully deterministic — no human annotation, no LLM labels. Every ground-truth answer is computed from the input data, so evaluation is exact and reproducible.

3/ Key lesson from Part 1 (Healthcare, 66% win rate): disable prompt rephrasing in Adaption augmentation. It rewrites system prompts and causes train/inference mismatch. Use reasoning traces + deduplication only.

4/ We also built a 100-row multimodal pilot with rendered chart images — the model sees a chart and answers questions about it. This is where the text-only dataset can't go, and where we see the most room for improvement.

5/ The eval harness scores structural code equivalence (AST-level), not just text matching. Chart QA uses exact + numeric tolerance. Style transfer and bug repair use normalized code comparison.

6/ Dataset + weights open-sourced (Apache 2.0):
🔗 HF: https://huggingface.co/Papajams
🔗 Kaggle: https://www.kaggle.com/udirobert
🔗 Code: https://github.com/udirobert/orbura

@adaption_ai #AutoScientist #DataViz #LLM
