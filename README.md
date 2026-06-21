---
title: Body Debt
emoji: 🫀
colorFrom: red
colorTo: yellow
license: mit
tags:
  - qvac
  - edge-ai
  - on-device-llm
  - multi-agent
  - health
models:
  - unsloth/Llama-3.2-1B-Instruct-GGUF
---

# 🫀 Body Debt — QVAC Edge AI

**Quantify your physiological debt. Get AI-backed recovery prescriptions from 4 on-device agents.**

Body Debt calculates the precise recovery cost of last night's choices — alcohol, training, poor sleep, stress, illness — across five biological systems, then generates personalized recovery advice using **Llama-3.2-1B-Instruct running locally via the QVAC SDK**.

## What it does

1. **Log stressors** — tap what happened (drank, trained, slept badly, stressed, ill, or took care)
2. **Face scan** (optional) — webcam capture analyzed by MediaPipe FaceMesh to detect fatigue markers (eye aspect ratio, brow tension, eye symmetry)
3. **Deterministic scoring** — five biological systems (Cardiovascular, Brain, Liver, Muscular/CNS, Gut) scored with physiological weights and circadian penalties
4. **QVAC 4-agent pipeline** — Llama-3.2-1B runs 4 agents on-device: Triage → Coach → Schedule → Reflection

## The model

**Llama-3.2-1B-Instruct** (Q4_0 quantized, 738MB) — runs entirely on-device via the **QVAC SDK** (`@qvac/sdk` v0.12.2) using the Bare runtime. No external API calls, no cloud inference for the primary path. Your health data stays on-device.

The face scan stress classifier is a custom 7→16→8→1 MLP (~2KB ONNX) that converts facial geometry features into a fatigue score.

## Tech

- **LLM**: Llama-3.2-1B-Instruct (Q4) via QVAC SDK (`@qvac/sdk`), Bare runtime, llamacpp-completion plugin
- **Face analysis**: MediaPipe FaceMesh → 7 stress features → ONNX MLP
- **Scoring**: Deterministic 5-system engine with physiological weights, drink-type modifiers, training CNS load, circadian alignment penalties
- **ZK privacy**: EZKL Halo2 proofs on SKALE Europa testnet
- **UI**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, framer-motion

## Privacy

- Face scan runs via MediaPipe on-device — no images are transmitted
- LLM inference is local via QVAC — no API calls to external services
- ZK proofs verify face scan results without revealing raw data

## Demo

[Demo video link]

## Social

[Social media post link]

## Quick start

```bash
bun install
bun dev
```

The QVAC worker spawns automatically via `bare scripts/qvac-worker.mjs`. The model downloads on first inference (~738MB) and caches at `~/.qvac/models/` for subsequent runs.

Requirements:
- Node.js 20+ / Bun
- `bare` runtime (install: `npm install -g bare`)
- QVAC SDK (`@qvac/sdk` ^0.12.2) — included in dependencies
- OpenSSL 3 (for native lib resolution)

## Auditable log

An auditable inference log capturing model loads/unloads and per-agent performance is at `qvac-audit/qvac-audit-log.jsonl`. Generate it with:

```bash
node scripts/generate-qvac-audit-log.mjs
```

Output includes per-agent: prompt, tokens generated, TTFT, tokens/sec, duration, and status.

## HuggingFace Space

A lighter Gradio demo using SmolLM2-360M via HuggingFace Transformers is in `hf-space/`. The main app uses QVAC SDK as required by the hackathon.

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

A single-page summary of architecture, agent pipeline, measured performance, and graceful degradation lives at [bodydebt.thisyearnofear.com/evidence](https://bodydebt.thisyearnofear.com/evidence). It links back to this repo and is meant to be the first thing a hackathon judge screenshots.

### Live deployment

- **Live URL:** https://bodydebt.thisyearnofear.com
- **Evidence page:** https://bodydebt.thisyearnofear.com/evidence
- **Hosted on:** Vultr (nuncio-vultr, Intel Broadwell 4-core, 7.7GB RAM, 150GB disk, 85GB free)
- **Process manager:** pm2 (`bodydebt` process on port 3050) → host nginx (`127.0.0.1:8765`) → Coolify/Traefik
- **HTTPS:** terminated by the box's Coolify/Traefik proxy. A Traefik file-provider route (`/data/coolify/proxy/dynamic/bodydebt.yaml`) fronts host nginx and auto-issues/renews a Let's Encrypt cert via the HTTP-01 challenge (Traefik owns ports 80/443). No Cloudflare, no DNS API token, no nameserver change. The internal `:8765` nginx port is now just Traefik's upstream — don't hit it directly (it's plain HTTP, so the camera's secure-context check fails there).
- **QVAC model:** Llama-3.2-1B-Instruct Q4_0 (738MB), cached at `~/.qvac/models/` after first inference
- **Measured pipeline on nuncio-vultr:** 4 agents complete in ~95s end-to-end (Intel Broadwell is slower than the AMD EPYC we tested on snel-bot, which was 22s).

### Lean deploy

The server has plenty of space (150 GB disk, 85 GB free) but the local-build approach is still preferred so we don't pay 7 GB of native binaries we don't need. Use `scripts/deploy.sh` instead of `git clone && bun install && bun build` on the server.

```bash
# From your local Mac — builds, trims, and rsyncs only runtime artifacts
./scripts/deploy.sh

# Override target platform (default: linux-x64)
TRIM_PLATFORM=linux-arm64 ./scripts/deploy.sh

# Override server (default: snel-bot ssh alias)
SERVER=user@host ./scripts/deploy.sh
```

What gets shipped to the server:
- `.next/` (compiled output)
- `public/`
- `node_modules/` (production deps, single-platform prebuilds)
- `scripts/qvac-worker.mjs` + `scripts/trim-node-modules.mjs`
- `package.json`, `next.config.ts`, `next-env.d.ts`, `ecosystem.config.cjs`
- `.env` (only on first deploy — managed on the server thereafter)

What gets stripped: `.git/`, `docs/`, `contracts/`, `hf-space/`, `models/`, `*.py`, tests, configs for tools we don't run on the server (`drizzle.config.ts`, `hardhat.config.ts`, `vitest.config.ts`).

What the `@qvac/sdk` platform prebuilds situation looks like: the SDK bundles native binaries for 9 platforms (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`, `win32-x64`, iOS sim/device, Android). On the server we keep only `linux-x64`, which drops node_modules from 7 GB to ~4 GB. The `trim-node-modules.mjs` script is platform-aware and respects `TRIM_PLATFORM` env var.

---

*Built for the [QVAC Hackathon I — Unleash Edge AI](https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/). Four AI agents, one local model, zero cloud calls for the inference path.*