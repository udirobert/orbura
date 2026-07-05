# QVAC Hackathon I — Submission Evidence Bundle

## Track Selection

**Psy Models** — Body Debt makes strong use of QVAC models for specialized health tasks. The 4-agent pipeline uses Qwen3-1.7B-Instruct (Q4) for health triage, recovery coaching, schedule planning, and reflection.

**Hardware:** Vultr VPS (Intel Broadwell 4-core, 7.7GB RAM, 150GB disk) — fits General Purpose track (≤32GB RAM).

---

## QVAC SDK Integration

All AI inference uses the QVAC SDK (`@qvac/sdk` v0.12.2). No other inference engine is used for the primary pipeline.

### How it works

```
Next.js API route (/api/qvac/infer)
  → src/lib/qvac/index.ts: spawn worker with `bare` runtime
  → scripts/qvac-worker.mjs: registers llmPlugin, loads model, runs 4 agents
  → @qvac/sdk: loadModel(QWEN3_1_7B_INST_Q4) + completion() per agent
  → Results stream back via stdout JSON lines → SSE to client
```

### Model

- **Model:** Qwen3-1.7B-Instruct (Q4 quantization, ~1GB)
- **Model source:** `QWEN3_1_7B_INST_Q4` from `@qvac/sdk` model registry
- **Runtime:** Bare v1.29.4 (required by QVAC SDK for native addon loading via `require.addon()`)
- **Plugin:** `llamacpp-completion` (registered via `plugins([llmPlugin])` before first SDK call)
- **Config:** TurboQuant KV-cache quantization (`cache-type-k: tbq4_0`, `cache-type-v: pq4_0`)

### 4-Agent Pipeline

| # | Agent | Role | Input | Output |
|---|---|---|---|---|
| 1 | Triage | Analyzes 5-system debt breakdown | System scores, stressors | PRIORITY / SECONDARY / AVOID |
| 2 | Coach | Generates 4-part recovery prescription | Triage output + debt score + stressors | RIGHT NOW / THIS MORNING / TODAY / AVOID |
| 3 | Schedule | Produces time-blocked recovery schedule | Triage + prescription + time context | 4 schedule blocks (time \| action \| system) |
| 4 | Reflection | Rewrites prescription in user's voice | Coach output + personality | Rewritten 4-part prescription |

Each agent streams tokens live. If an agent times out (40s), the pipeline continues to the next agent. Cloud AI (Eazo) is fallback only when QVAC is unavailable.

---

## Reproducibility Instructions

### Prerequisites

- Node.js 20+ or Bun
- `bare` runtime: `npm install -g bare@1.29.4`
- OpenSSL 3 (for native lib resolution)
- ~1GB free disk (for model cache)

### Run locally

```bash
bun install
bun dev
```

Navigate to `http://localhost:3000`, complete the intake flow, and the QVAC pipeline runs automatically.

### Run on a Linux server

```bash
# Install bare
sudo npm install -g bare@1.29.4
sudo chmod +x $(npm root -g)/bare/node_modules/bare-runtime-linux-x64/bin/bare

# Build and start
npx next build --webpack
pm2 start "npx next start" --name bodydebt
```

### Verify QVAC is working

```bash
# Direct worker test
bare scripts/qvac-worker.mjs '{"debtScore":62,"systemScores":[{"system":"brain","label":"Brain","score":67}],"stressors":["poor_sleep"]}'

# API endpoint test
curl -N -X POST http://localhost:3050/api/qvac/infer \
  -H 'Content-Type: application/json' \
  -d '{"stressScore":62,"isHealthy":false,"stressors":["poor_sleep","alcohol"]}'
```

Expected: `source: "qvac-local"` in the result event.

### Generate audit log

```bash
node scripts/generate-qvac-audit-log.mjs
```

Outputs:
- `qvac-audit/qvac-audit-log.jsonl` — full structured log
- `qvac-audit/qvac-audit-summary.csv` — CSV summary of inference calls

---

## Auditable Log

**Location:** `qvac-audit/qvac-audit-log.jsonl`

**Format:** JSONL (one JSON object per line)

**Events captured:**

| Event | Fields |
|---|---|
| `model_load` | timestamp, runId, model, source, modelSrc, loadDurationMs |
| `inference_call` | timestamp, runId, agent, model, source, prompt, tokensGenerated, ttftMs, tokensPerSec, durationMs, status, output |
| `model_unload` | timestamp, runId, model, source, unloadDurationMs |
| `run_summary` | timestamp, runId, label, totalDurationMs, source, agentCount, agentsCompleted, agentsFailed |

**Sample metrics from demo run (bad_night_spirits):**

| Agent | Tokens | Tokens/sec | Duration | Status |
|---|---|---|---|---|
| triage | 29 | 1.71 | 16,986ms | done |
| coach | 93 | 4.56 | 20,373ms | done |
| schedule | 0 | 0 | 0ms | error (timeout) |
| reflection | — | — | — | skipped |

**CSV summary:** `qvac-audit/qvac-audit-summary.csv`

---

## Third-Party Services, APIs, and Pre-built Components

### Inference (primary)

| Component | Role | Cloud dependency? |
|---|---|---|
| `@qvac/sdk` v0.12.2 | On-device LLM inference (Qwen3-1.7B Q4) | No — runs locally via Bare runtime |
| `@qvac/llm-llamacpp` v0.22.1 | Native llamacpp addon (prebuilt for linux-x64) | No |
| QVAC P2P registry | Model download (first run only, then cached) | Yes — P2P network, first download only |

### Inference (fallback only — not used when QVAC succeeds)

| Component | Role | Cloud dependency? |
|---|---|---|
| `@eazo/sdk` AI gateway | Cloud LLM fallback (deepseek) | Yes — only if QVAC fails |
| Eazo auth | User authentication | Yes |

### Face scan & ZK privacy

| Component | Role | Cloud dependency? |
|---|---|---|
| MediaPipe FaceMesh | Browser-based facial landmark extraction (468 points) | No — runs in browser |
| EZKL | Halo2 ZK proof generation and verification | No — runs in Web Worker |
| SKALE Europa testnet | On-chain proof verification | Yes — blockchain RPC |

### Wearables (optional integrations)

| Component | Role | Cloud dependency? |
|---|---|---|
| Terra API | Wearable data (Oura, Whoop, Apple Health) | Yes — optional |
| Google Fit API | Google Fit data | Yes — optional |
| Garmin | Garmin device data parsing | No — local parsing |

### Infrastructure

| Component | Role | Cloud dependency? |
|---|---|---|
| PostgreSQL (via DATABASE_URL) | User profiles, history | Yes — managed DB |
| Vultr VPS | Hosting | Yes — server |
| Coolify/Traefik | HTTPS termination, reverse proxy | No — self-hosted |
| pm2 | Process manager | No — local |

### Pre-built components

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, lucide-react, framer-motion
- Drizzle ORM, wagmi/viem (Ethereum/SKALE)
- Gradio (HF Space demo only — not part of QVAC submission)

### Open-source license

MIT License — see `LICENSE` file.

---

## Live Deployment

- **URL:** https://bodydebt.thisyearnofear.com
- **Evidence page:** https://bodydebt.thisyearnofear.com/evidence
- **Server:** Vultr (nuncio-vultr), Intel Broadwell 4-core, 7.7GB RAM
- **Process:** pm2 (`bodydebt` on port 3050) → nginx → Coolify/Traefik (HTTPS)
- **QVAC model cache:** `~/.qvac/models/` (738MB, downloaded on first inference)

---

## Repository Structure

```
body-debt/
├── scripts/
│   ├── qvac-worker.mjs          # QVAC 4-agent worker (runs with bare runtime)
│   ├── generate-qvac-audit-log.mjs  # Audit log generator
│   └── ...
├── src/
│   ├── lib/qvac/index.ts        # Spawns QVAC worker, handles events
│   ├── app/api/qvac/infer/      # SSE endpoint for QVAC inference
│   ├── app/api/analyze/         # Streaming analysis endpoint
│   └── ...
├── qvac-audit/
│   ├── qvac-audit-log.jsonl     # Structured audit log (JSONL)
│   └── qvac-audit-summary.csv   # CSV summary of inference calls
├── contracts/                    # Solidity contracts (ZK verification)
├── docs/                         # Documentation and demo scripts
├── hf-space/                     # HuggingFace Space (separate, uses transformers)
├── LICENSE                       # MIT
├── README.md                     # Project overview + QVAC integration
└── SUBMISSION.md                 # This file — hackathon evidence bundle
```
