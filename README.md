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

1. Install dependencies with Bun:
   ```bash
   bun install
   ```
   *(If `sharp` installation stalls, run: `SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install`)*

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

3. **Compile the EZKL circuit**:
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
| `model.onnx` | 318 B | ✅ | `python scripts/generate-stress-model.py` |
| `compiled.ezkl` | 2 KB | ✅ | `python scripts/compile-circuit.py` |
| `settings.json` | 1.3 KB | ✅ | `python scripts/compile-circuit.py` |
| `witness.json` | 1.2 KB | ✅ | `python scripts/compile-circuit.py` |
| `pk.key` | 164 MB | ❌ gitignored | `python scripts/compile-circuit.py` |
| `srs.key` | 16 MB | ❌ gitignored | `python scripts/compile-circuit.py` |
| `vk.key` | 75 KB | ❌ gitignored | `python scripts/compile-circuit.py` |

### Architecture notes

- The **prover worker** (`src/workers/ezkl-prover.worker.ts`) fetches `compiled.ezkl`, `pk.key`, and `srs.key` from the server on init. If any artifact is missing, it falls back to a mock proof with a clear label.
- The **face scan pipeline** (`src/components/face-scan/use-face-scan-pipeline.ts`) sends a `ProofRequest` to the worker and handles both real and mock proof paths.
- WASM and COOP/COEP headers are already configured in `next.config.ts`.

## Privacy & Data

- Face scans run entirely on-device: MediaPipe extracts landmarks, EZKL generates a ZK proof, and only the proof (not raw biometrics) is submitted to the SKALE blockchain for verification.
- The QVAC health coach runs a local LLM — no inference requests leave the device.
- The app supports a guest-first flow, allowing users to generate scores without forced account creation. Authenticated users get persistent history via the local database.
