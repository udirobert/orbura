---
title: Body Debt
emoji: 🫀
colorFrom: red
colorTo: yellow
sdk: gradio
sdk_version: 6.18.0
app_file: app.py
pinned: true
license: mit
tags:
  - build-small
  - backyard-ai
  - tiny-titan
  - best-agent
  - off-brand
  - openai-codex
  - well-tuned
  - field-notes
  - off-the-grid
datasets:
  - Papajams/body-debt-traces
models:
  - HuggingFaceTB/SmolLM2-360M-Instruct
  - Papajams/body-debt-stress-mlp
---

# 🫀 Body Debt

**Quantify your physiological debt. Get AI-backed recovery prescriptions.**

Body Debt calculates the precise recovery cost of last night's choices — alcohol, training, poor sleep, stress, illness — across five biological systems, then generates personalized recovery advice using a **360-million parameter local LLM** that streams on-device.

## Demo

🎬 **[Watch the 75-second demo](https://huggingface.co/spaces/build-small-hackathon/body-debt/resolve/main/demo.mp4)** — the Space itself, captured shot-by-shot, including the streaming LLM token reveal.

📹 **[Or watch on X](https://x.com/papajimjams/status/2066658009124687953)** — same video, posted for the social-submission requirement.

📓 **[Read the field notes on Medium](https://medium.com/@ungethe/building-small-9aea8bf5236e)** — the four lessons I learned shipping a 360M health coach for myself.

📊 **[Inspect the agent traces](https://huggingface.co/datasets/Papajams/body-debt-traces)** — twelve real analyses, JSONL, showing the full reasoning chain.

## Why I built this

I built Body Debt for myself. I kept training on bad sleep, drinking on Wednesdays, and wondering on Saturday why I felt like I was running through mud. Wearables told me *what* my body was doing; nothing told me *why today* felt like a high-debt day and what the cheapest recovery move was.

So this is the app I wanted: log last night, get a single number, see which of the five systems is the actual problem, and read a four-line prescription that tells me what to do in the next 60 seconds. The face scan is a bonus — it catches the days when the *number* says I'm fine but my face says I look like I slept on a plane.

I've been running the local version for two weeks. The agent trace (top-right of the results panel) is the part I trust most: it's a transparent record of *why* the score is what it is. I can disagree with the prescription, but I can't disagree with the chain of reasoning that produced it.

The whole thing runs on a $300 Chromebook with no internet. That was the constraint that made it worth building — privacy on health data isn't a feature here, it's the only design space that exists.

## What it does

1. **Log stressors** — tap what happened (drank, trained, slept badly, stressed, ill, or took care)
2. **Face scan** (optional) — webcam capture analyzed by MediaPipe FaceMesh to detect fatigue markers (eye aspect ratio, brow tension, eye symmetry)
3. **Deterministic scoring** — five biological systems (Cardiovascular, Brain, Liver, Muscular/CNS, Gut) scored with physiological weights and circadian penalties
4. **Visible agent trace** — every step of the reasoning chain streams into the UI: parse stressors → compute score → face scan → triage plan → counterfactual → LLM coach
5. **Local AI recovery coach** — SmolLM2-360M-Instruct streams a personalized prescription token-by-token, right now

## The models

**SmolLM2-360M-Instruct** (360M parameters) — runs entirely on CPU via HuggingFace Transformers. No external API calls, no cloud inference. Your health data stays on-device.

A 360M parameter model is the *right* size for this product, not a compromise:

- **Privacy.** Health data never leaves the device. A 70B model doesn't help when the user is undressed, hungover, or at 2am with a chest flutter — they need on-device.
- **Latency.** 360M streams the first token in under a second on a modern laptop. A 7B cloud call is 2-8 seconds of network + queue.
- **Footprint.** 360M fits in 250MB of RAM. The whole app, model and all, runs on a $300 Chromebook.
- **Output shape.** The advice is short, structured, and rule-bound (Right Now / This Morning / Today / Avoid). Bigger models wouldn't make it more correct.

The face scan stress classifier is a custom 7→16→8→1 MLP (**553 parameters, ~1.5KB ONNX**) that converts facial geometry features into a fatigue score. The model is **fine-tuned on 2,000 physiologically-motivated synthetic samples** and published as [`Papajams/body-debt-stress-mlp`](https://huggingface.co/Papajams/body-debt-stress-mlp) with a full model card. Validation MAE: 0.060 (probability units). A linear regression on the same 7 inputs gets 0.061, so the network is earning its parameters.

## Tech

- **LLM**: SmolLM2-360M-Instruct (360M params) via HuggingFace Transformers, streamed via `TextIteratorStreamer`
- **Face analysis**: MediaPipe FaceMesh → 7 stress features → ONNX MLP (553 params, fine-tuned)
- **Scoring**: Deterministic 5-system engine with physiological weights, drink-type modifiers, training CNS load, circadian alignment penalties
- **UI**: Custom dark Gradio theme — `DM Serif Display` for the debt number, system-specific accent tokens, breathing-orb animation, monogram glyphs, agent trace panel

## Privacy

- Face scan runs via MediaPipe on-device — no images are transmitted
- LLM inference is local — no API calls to external services
- No data persistence — nothing is stored between sessions

## Try it locally

```bash
pip install -r requirements.txt
python train_stress_model.py  # trains the face MLP on 2,000 synthetic samples and exports ONNX (~2s on CPU)
python app.py
```

The training script has no PyTorch or scikit-learn dependency. It trains the 553-parameter MLP in pure NumPy using Adam, then re-exports the ONNX. Two seconds on a modern laptop.

## Repo layout

- [app.py](app.py) — the active Hugging Face Space entry point.
- [train_stress_model.py](train_stress_model.py) — the lightweight ONNX training script.
- [archive/](archive/) — historical experiment scripts and older publishing helpers.

## OpenAI Codex Track

This Space was built end-to-end with **OpenAI Codex** as the coding agent. The full source repository, including Codex-attributed commits, is here:

**Repository:** [github.com/udirobert/bodydebt](https://github.com/udirobert/bodydebt)

Codex handled the bulk of the architecture: porting the Next.js TypeScript scoring engine to Python, porting the dark design system from CSS variables into a custom Gradio theme, and wiring the streaming agent trace. The repo's `git log` shows consecutive Codex-attributed commits for each subsystem.

## Full product

The complete Body Debt application — Next.js, animated debt orb, ZK proofs on SKALE, full state machine — is at: [github.com/udirobert/bodydebt](https://github.com/udirobert/bodydebt)

## Bonus quest coverage

- **Off the Grid** — on-device only, no API calls
- **Tiny Titan** — SmolLM2-360M is well under the 4B threshold
- **Off-Brand** — custom dark Gradio theme, agent trace, system accents, breathing-orb
- **Best Agent** — visible multi-step trace: parse → score → face → triage plan → counterfactual → coach
- **Well-Tuned** — fine-tuned 553-param ONNX MLP at `Papajams/body-debt-stress-mlp`
- **Field Notes** — field-notes writeup published on [Medium](https://medium.com/@ungethe/building-small-9aea8bf5236e)
- **Sharing is Caring** — agent trace dataset at `Papajams/body-debt-traces`
- **OpenAI Codex** — the Space was Codex-built, commit trail in the repo

---

*Built for the [Build Small Hackathon](https://huggingface.co/build-small-hackathon). 360M parameters, on a laptop, no cloud.*

