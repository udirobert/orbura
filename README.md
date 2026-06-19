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
models:
  - HuggingFaceTB/SmolLM2-360M-Instruct
---

# 🫀 Body Debt

**Quantify your physiological debt. Get AI-backed recovery prescriptions.**

Body Debt calculates the precise recovery cost of last night's choices — alcohol, training, poor sleep, stress, illness — across five biological systems, then generates personalized recovery advice using a **1-billion parameter local LLM**.

## What it does

1. **Log stressors** — tap what happened (drank, trained, slept badly, stressed, ill, or took care)
2. **Face scan** (optional) — webcam capture analyzed by MediaPipe FaceMesh to detect fatigue markers (eye aspect ratio, brow tension, eye symmetry)
3. **Deterministic scoring** — five biological systems (Cardiovascular, Brain, Liver, Muscular/CNS, Gut) scored with physiological weights and circadian penalties
4. **Local AI recovery coach** — Llama-3.2-1B generates a personalized prescription (Right Now / This Morning / Today / Avoid)

## The model

**SmolLM2-360M-Instruct** (360M parameters) — runs entirely on CPU via HuggingFace Transformers. No external API calls, no cloud inference. Your health data stays on-device.

The face scan stress classifier is a custom 7→16→8→1 MLP (~2KB ONNX) that converts facial geometry features into a fatigue score.

## Tech

- **LLM**: SmolLM2-360M-Instruct (360M params) via HuggingFace Transformers
- **Face analysis**: MediaPipe FaceMesh → 7 stress features → ONNX MLP
- **Scoring**: Deterministic 5-system engine with physiological weights, drink-type modifiers, training CNS load, circadian alignment penalties
- **UI**: Gradio 6 with custom dark theme

## Privacy

- Face scan runs via MediaPipe on-device — no images are transmitted
- LLM inference is local — no API calls to external services
- No data persistence — nothing is stored between sessions

## Demo

[Demo video link]

## Social

[Social media post link]

## Try it locally

```bash
pip install -r requirements.txt
python generate_model.py  # creates the ONNX stress model
python app.py
```

## OpenAI Codex Track

This Space was built with OpenAI Codex as the coding agent. The public source repository, including Codex-attributed commits, is here:

**Repository:** [github.com/udirobert/bodydebt](https://github.com/udirobert/bodydebt)

## Full product

The complete Body Debt application (Next.js, ZK proofs on SKALE, real-time animated dashboard) is at: [github.com/udirobert/bodydebt](https://github.com/udirobert/bodydebt)

## QVAC Edge AI — Multi-Agent Pipeline

The Next.js app uses **QVAC SDK** for all AI inference. Four agents run sequentially on-device via Llama-3.2-1B (Q4 quantized with TurboQuant KV-cache):

1. **Triage Agent** — analyzes the 5-system debt breakdown, identifies the priority system, secondary concern, and what to avoid
2. **Recovery Coach Agent** — generates a 4-part prescription (Right Now / This Morning / Today / Avoid) using the triage output as context
3. **Schedule Agent** — produces a time-blocked recovery schedule for the next 12 hours
4. **Reflection Agent** — rewrites the Coach's prescription in the user's chosen voice (honest/gentle/scientific/sarcastic), keeping every specific action, quantity, and biological reason intact

Each agent streams tokens live to the UI. The agent trace panel shows each agent's role, duration, and QVAC source badge. A real **Edge vs Cloud** performance comparison bars the on-device pipeline against a parallel cloud verdict call, with the "Nx faster" multiplier visible. Cloud AI (Eazo/deepseek) is fallback only when QVAC is unavailable, with 5s and 8s timeouts so offline mode fails fast to deterministic schedules, prescriptions, and verdicts.

### Architecture

```
Camera frame
  -> MediaPipe FaceMesh (browser, 468 landmarks)
  -> 7-dim feature vector
  -> EZKL ZK proof (Web Worker)
  -> local verify + SKALE on-chain commit
  -> Deterministic 5-system score (instant, <5ms)
  -> Counterfactual engine (single-variable re-run, highest-leverage change)
  -> QVAC 4-agent pipeline (Llama-3.2-1B, on-device)
  -> Deterministic schedule + prescription + verdict fallbacks at every layer
  -> Streaming SSE to dashboard
```

### Offline mode

After the first inference, the QVAC model is cached locally. Subsequent runs work fully offline:

- QVAC pipeline: cached model loads instantly, no network
- Cloud verdict (parallel): 5s timeout → deterministic fallback
- Cloud prescription (fallback): 8s timeout → deterministic fallback
- Schedule: always deterministic, never needs the cloud
- Response header `X-Offline-Capable: true` signals readiness

### Reproduce

```bash
bun install
bun dev

# QVAC worker runs automatically via child_process.fork()
# Model downloads on first inference, caches for subsequent runs
```

Requirements:
- Node.js 20+
- QVAC SDK (`@qvac/sdk` ^0.12.2)
- OpenSSL 3 (for native lib resolution)

### Evidence page for judges

A single-page summary of architecture, agent pipeline, measured performance, and graceful degradation lives at [`/evidence`](https://bodydebt.app/evidence). It links back to this repo and is meant to be the first thing a hackathon judge screenshots.

---

*Built for the [QVAC Hackathon I — Unleash Edge AI](https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/). Four AI agents, one local model, zero cloud calls for the inference path.*