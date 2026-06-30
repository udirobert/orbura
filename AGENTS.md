# Agent Guide: Body Debt

Body Debt is a multi-context recovery platform on the Eazo platform. It logs
lifestyle stressors, computes deterministic physiological debt across five body
systems, and streams AI-backed recovery prescriptions via a QVAC multi-agent
pipeline that runs entirely on-device.

The platform supports two recovery contexts:

- **Personal** — single-user body debt, the original app.
- **Football ("Match Fit")** — squad-level match-readiness, used for the
  Tether Developers Cup submission. See `docs/tether-cup-plan.md`.

Context-specific behavior (stressor catalog, scoring weights, agent prompt
vocabulary, UI vocabulary) lives in `src/lib/contexts/`. Each context exposes a
`RecoveryContextConfig`; the rest of the pipeline is context-agnostic.

This file is intentionally compact. Put longer architecture notes in `docs/`
instead of expanding this guide.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- Bun for install, scripts, and local development
- `@eazo/sdk` for auth, device, AI gateway, memory, notifications
- Zustand for guest-first state in `src/stores/useBodyDebtStore.ts`
- Drizzle ORM + PostgreSQL via `DATABASE_URL`
- shadcn/ui, lucide-react, framer-motion
- MediaPipe FaceMesh, EZKL, wagmi/viem, SKALE Europa testnet
- QVAC local LLM worker for edge AI coaching

## Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun run test

bun run db:generate
bun run db:push
bun run db:studio

python scripts/generate-stress-model.py
python scripts/compile-circuit.py
bun run zk:chunks
bun run zk:fixture
bun run zk:submit-fixture
node scripts/register-vk-on-chain.mjs
node scripts/deploy-standalone.mjs
```

Known local build caveats: production build may fail until Google font fetching and the QVAC worker bundling path are fixed. Do not treat those as blockchain regressions unless your change touched them.

## Key Files

| Domain | Location |
|---|---|
| State | `src/stores/useBodyDebtStore.ts` (3 slices: `profile-slice`, `session-slice`, `stream-slice`) |
| Types | `src/lib/types.ts` |
| Design tokens | `src/lib/design-tokens.ts` (CSS vars in `globals.css`) |
| Recovery contexts | `src/lib/contexts/` (registry: `index.ts`, configs: `personal.ts`, `football.ts`) |
| Context provider | `src/lib/contexts/RecoveryContext.tsx` (`useRecoveryContext()` hook) |
| Stressor catalog + scoring | `src/stressors/` (single source: `catalog.ts`, `scoring.ts`, `types.ts`, `index.ts`) |
| SSE event schemas (Zod) | `src/lib/sse-schemas.ts` |
| AI analysis (SSE stream) | `src/app/api/analyze/stream/route.ts` |
| Streaming analysis hook | `src/hooks/useStreamingAnalysis.ts` |
| Face scan UI | `src/components/screens/FaceScanScreen.tsx`, `src/components/face-scan/` |
| Face feature extraction | `src/lib/ai/face-mesh.ts` |
| Mode toggle / squad UI | `src/components/ModeToggle.tsx`, `src/components/screens/SquadScreen.tsx`, `src/app/squad/page.tsx` |
| EZKL prover worker | `src/workers/ezkl-prover.worker.ts` |
| Blockchain client | `src/lib/blockchain/skale-client.ts` |
| Wagmi config | `src/lib/providers/wagmi-config.ts`, `src/components/providers/WagmiProviderWrapper.tsx` |
| Contracts | `contracts/HealthCredentialVerifier.sol`, `contracts/EZKLVerifierReusable.sol` |
| Contract scripts | `scripts/deploy-reusable-verifier.mjs`, `scripts/register-vk-on-chain.mjs`, `scripts/deploy-standalone.mjs` |
| QVAC | `scripts/qvac-worker.mjs`, `src/lib/qvac/index.ts`, `src/app/api/qvac/infer/route.ts` |
| Wearables | `src/app/api/terra/`, `src/app/api/google-fit/`, `src/app/api/garmin/parse/route.ts`, `src/app/api/hrv/resolve/route.ts` |
| DB | `src/lib/db/schema/`, `src/lib/db/queries/`, `src/lib/db/client.ts` |

## Hard Rules

- Never import or call `ai` from `@eazo/sdk` in client components, hooks, browser helpers, or `src/lib/api/`. AI calls belong in `src/app/api/` route handlers only.
- Guard server-side AI routes with `requireAuth` before calling `ai.chat()`.
- Use `auth.login()` from `@eazo/sdk` for login UI. Do not build a custom login form unless explicitly required.
- In render, read Eazo auth/device state through `useEazo(selector)`. In event handlers/effects, use SDK singletons directly.
- Fire-and-forget `memory.reportAction(...).catch(() => {})` after significant user actions. Never let memory failures block core flow.
- Never store face scan images, raw pixels, or full MediaPipe landmark arrays.
- Never run EZKL proof generation on the main React thread. Always use `src/workers/ezkl-prover.worker.ts`.
- Never send app-level rounded scores as verifier public inputs. On-chain verification must use exact public instances emitted by EZKL.
- Never claim SKALE verification unless the `verifyAndLogCredential` transaction is confirmed.
- Keep `zkProof` ephemeral. It is intentionally excluded from Zustand persistence.

## ZK/SKALE Flow

The face-scan privacy path is:

```text
Camera frame
  -> MediaPipe FaceMesh in browser
  -> 7-dimensional feature vector
  -> EZKL worker proof generation
  -> local EZKL verify
  -> exact proof bytes + public instances
  -> HealthCredentialVerifier.verifyAndLogCredential(...)
  -> HealthCredentialVerified event only after Halo2 proof verification passes
```

`HealthCredentialVerifier` is the app-facing contract. It calls `Halo2VerifierReusable.verifyProof` internally and emits a credential event only after proof validation succeeds.

Current reusable verifier address is defined in `src/lib/blockchain/skale-client.ts` and `scripts/deploy-standalone.mjs`. If you redeploy `EZKLVerifierReusable`, update both constants.

## ZK Artifact Order

1. Generate or update the ONNX model:
   ```bash
   python scripts/generate-stress-model.py
   ```
2. Compile the circuit and generate proving/verifying keys:
   ```bash
   python scripts/compile-circuit.py
   ```
   This also runs `node scripts/generate-vk-chunks.mjs`.
3. Generate a local proof fixture when changing the proof boundary:
   ```bash
   bun run zk:fixture
   ```
4. Register the VKA chunks on `Halo2VerifierReusable`:
   ```bash
   node scripts/register-vk-on-chain.mjs
   ```
5. Deploy the app-facing credential verifier:
   ```bash
   node scripts/deploy-standalone.mjs
   ```
6. Set the resulting address:
   ```bash
   NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
   ```
7. Prove the deployed verifier with the local fixture when changing this flow:
   ```bash
   bun run zk:submit-fixture
   ```

Large artifacts such as `public/ezkl/*.key` are gitignored and must be regenerated locally or in deployment setup.

## Environment

Required for core app:

```bash
EAZO_APP_ID=
EAZO_PRIVATE_KEY=
DATABASE_URL=
```

Optional by feature:

```bash
CRON_SECRET=
TERRA_DEV_ID=
TERRA_API_KEY=
TERRA_SIGNING_SECRET=
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=
NEXT_PUBLIC_VERIFIER_ADDRESS=
DEPLOYER_PRIVATE_KEY=
NEXT_PUBLIC_APP_URL=
QVAC_MODEL_PATH=
```

## Implementation Preferences

- Prefer established repo patterns over new abstractions.
- Keep `page.tsx` files thin and move real UI into components.
- Use `@/` imports and UI primitives from `@/components/ui/`.
- Keep API fetch wrappers in `src/lib/api/` and route logic in `src/app/api/`.
- Keep comments short and only where they clarify non-obvious behavior.
- Do not touch generated or large artifacts unless the task explicitly needs it.

## Docs

- Deployment & HTTPS: `docs/deployment.md`
- Contract deployment: `contracts/README.md`
- ZK pipeline details: `docs/zk-pipeline.md`
- Demo notes: `docs/qvac-edge-ai-demo.md`, `docs/skale-privacy-demo.md`
- Tether Developers Cup plan: `docs/tether-cup-plan.md`
