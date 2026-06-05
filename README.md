# Body Debt

Body Debt is a health and recovery tracking application that quantifies the physiological and cognitive "debt" accumulated from lifestyle stressors, providing precise, AI-backed recovery prescriptions.

## Core Features

- **Stressor Intake**: Log lifestyle factors (alcohol, training, sleep, stress, illness) with a live, deterministically calculated debt meter.
- **Deterministic System Scoring**: Evaluates 5 biological systems (Cardiovascular, Brain/Cognition, Liver, Muscular/CNS, Gut) using physiological weights and circadian penalties.
- **Face Scan Analysis**: Optional device camera scan processed entirely on-device via MediaPipe FaceMesh. Facial geometry is reduced to a lightweight feature vector, passed through an EZKL zero-knowledge circuit to produce a cryptographic proof, and verified on the SKALE Europa testnet. *Raw biometric data never leaves the device.*
- **HRV & Wearable Integration**: Connect Terra API (WHOOP/Oura), upload Garmin CSVs, or use a manual subjective proxy to increase score confidence tiers.
- **AI-Powered Analysis**: Streams a comprehensive `DebtAnalysis` including a 0–100 score, verdict, specific recovery time, and tiered prescriptions (Right Now, This Morning, Today, Avoid).
- **Dashboard**: Animated "Debt Orb" visualization, 5-system breakdown with scientific citations, confidence tier signals, and clean streak tracking.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Runtime/Package Manager**: Bun
- **Styling**: Tailwind CSS v4, shadcn/ui, framer-motion, lucide-react
- **State**: Zustand (guest-first flow with `localStorage` persistence)
- **Database**: Drizzle ORM + PostgreSQL
- **Platform**: `@eazo/sdk` (Auth, AI gateway, Memory, Notifications)
- **Edge AI**: MediaPipe FaceMesh (browser), QVAC SDK (local Node.js LLM inference)
- **Zero-Knowledge Proofs**: EZKL (`@ezkljs/engine`) running in a Web Worker
- **Blockchain**: SKALE Europa Testnet via wagmi/viem

## Getting Started

### macOS Prerequisite: arm64 OpenSSL

The QVAC local LLM worker requires arm64 OpenSSL at `/opt/homebrew/opt/openssl@3/lib/`. If you don't have ARM Homebrew installed:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
arch -arm64 /opt/homebrew/bin/brew install openssl@3
```

### Setup

1. Install dependencies with Bun:
   ```bash
   bun install
   ```
   > **Note**: A `postinstall` script auto-trims unnecessary platform prebuilds from `node_modules`, keeping it at ~2.6 GB instead of ~8.4 GB. This runs every time you install.

2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```

3. Fill in your Eazo credentials and database URL in `.env`:
   - `EAZO_APP_ID`: Your Eazo app ID.
   - `EAZO_PRIVATE_KEY`: Your Eazo developer private key (hex, 64 chars).
   - `DATABASE_URL`: PostgreSQL connection string.
   - `NEXT_PUBLIC_VERIFIER_ADDRESS`: Deployed HealthCredentialVerifier contract address on SKALE testnet (optional — uses zero address if unset).
   - `DEPLOYER_PRIVATE_KEY`: Wallet private key for contract deployment (only needed for `scripts/deploy-contract.ts`).

4. Run database migrations (if applicable):
   ```bash
   bun run db:push
   ```

5. Start the development server:
   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Useful Commands

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun run lint     # Run ESLint
bun run db:studio # Open Drizzle Studio
```

## ZK Privacy Pipeline (Hackathon)

The face scan flow implements a full zero-knowledge machine learning pipeline for the [QVAC Edge AI](https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i) and [SKALE Programmable Privacy](https://dorahacks.io/hackathon/programmable-privacy) hackathons:

```
MediaPipe FaceMesh → extractStressFeatures (5 floats)
  → EZKL Web Worker → ZK proof (WASM)
    → SKALE contract write (wagmi) → HealthCredentialVerified event
      → QVAC local AI health coach (/api/qvac/infer)
```

The pipeline is fully compiled and operational. Real ZK proof artifacts are served from `/ezkl/` and the prover worker generates cryptographic proofs in-browser.

### Setup

1. **Generate the ONNX model** (requires Python + PyTorch + onnx):
   ```bash
   source .venv/bin/activate   # or set up a venv first: python3 -m venv .venv && pip install torch onnx numpy
   python scripts/generate-stress-model.py
   ```
   Produces `public/ezkl/model.onnx` — a 5→1 Gemm+Sigmoid stress classifier at opset 10.

2. **Install the EZKL CLI** (macOS ARM64, v23.0.3):
   ```bash
   curl -sL https://github.com/zkonduit/ezkl/releases/download/v23.0.3/\
     build-artifacts.ezkl-macos-aarch64.tar.gz | tar xz
   cp ezkl ~/.local/bin/
   export PATH="$HOME/.local/bin:$PATH"
   ```
   > **Note**: v23.0.5 dropped macOS binary support. v23.0.3 is the latest macOS-compatible release.

3. **Compile the EZKL circuit** (uses `ezkl` CLI v23.0.3 — requires separate install):
   ```bash
   python scripts/compile-circuit.py
   ```
   Runs 6 steps: `gen-settings` → `calibrate-settings` → `compile-circuit` → `gen-witness` → `gen-srs` → `setup`.
   Produces `public/ezkl/{compiled.ezkl,settings.json,witness.json,pk.key,srs.key,vk.key}`.
   Large `.key` artifacts (`pk.key` ~164MB, `srs.key` ~16MB, `vk.key` ~75KB) are gitignored and regeneratable.

4. **Deploy the verifier contract** (requires sFUEL from the [SKALE faucet](https://docs.skale.network/develop/faucet)):
   ```bash
   bunx hardhat run scripts/deploy-contract.ts --network skaleEuropaTestnet
   ```
   Then set `NEXT_PUBLIC_VERIFIER_ADDRESS` to the deployed address.

### Artifact Summary

| File | Size | Committed? | Regeneratable? |
|---|---|---|---|
| `model.onnx` | 1.9 KB | ✅ | `python scripts/generate-stress-model.py` |
| `compiled.ezkl` | 10.7 KB | ✅ | `python scripts/compile-circuit.py` |
| `settings.json` | 1.6 KB | ✅ | `python scripts/compile-circuit.py` |
| `witness.json` | 1.6 KB | ✅ | `python scripts/compile-circuit.py` |
| `pk.key` | 164 MB | ❌ gitignored | `python scripts/compile-circuit.py` |
| `srs.key` | 16 MB | ❌ gitignored | `python scripts/compile-circuit.py` |
| `vk.key` | 75 KB | ❌ gitignored | `python scripts/compile-circuit.py` |

### Architecture notes

- The **prover worker** (`src/workers/ezkl-prover.worker.ts`) fetches `compiled.ezkl`, `pk.key`, and `srs.key` from the server on init. If any artifact is missing, it falls back to a mock proof with a clear label.
- The **face scan pipeline** (`src/components/face-scan/use-face-scan-pipeline.ts`) sends a `ProofRequest` to the worker and handles both real and mock proof paths.
- WASM and COOP/COEP headers are already configured in `next.config.ts`.

## QVAC Edge AI — Local LLM Health Coach

After the ZK proof is generated, the app runs a local LLM health coach to produce personalized recovery advice:

### Architecture

```
Face Scan → ZK Proof → QVAC API (/api/qvac/infer) → SSE stream → ScanResult UI
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
             Local LLM (fork)    Cloud AI (fallback)
             llama-3.2-1b        deepseek.v3.1
             + TurboQuant 🧠
```

1. **Worker process** (`scripts/qvac-worker.mjs`): A standalone Node.js script that imports `@qvac/sdk` directly. It runs in its own process via `child_process.fork()` to avoid bundling the SDK's native deps (bare, llamacpp) with the Next.js server.
2. **SDK wrapper** (`src/lib/qvac/index.ts`): Forks the worker, sends the health data as a JSON argument, listens to stdout for newline-delimited JSON events (`progress` and `result`), and resolves with the advice string.
3. **API route** (`src/app/api/qvac/infer/route.ts`): SSE endpoint that calls `runHealthCoach()` with a 2-minute timeout. If the local LLM fails (worker crash, model not found, timeout), it falls back to Eazo cloud AI (`deepseek.v3.1`) via `@eazo/sdk`'s `ai.chat()`.
4. **Client API** (`src/lib/api/qvac.ts`): SSE stream consumer that reads the `ReadableStream` body, parses newline-delimited JSON, fires `onProgress` callbacks for download progress, and resolves with the final advice. Accepts an `AbortSignal` for cleanup on unmount.
5. **UI** (`src/components/face-scan/scan-result.tsx`): Shows a download progress bar (`CloudDownload` + animated progress) during model download, a spinner (`Loader2` + "Generating Recovery Advice") during inference, and the advice text with a `QVAC LOCAL` badge when complete.

### TurboQuant KV-Cache Quantization 🧠

Starting with QVAC SDK v0.12.0, the local LLM worker enables **TurboQuant** — a KV-cache quantization algorithm (Zandieh et al., ICLR 2026, Google Research) that compresses the model's running context memory by up to **5×** with near-zero accuracy loss:

```ts
// scripts/qvac-worker.mjs
const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  modelType: "llamacpp-completion",
  modelConfig: {
    "cache-type-k": "tbq4_0",  // TurboQuant for Key cache
    "cache-type-v": "pq4_0",  // PolarQuant for Value cache
  },
});
```

**How it works**: TurboQuant uses a two-stage pipeline — **PolarQuant** converts KV vectors to polar coordinates for clean 3–4 bit clustering, then **QJL** (Quantized Johnson-Lindenstrauss) corrects residual errors with 1 additional bit per component. No calibration data or model retraining needed.

**Current platform coverage**: Vulkan backend (NVIDIA, AMD GPUs on Linux/Windows). On macOS/Apple Silicon, the config is a safe no-op until Metal support ships in a future release.

**Benchmarks** (Qwen3.5-4B Q8, tbq4_0/pq4_0 config):
| Cache config | BPW | RULER | LongBench Avg |
|---|---|---|---|
| f16/f16 (baseline) | 16.00 | 96.2% | 37.52 |
| tbq4_0/pq4_0 | 3.75 | 93.7% | 34.97 |

Full benchmarks: [TurboQuant benchmark sheet](https://github.com/tetherto/qvac-fabric-llm.cpp/blob/master/docs/turboquant-benchmarks.md)

### Client-side Consumption Pattern

```tsx
import { getQvacAdvice } from "@/lib/api";

useEffect(() => {
  const abortCtrl = new AbortController();

  getQvacAdvice(
    { stressScore: 62, isHealthy: true, features: {...}, stressors: [...] },
    (progress) => setDownloadProgress(progress),
    abortCtrl.signal
  ).then((result) => {
    setAdvice(result.advice);
    setAdviceSource(result.source);
  });

  return () => abortCtrl.abort(); // cleanup on unmount
}, []);
```

### Model Caching

The first inference downloads a 752MB GGUF model (`Llama-3.2-1B-Instruct-Q4_0`) to `~/.qvac/models/`. Subsequent inferences use the cached copy (~10s load, ~4s inference).

### Fallback Chain

| Source | Latency | Requirements |
|---|---|---|
| `qvac-local` | ~15s (first run may download 752MB) | arm64 OpenSSL at `/opt/homebrew/opt/openssl@3/lib/`; QVAC SDK ≥0.12.0 |
| `eazo-cloud` | ~3s | `EAZO_PRIVATE_KEY` env var set |
| `fallback` | instant | None (static text) |

## node_modules Management

`@qvac/sdk` bundles native prebuilds for 6+ platforms (darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64, ios-arm64, android-arm64) across 10 ML runtime packages. A fresh `npm install` would pull ~8.4 GB.

**Solution**: `scripts/trim-node-modules.mjs` runs as a `postinstall` hook and removes:
- Non-arm64 prebuilds from every `@qvac/*` package (~1.5 GB)
- Unused transitive deps: `react-native-bare-kit`, `bare-runtime-darwin-x64`, `hermes-compiler` (~400 MB)

Result: `node_modules` stays at ~2.6 GB. The script is idempotent — safe to re-run.

The packages themselves are preserved — the SDK's bare runtime eagerly imports all plugin packages at startup even if only the LLM completion plugin is used.

## Privacy & Data

- Face scans run entirely on-device: MediaPipe extracts landmarks, EZKL generates a ZK proof, and only the proof (not raw biometrics) is submitted to the SKALE blockchain for verification.
- The QVAC health coach runs a local LLM — no inference requests leave the device.
- The app supports a guest-first flow, allowing users to generate scores without forced account creation. Authenticated users get persistent history via the local database.
