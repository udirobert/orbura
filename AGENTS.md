# Agent Guide: Body Debt

Body Debt is evolving into a longitudinal intervention platform: turn health
signals into one safe action, learn what a person can sustain, and bring a human
care team in when judgment is needed. The first commercial wedge is adherence
rescue during the first 12 weeks of UK GLP-1 initiation and dose escalation.
See `docs/product-strategy.md` and `docs/architecture.md`.

The repository contains separate product shells:

- **Body Debt** — the original personal recovery product.
- **Match Fit** — squad-level football readiness.
- **Fan Recovery** — an experimental post-match experience.
- **Care Companion** — the new chronic-care product direction.
- **Showcases** — QVAC, Supermemory, SKALE/EZKL, WDK, and past hackathons.

The existing recovery contexts share `RecoveryContextConfig` under
`src/lib/contexts/`. Do not model Care Companion as another recovery mode: it
requires separate patient/clinician roles, longitudinal records, safety policy,
and escalation workflows. QVAC, OpenAI, memory, wearables, ZK/SKALE, WDK, and
MCP are capabilities or integrations, not user-facing products.

This file is intentionally compact. Put longer architecture notes in `docs/`
instead of expanding this guide.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- Bun for install, scripts, and local development
- Auth.js v5 for self-hosted authentication; Eazo-named modules are compatibility shims
- Zustand for guest-first state in `src/stores/useBodyDebtStore.ts`
- Drizzle ORM + PostgreSQL via `DATABASE_URL`
- shadcn/ui, lucide-react, framer-motion
- MediaPipe FaceMesh, EZKL, wagmi/viem, SKALE Europa testnet
- QVAC LLM worker spawned on the Next.js server host in web deployments
- Supermemory as an optional server-side retrieval integration

## Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun run test

bun run storybook
bun run storybook --no-open

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

Known local build notes: `next build` (Turbopack) compiles cleanly. Google fonts are fetched via `next/font/google` at build time, so the build host needs internet access. The QVAC worker (`scripts/qvac-worker.mjs`) is spawned as a child process at runtime — `src/lib/qvac/index.ts` marks the `node:child_process` import with `/* webpackIgnore: true */` and `@qvac/sdk` is in `serverExternalPackages`, so neither gets bundled into Next server chunks.

Deploy: `scripts/deploy.sh` builds locally, trims `node_modules` for the target platform (`TRIM_PLATFORM`, default `linux-x64`), rsyncs the runtime to the server, and reloads pm2. The script auto-fetches the target platform's `@next/swc-*` binary via tarball extraction before rsync — without it the server crashes with "Failed to load SWC binary for linux/x64" because the build host (darwin-arm64) doesn't install non-native optional deps. Never run `npm install` on the server; it prunes the rsynced `node_modules` and wipes `.next`. Storybook is built and copied to `public/storybook/` with a `<base href="/storybook/">` tag injected; `next.config.ts` rewrites `/storybook` → `/storybook/index.html` to handle the `trailingSlash: false` redirect. See `docs/deployment.md` for details.

## Key Files

| Domain | Location |
|---|---|
| State | `src/stores/useBodyDebtStore.ts` (4 slices: `profile-slice`, `session-slice`, `stream-slice`, `wallet-slice`) |
| Types | `src/lib/types.ts` |
| Design tokens | `src/lib/design-tokens.ts` (CSS vars in `globals.css`) |
| Motion tokens | `src/lib/motion/protocol.ts`, CSS `--duration-*` / `--ease-*` in `globals.css` |
| Collapse (accordion) | `src/components/ui/collapse.tsx` |
| Motion provider | `src/components/providers/MotionProvider.tsx` |
| Recovery contexts | `src/lib/contexts/` (registry: `index.ts`, configs: `personal.ts`, `football.ts`, `fan.ts`) |
| Context provider | `src/lib/contexts/RecoveryContext.tsx` (`useRecoveryContext()` hook) |
| Stressor catalog + scoring | `src/stressors/` (single source: `catalog.ts`, `scoring.ts`, `types.ts`, `index.ts`) |
| SSE event schemas (Zod) | `src/lib/sse-schemas.ts` |
| AI analysis (SSE stream) | `src/app/api/analyze/stream/route.ts` |
| Streaming analysis hook | `src/hooks/useStreamingAnalysis.ts` |
| Face scan UI | `src/components/screens/FaceScanScreen.tsx`, `src/components/face-scan/` (pipeline hook, `PrivacyBadge`, `ScanResult`, `PrivacyNotice`, `FaceScanFallback`) |
| Face feature extraction | `src/lib/ai/face-mesh.ts` |
| Mode toggle / squad UI | `src/components/ModeToggle.tsx`, `src/components/screens/SquadScreen.tsx`, `src/app/squad/page.tsx` |
| EZKL prover worker | `src/workers/ezkl-prover.worker.ts` |
| Blockchain client | `src/lib/blockchain/skale-client.ts` |
| Wagmi config | `src/lib/providers/wagmi-config.ts`, `src/components/providers/WagmiProviderWrapper.tsx` |
| Contracts | `contracts/HealthCredentialVerifier.sol`, `contracts/EZKLVerifierReusable.sol` |
| Contract scripts | `scripts/deploy-reusable-verifier.mjs`, `scripts/register-vk-on-chain.mjs`, `scripts/deploy-standalone.mjs` |
| Storybook stories | `src/**/*.stories.tsx` (96+ stories across Primitives, Inputs, Effects, Evidence, Dashboard, RecoverySchedule) |
| Storybook config | `.storybook/main.ts`, `.storybook/preview.ts` |
| Evidence data | `src/components/screens/evidence/evidence-data.ts`, `systems-science.ts` |
| Format utility | `src/lib/format-ms.ts` |
| QVAC | `scripts/qvac-worker.mjs`, `src/lib/qvac/index.ts`, `src/app/api/qvac/infer/route.ts` |
| Supermemory (user memory) | `src/lib/supermemory/` (`index.ts`, `outcome-signals.ts`, `prescription-attribution.ts`), `src/app/api/memory/` (`route.ts`, `context/route.ts`, `status/route.ts`) |
| WDK payments | `src/lib/wdk/` (`index.ts`, `types.ts`, `payments.ts`), `src/app/api/wallet/` (`connect`, `balance`, `send`), `src/stores/slices/wallet-slice.ts` |
| Wearables | `src/app/api/terra/`, `src/app/api/google-fit/`, `src/app/api/garmin/parse/route.ts`, `src/app/api/hrv/resolve/route.ts` |
| DB | `src/lib/db/schema/`, `src/lib/db/queries/`, `src/lib/db/client.ts` |
| Judge pages | `/evidence` (QVAC Hackathon), `/autoscientist` (AutoScientist Challenge), `/tether` (Tether Developers Cup) |

## Hard Rules

- Do not add Care Companion as another `RecoveryMode` or `RecoveryContextConfig`. Keep chronic-care roles, data, safety, and routes behind a separate product boundary.
- Treat OpenAI, QVAC, Supermemory, wearables, EZKL/SKALE, WDK, and MCP as capabilities or adapters, never as user-facing product modes.
- PostgreSQL is canonical for future care records. Supermemory may index derived summaries but must never be the only store of a clinically meaningful fact.
- Never let an LLM suppress a deterministic safety alert, diagnose, prescribe, or change a medication dose.
- Describe runtime location literally: MediaPipe/EZKL are browser-local; hosted QVAC runs on the Next.js server host unless the whole app is deployed locally.
- **Auth is NextAuth.js (Auth.js v5)** — self-hosted, no vendor lock-in. Config in `src/lib/auth.ts`. The Eazo SDK stubs in `src/lib/sdk/eazo-client.ts` and `eazo-react.tsx` delegate to NextAuth. Do not re-introduce `@eazo/sdk` as a real dependency.
- `requireAuth` is async — always `await requireAuth(request)` in API routes. It returns `{ ok: true, user }` or `{ ok: false, response }`. Guest-first: callers fall through when `ok: false`.
- Use `auth.login()` from `@/lib/sdk/eazo-client` (delegates to `signIn()` from `next-auth/react`) for login UI. The sign-in page is at `/auth/signin`.
- In render, read auth state through `useEazo(selector)` — it bridges to NextAuth's `useSession()`. In event handlers/effects, use `auth.login()` / `auth.logout()` from `@/lib/sdk/eazo-client`.
- Never import or call `ai` from the SDK in client components, hooks, browser helpers, or `src/lib/api/`. AI calls belong in `src/app/api/` route handlers only.
- Guard server-side AI routes with `requireAuth` before calling `ai.chat()`.
- Fire-and-forget `memory.reportAction(...).catch(() => {})` after significant user actions. Never let memory failures block core flow.
- All Supermemory calls go through `src/lib/supermemory/` — no direct `supermemory` SDK imports in components, hooks, or client code. The client-side `memory.reportAction()` POSTs to `/api/memory` which calls the server-only module. Forget operations (single + mass) go through `DELETE /api/memory`.
- Never store face scan images, raw pixels, or full MediaPipe landmark arrays.
- Never run EZKL proof generation on the main React thread. Always use `src/workers/ezkl-prover.worker.ts`.
- Never send app-level rounded scores as verifier public inputs. On-chain verification must use exact public instances emitted by EZKL.
- Never claim SKALE verification unless the `verifyAndLogCredential` transaction is confirmed.
- Keep `zkProof` ephemeral. It is intentionally excluded from Zustand persistence.
- Never expose `WDK_SEED_PHRASE` to the client. WDK wallet operations happen server-side in API routes only.
- All WDK blockchain calls go through `src/lib/wdk/` — no inline WDK imports in components or routes.

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

## System Scoring

`SystemScore` has a `hasData: boolean` field that distinguishes between systems that are genuinely clear (`hasData: true`, score 0) and systems with no relevant stressor data (`hasData: false`). The UI must never show "Clear" for a system that was never assessed — it shows "— No data" instead. The `computeSystemScores` function in `src/stressors/scoring.ts` tracks which systems were "touched" by logged stressors and sets `hasData` accordingly.

## Face Scan Privacy UX

The face scan flow has a review phase between capture and processing. After the 3-2-1 countdown, the user sees their captured photo and can: **Use this photo** (proceed to ZK proof), **Retake** (back to live camera), or **Delete photo & skip** (purge from memory, exit scan). The camera stream stays alive during review so retake is instant.

A persistent `PrivacyBadge` floats below the header during all active phases, adapting its copy: "Live preview · Not recording" → "In memory only · Not saved" → "Processing locally · Nothing uploaded" → "Photo cleared · Nothing stored". The result screen shows an animated "Photo cleared from memory" confirmation card on entry.

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
DATABASE_URL=
AUTH_SECRET=          # openssl rand -base64 32
AUTH_URL=             # public URL (auto-detected on Vercel)
```

Optional (Eazo legacy, no longer required):

```bash
EAZO_APP_ID=
EAZO_PRIVATE_KEY=
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
WDK_SEED_PHRASE=
ETH_RPC_URL=https://sepolia.drpc.org
NEXT_PUBLIC_USDT_CONTRACT=0xd077A400968890Eacc75cdc901F0356c943e4fDb
SUPERMEMORY_API_KEY=
SUPERMEMORY_BASE_URL=https://api.supermemory.ai
# Auth.js — email magic links (SMTP) + GitHub OAuth
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_FROM=Body Debt <noreply@bodydebt.ai>
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Implementation Preferences

- Prefer established repo patterns over new abstractions.
- Keep `page.tsx` files thin and move real UI into components.
- Use `@/` imports and UI primitives from `@/components/ui/`.
- Keep API fetch wrappers in `src/lib/api/` and route logic in `src/app/api/`.
- Keep comments short and only where they clarify non-obvious behavior.
- Do not touch generated or large artifacts unless the task explicitly needs it.
- **Motion/UX:** polish existing metaphors (orbs, gauges, systems) — do not
  introduce decorative chart kits or a second motion system. Use
  `src/lib/motion/protocol.ts`, CSS `--duration-*` / `--ease-*` tokens, and
  `Collapse` for disclosures. See `docs/motion-ux.md`.

## Docs

- Product strategy: `docs/product-strategy.md`
- Target architecture: `docs/architecture.md`
- Deployment & HTTPS: `docs/deployment.md`
- Contract deployment: `contracts/README.md`
- ZK pipeline details: `docs/zk-pipeline.md`
- Demo notes: `docs/skale-privacy-demo.md`
- Historical Tether / Match Fit plan: `docs/tether-cup-plan.md`
- Motion & UX craft: `docs/motion-ux.md`
- Face scan reliability: `docs/face-scan.md`
- Recent progress: `docs/progress.md`
- Archived legacy notes: `docs/legacy/`
- Historical HF-space experiments: `hf-space/archive/`
