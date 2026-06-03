# Agent Guide: Body Debt

## Project Context
This repository is **Body Debt**, a health and recovery tracking application built on the Eazo platform. It quantifies the physiological and cognitive "debt" accumulated from lifestyle stressors and provides precise, AI-backed recovery prescriptions. 

**Core Domains:**
- **Stressor Intake**: Logging lifestyle factors (alcohol, training, sleep, stress, illness) with deterministic debt calculation.
- **Deterministic System Scoring**: Evaluates 5 biological systems (Cardiovascular, Brain/Cognition, Liver, Muscular/CNS, Gut) using physiological weights and circadian penalties.
- **Face Scan Analysis**: Optional device camera scan processed locally and analyzed via AI to detect visible stress markers. *No image data is retained.*
- **HRV & Wearable Integration**: Terra API (WHOOP/Oura), Garmin CSV uploads, or manual subjective proxy to increase score confidence tiers.
- **AI-Powered Analysis**: Streams comprehensive `DebtAnalysis` including a 0–100 score, verdict, specific recovery time, and tiered prescriptions.
- **State Management**: Zustand (`src/stores/useBodyDebtStore.ts`) manages a guest-first flow with `localStorage` persistence, gracefully upgrading to DB persistence upon authentication.

## 1. Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/sdk` — capability-first SDK: `auth`, `device`, `ai`, `storage`, `memory`, `notifications`, React integration, server-side `requireAuth` + `notifications.publish`; bundles GenAuth login + ECC/AES session decryption internally; `ai` routes through AWS Bedrock via the Eazo AI gateway; `memory` records user actions as persistent, semantically searchable memory for AI context retrieval; `notifications` opts users into per-app system push and lets the server fan out notifications to subscribers
- shadcn/ui, lucide-react, framer-motion
- Drizzle ORM (PostgreSQL via `drizzle-orm` + `postgres.js`)
- Zustand (global state management)

## 2. Key Architecture & Files

The base template setup is complete. Focus on these domain-specific areas when adding features:
- **State** — `src/stores/useBodyDebtStore.ts` (guest-first session management)
- **Scoring Logic** — `src/lib/systemScoring.ts` (deterministic physiological modifiers)
- **AI Analysis** — `src/app/api/analyze/stream/route.ts` (3-layer SSE streaming pipeline), `src/app/api/analyze/score/route.ts` (deterministic layer), `src/app/api/analyze/verdict/route.ts`, `src/app/api/analyze/prescription/route.ts`, and non-streaming `src/app/api/analyze/route.ts`
- **Face Scan** — `src/app/api/face-scan/route.ts` (processes canvas image data via vision AI)
- **HRV & Wearable Integration** — `src/app/api/terra/*` (Terra OAuth + webhook + data polling), `src/app/api/garmin/parse/route.ts` (CSV upload), `src/app/api/google-fit/*` (Google Fit OAuth + data), `src/app/api/hrv/resolve/route.ts` (unified fallback chain)
- **QVAC Edge AI** — `src/lib/qvac/index.ts` (local LLM inference) + `src/app/api/qvac/infer/route.ts`
- **ZK Proof Pipeline** — `src/workers/ezkl-prover.worker.ts` (Web Worker), `src/lib/ai/face-mesh.ts` (feature extraction), `src/lib/blockchain/skale-client.ts` (SKALE integration), `contracts/HealthCredentialVerifier.sol`
- **Orb Personality** — `src/lib/orbPersonality.ts` (4 voice modes: honest, gentle, scientific, sarcastic)
- **Auth & DB** — `src/app/api/user/profile/route.ts`, `src/lib/db/schema/` (users, debt-sessions, terra-connections), `src/lib/db/queries/`

## 3. Hackathon Architecture: Edge AI + Programmable Privacy

For QVAC Edge AI and SKALE Programmable Privacy hackathon submissions, the app implements a hybrid Zero-Knowledge Machine Learning (ZKML) pipeline:

1. **Edge AI (Client-Side)**: Uses `@mediapipe/face_mesh` to extract facial landmarks directly in the browser. These are reduced to a lightweight geometric feature vector (e.g., eye aspect ratio, brow tension) to minimize compute.
2. **ZK Proof Generation**: Uses `ezkl-js` (running in a dedicated Web Worker to avoid main-thread blocking) to generate a cryptographic proof that a specific, audited ONNX model was executed on the private feature vector to produce a public "Stress Score" or boolean health status. *Raw biometric data never leaves the device.*
3. **SKALE Verification**: The generated proof and public inputs are submitted to a minimal Solidity verifier contract on the SKALE Europa Testnet. Upon successful cryptographic verification, the contract emits a `HealthCredentialVerified` event or mints a Soulbound Token (SBT), creating a trustless, privacy-preserving health ledger.

### Pipeline Status — Fully Compiled ✅

The EZKL circuit compilation now succeeds end-to-end via the CLI binary (v23.0.3).

**What works:**
- ONNX model generation: `scripts/generate-stress-model.py` (PyTorch → opset 10, Gemm+Sigmoid)
- Circuit compilation: `scripts/compile-circuit.py` (uses `ezkl` CLI, 6 steps)
- Prover worker: fetches real artifacts from `/ezkl/`, generates cryptographic proofs in-browser
- Face scan pipeline: handles both real and mock proof paths

**Key files:**
- `scripts/generate-stress-model.py` — PyTorch model → ONNX export
- `scripts/compile-circuit.py` — EZKL CLI wrapper (gen-settings → calibrate-settings → compile-circuit → gen-witness → gen-srs → setup)
- `src/workers/ezkl-prover.worker.ts` — Web Worker for in-browser proof generation
- `src/lib/ai/face-mesh.ts` — MediaPipe feature extraction (5 floats)

**Installation note:** The EZKL CLI binary (v23.0.3) must be installed separately — it is not available on crates.io and v23.0.5+ dropped macOS support. Install from GitHub releases:
```bash
curl -sL https://github.com/zkonduit/ezkl/releases/download/v23.0.3/\
  build-artifacts.ezkl-macos-aarch64.tar.gz | tar xz
cp ezkl ~/.local/bin/
```

**Critical Implementation Rules for this Feature:**
- **NEVER** run the EZKL prover on the main React thread. Always use `src/workers/ezkl-prover.worker.ts`.
- **NEVER** send raw pixels or the full 468-point MediaPipe landmark array to the ZK circuit. Always pre-process to a reduced feature vector (<20 floats) to prevent browser WASM Out-Of-Memory crashes.
- **ALWAYS** use quantized (8-bit or 4-bit) ONNX models for ZKML to ensure proof generation completes in seconds, not minutes.
- Large ZK artifacts (`.key` files) are gitignored and must be regenerated via `python scripts/compile-circuit.py`.

## 3. Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun start
bun run cleanup:demo   # one-click remove demo artifacts and auto-fix stale todos exports in index files
```

If you are developing `@eazo/sdk` locally, build it first and sync into `node_modules`:

```bash
(cd ../eazo-sdk/sdk && npm install && npm run build)
bun run sdk:sync
```

### 3.1 Database (Drizzle)

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## 4. Project Structure

```
src/
  app/
    wake-time/page.tsx          — Step 1: wake time drum picker
    bed-time/page.tsx           — Step 2: bed time drum picker
    intake/page.tsx             — Step 3: stressor selection
    context-deepener/page.tsx   — Step 3b: stressor detail context
    face-scan/page.tsx          — Step 4: face scan (optional, with ZK proof)
    hrv-pull/page.tsx           — Step 5: HRV / wearable connect
    dashboard/page.tsx          — Main score dashboard
    prescription/page.tsx       — Prescription display
    share-card/page.tsx         — Shareable score card
    layout.tsx                  — Root layout; mounts <EazoProvider> + <WagmiProviderWrapper>
    page.tsx                    — Entry point → OpeningScreen
    api/
      analyze/                  — AI analysis (stream, score, verdict, prescription)
      face-scan/route.ts        — Vision AI face biomarker analysis
      terra/                    — Terra OAuth widget, callback, data, webhook
      google-fit/               — Google Fit OAuth + data pull
      garmin/parse/route.ts     — Garmin HRV CSV parser
      hrv/resolve/route.ts      — Unified HRV fallback chain
      qvac/infer/route.ts       — QVAC Edge AI local inference
      user/profile/route.ts     — Auth-guarded user profile + DB upsert
      mcp/route.ts              — MCP Streamable HTTP server
      notifications/            — Test + cron daily-digest push
  components/
    screens/                    — Full-page screen components (OpeningScreen, DebtIntakeScreen, etc.)
    face-scan/                  — PrivacyNotice, useFaceScanPipeline, ScanResult
    hrv/                        — ManualProxy, useTerraConnect
    user-profile/               — UserBadge, UserSyncEffect
    notifications/              — NotificationsToggle
    ui/                         — shadcn/ui primitives
    SystemPanels.tsx            — 5-system recovery collapsible panels
    SystemClearanceNotifier.tsx — Browser notification scheduler for system clearance
    SystemOrb.tsx               — SVG morphing system orb (heart, brain, liver, muscle, gut)
    DebtOrb.tsx                 — Main animated score orb
    MiniOrb.tsx                 — Compact orb for nav headers
    AnalysisLoader.tsx          — Loading screen with science facts + progress
    PageTransition.tsx          — Framer Motion page transitions
    ProgressBar.tsx             — Multi-step progress indicator
    stores/
      useBodyDebtStore.ts       — Zustand store with localStorage persistence
    hooks/
      useStreamingAnalysis.ts   — SSE consumer for /api/analyze/stream
    lib/
      systemScoring.ts          — Deterministic 5-system scoring with circadian penalties
      orbPersonality.ts         — 4 voice modes
      types.ts                  — Shared TypeScript types
      ai/
        face-mesh.ts            — MediaPipe face landmark feature extraction
      blockchain/
        skale-client.ts         — SKALE verifier client (viem)
      qvac/index.ts             — QVAC Edge AI local LLM wrapper
      db/
        schema/                 — Drizzle: users, debt_sessions, terra_connections
        queries/                — CRUD helpers (users, debt-sessions)
      mcp/
        server.ts               — MCP server assembly
        tools/                  — get-latest-debt, get-debt-history, get-prescription, log-stressors, get-recovery-status
      api/
        request.ts              — fetch wrapper; injects x-eazo-session
        user-profile.ts         — fetchUserProfile
  contracts/
    HealthCredentialVerifier.sol — SKALE verifier contract
  scripts/
    generate-stress-model.py     — ONNX stress classifier model generator
    compile-ezkl-circuit.sh      — EZKL circuit compilation pipeline
    deploy-contract.ts           — Hardhat deploy to SKALE Europa testnet
```

## 5. Capabilities

The platform exposes capabilities through `@eazo/sdk`. Most capabilities (`auth`, `device`) work the same in browsers and inside Eazo Mobile. The `ai` capability is **server-side only** — see its section for details.


### 5.1 React Provider

Mount `EazoProvider` once at the root layout. Also mount `WagmiProviderWrapper` (for SKALE blockchain interactions) and `UserSyncEffect` inside the provider — it upserts the authenticated user to the local DB after every login (Web and Mobile both converge through `GET /api/user/profile`):

```tsx
// src/app/layout.tsx
import { EazoProvider } from "@eazo/sdk/react";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { PageTransition } from "@/components/PageTransition";
import { WagmiProviderWrapper } from "@/components/providers/WagmiProviderWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EazoProvider>
          <WagmiProviderWrapper>
            <UserSyncEffect />
            <PageTransition>
              {children}
            </PageTransition>
            <Toaster />
          </WagmiProviderWrapper>
        </EazoProvider>
      </body>
    </html>
  );
}
```

**Note**: `WagmiProviderWrapper` wraps wagmi + `@tanstack/react-query` for the SKALE blockchain write operations (ZK proof verification transactions). It is optional and only needed if the face-scan → ZK proof → SKALE verification pipeline is used.

Read reactive state with `useEazo(selector)` inside components. Call singletons directly outside render:

```tsx
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

// Inside render — reactive
const user = useEazo((s) => s.auth.user);

// Outside render (event handler / effect) — direct call
<button onClick={() => auth.login()}>Sign in</button>
```

**Rule**: inside render, read reactive state via `useEazo(selector)`. Outside render (event handlers, effects, non-React code), use `auth.xxx` / `device.xxx` directly.

### 5.2 `auth`

```ts
import { auth } from "@eazo/sdk";

auth.user                                    // User | null (reactive)
auth.loading                                 // boolean
auth.authenticated                           // boolean
await auth.getToken()                        // string | null
auth.onChange((user) => { /* ... */ })       // subscribe — returns unsubscribe

await auth.loginWithSocial("google")
await auth.loginWithEmailPassword(email, password)
await auth.loginWithEmailCode(email, code)
await auth.sendEmailCode(email)
await auth.logout()
```

#### 5.2.1 Login UI

`@eazo/sdk` owns the login experience. Web runs the SDK-bundled login UI; Eazo Mobile routes to the native host login flow. App code never builds its own login UI.

Trigger login from anywhere:

```ts
import { auth } from "@eazo/sdk";

await auth.login();              // opens UI if needed, resolves with current User
await auth.login({ timeoutMs }); // optional timeout override (default 5 min)
auth.showLogin();                // imperative open
auth.hideLogin();                // imperative close (rejects any pending login())
```

`auth.login()` is idempotent — if the user is already authenticated it resolves immediately.

**Gating a page behind auth — correct pattern:**

```tsx
"use client";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { Button } from "@/components/ui/button";

export function MyFeaturePage() {
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">请先登录后继续</p>
        <Button onClick={() => auth.login().catch(() => undefined)}>登录</Button>
      </div>
    );
  }

  return <MyFeatureContent user={user} />;
}
```

**Never do this:**

```tsx
// ❌ Shows text but user has no way to actually log in
if (!user) return <p>需要登录</p>;

// ❌ Building a custom login form from scratch
if (!user) return <CustomLoginForm />;
```

Low-level login primitives (`auth.loginWithSocial` / `loginWithEmailPassword` / `loginWithEmailCode`) are still exposed — use them only when you need to bypass the bundled UI.

#### 5.2.2 Server-side auth guard

```ts
import { requireAuth } from "@/lib/auth"; // re-exports @eazo/sdk/server

export function GET(request: NextRequest) {
  const r = requireAuth(request);
  if (!r.ok) return r.response;
  // r.user: { id, email, name, avatarUrl }
}
```

#### 5.2.3 Login paths and user persistence

The SDK handles two login paths transparently:

| Path | How it works | DB upsert trigger |
|---|---|---|
| **Web** (browser) | User clicks Sign in → SDK shows login UI → `loginWith*` → SDK calls `GET /api/user/profile` to hydrate the user | `GET /api/user/profile` upserts on every call |
| **Mobile** (Eazo WebView) | Bridge handshake → host injects user via `hello` message → SDK sets auth state directly | `UserSyncEffect` detects `authenticated + platform === "mobile"`, then calls `GET /api/user/profile` |

Both paths converge at `GET /api/user/profile`, which calls `upsertUser()` in the background (non-blocking). This keeps the `users` table up to date without any extra round-trips.

#### 5.2.4 Authenticated API calls (client)

```ts
import { request } from "@/lib/api/request";
const res = await request("/api/my-endpoint");  // x-eazo-session auto-injected
```

### 5.3 `device`

```ts
import { device } from "@eazo/sdk";

device.platform      // 'web' | 'mobile'
device.locale        // 'zh-CN' | ...
```

For safe-area handling, use the standard CSS — `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` and `100dvh` for full-height layouts. The Eazo Mobile WebView advertises the correct insets to the browser, so the same CSS works edge-to-edge in both contexts.

### 5.4 `ai` — Server-side AI (AWS Bedrock via bedrock-mantle)

> **`ai` is strictly server-side. Never import or call it in any client component (`"use client"` files), browser code, or `src/lib/api/` helpers. All AI logic must live exclusively in `src/app/api/` route handlers.**

The `ai` capability routes calls through the Eazo platform's AI gateway (AWS Bedrock). It is built on the `openai` package — all parameter and response types are identical to the OpenAI SDK.

**Setup** — configure the private key once at the top of the route file:

```ts
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });
// Or omit this call if EAZO_PRIVATE_KEY is already set as an env var.
```

**Non-streaming** — returns a `ChatCompletion` object:

```ts
const result = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(result.choices[0].message.content);
```

**Streaming** — pass `stream: true` and iterate over `ChatCompletionChunk`s:

```ts
const stream = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "Tell me a story." }],
  stream: true,
  max_tokens: 512,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

**Function calling** — tools are fully supported:

```ts
const result = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "What is the weather in Shanghai?" }],
  tools: [{ type: "function", function: { name: "get_weather", description: "...", parameters: {} } }],
  tool_choice: "auto",
});
```

**Streaming SSE from a Next.js API route** — the recommended pattern for surfacing AI output to the client:

```ts
// src/app/api/my-feature/analyze/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const stream = await ai.chat({
    model: "deepseek.v3.1",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "..." },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

**Consuming a streaming response on the client** — read the `ReadableStream` body incrementally and append each chunk to state:

```tsx
"use client";
import { auth } from "@eazo/sdk";

async function runStream(signal: AbortSignal, onChunk: (delta: string) => void) {
  const sessionHeader = await auth.getSessionHeader();
  const res = await fetch("/api/my-feature/analyze", {
    method: "POST",
    headers: sessionHeader ? { "x-eazo-session": sessionHeader } : {},
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
```

**Important constraints:**

- **`ai` is server-side only — this is a hard rule.** Never import `ai` from `@eazo/sdk` in any file that contains `"use client"`, any hook, any component, or any `src/lib/api/` helper. Doing so would expose `EAZO_PRIVATE_KEY` to the browser.
- The correct architecture is always: **client component → `fetch` to an API route → API route calls `ai.chat()`**. The AI response is then streamed or returned back to the client over HTTP.
- Always guard the route with `requireAuth` before invoking `ai.chat()`.
- Use `deepseek.v3.1` as the default model unless there is a specific reason to change it. Full list of supported models:

  | Model | Vision |
  |---|---|
  | `deepseek.v3.1` | ❌ |
  | `deepseek.v3.2` | ❌ |
  | `openai.gpt-oss-20b` | ❌ |
  | `openai.gpt-oss-120b` | ❌ |
  | `openai.gpt-oss-safeguard-20b` | ❌ |
  | `openai.gpt-oss-safeguard-120b` | ❌ |
  | `qwen.qwen3-32b` | ❌ |
  | `qwen.qwen3-235b-a22b-2507` | ❌ |
  | `qwen.qwen3-coder-30b-a3b-instruct` | ❌ |
  | `qwen.qwen3-coder-480b-a35b-instruct` | ❌ |
  | `qwen.qwen3-coder-next` | ❌ |
  | `qwen.qwen3-next-80b-a3b-instruct` | ❌ |
  | `qwen.qwen3-vl-235b-a22b-instruct` | ✅ |
  | `mistral.ministral-3-3b-instruct` | ✅ |
  | `mistral.ministral-3-8b-instruct` | ✅ |
  | `mistral.ministral-3-14b-instruct` | ✅ |
  | `mistral.magistral-small-2509` | ✅ |
  | `mistral.mistral-large-3-675b-instruct` | ✅ |
  | `mistral.devstral-2-123b` | ❌ |
  | `mistral.voxtral-mini-3b-2507` | ❌ |
  | `mistral.voxtral-small-24b-2507` | ❌ |
  | `google.gemma-3-4b-it` | ✅ |
  | `google.gemma-3-12b-it` | ✅ |
  | `google.gemma-3-27b-it` | ✅ |
  | `nvidia.nemotron-nano-9b-v2` | ❌ |
  | `nvidia.nemotron-nano-12b-v2` | ✅ |
  | `nvidia.nemotron-nano-3-30b` | ❌ |
  | `nvidia.nemotron-super-3-120b` | ❌ |
  | `minimax.minimax-m2` | ❌ |
  | `minimax.minimax-m2.1` | ❌ |
  | `minimax.minimax-m2.5` | ❌ |
  | `moonshotai.kimi-k2-thinking` | ❌ |
  | `moonshotai.kimi-k2.5` | ✅ |
  | `zai.glm-4.6` | ❌ |
  | `zai.glm-4.7` | ❌ |
  | `zai.glm-4.7-flash` | ❌ |
  | `zai.glm-5` | ❌ |
  | `writer.palmyra-vision-7b` | ✅ |
- Re-exporting AI types: `ChatCompletion`, `ChatCompletionChunk`, `ChatCompletionCreateParamsNonStreaming`, `ChatCompletionCreateParamsStreaming` are all available from `@eazo/sdk` — no need to install `openai` separately.

Never do this:

```tsx
// ❌ src/components/my-feature/index.tsx — client component calling ai directly
"use client";
import { ai } from "@eazo/sdk"; // WRONG — exposes private key to the browser

export function MyFeature() {
  const handleClick = async () => {
    const result = await ai.chat({ model: "deepseek.v3.1", messages: [...] });
  };
}
```

Always do this instead:

```
Client component  →  fetch("/api/my-feature/...")  →  API route handler  →  ai.chat()
```

## 6. Memory — User Memory Persistence

`memory.reportAction()` writes a user action event to the Gum memory service — a persistent, semantically searchable log of what users did in your app. Gum stores events server-side and makes them available for AI context retrieval in later sessions.

**Client-side only.** Call it from `"use client"` components or client-side helpers. It uses the same `appId` and session as `auth` — no extra configuration required.

```ts
import { memory } from "@eazo/sdk";

// Fire-and-forget — always catch so Gum failures never block the user
memory.reportAction({
  content: 'User completed debt assessment. Score: 62. Verdict: "Significant debt."',
  event_type: "create",
  page: "hrv-pull",
  metadata: {
    type: "complete_debt_assessment",
    debt_score: 62,
    has_hrv: true,
    provider: "terra",
  },
}).catch(() => {});
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `content` | `string` (required) | Readable, full-sentence description of the event. Good: `"User completed debt assessment. Score: 62."`. Bad: `"completed"`. |
| `event_type` | `string` | Action category, e.g. `"create"`, `"update"`, `"delete"`, `"click"`, `"search"`, `"page_view"`. |
| `page` | `string` | Page or screen identifier, e.g. `"hrv-pull"`, `"dashboard"`, `"face-scan"`, `"intake"`. |
| `metadata` | `Record<string, unknown>` | Structured event data. `appid` is auto-injected by the SDK. Include a `type` field matching `event_type` and the relevant business objects. |
| `session_id` | `string` | Associate the event with a Gum session for conversational memory. |
| `device_id` | `string` | Device identifier. |
| `app` | `string` | App name / identifier. |
| `platform` | `string` | `"web"`, `"ios"`, `"android"`, etc. |
| `timestamp` | `string` | ISO 8601. Defaults to current time. |

**Recommended metadata shape:**

Model `metadata` after the event type so Gum can understand what happened:

```ts
// debt assessment complete
metadata: {
  type: "complete_debt_assessment",
  debt_score: 62,
  has_face_scan: true,
  has_hrv: true,
  confidence_tier: "precise",
}

// stressor toggle
metadata: {
  type: "toggle_stressor",
  stressor_type: "alcohol",
  enabled: true,
}

// navigation
metadata: {
  type: "page_view",
  page: "dashboard",
  previous_page: "hrv-pull",
}
```

`metadata.appid` is automatically injected by the SDK. Do not set it manually.

**The fire-and-forget pattern:**

Always chain `.catch(() => {})`. Gum is auxiliary — its failure must never break core user flows:

```ts
async function handleRunAnalysis() {
  try {
    // primary operation
    await runAnalysis(hrvData, false);

    // fire-and-forget memory
    memory.reportAction({
      content: `Debt assessment started. Stressors: ${count} items.`,
      event_type: "create",
      page: "hrv-pull",
      metadata: {
        type: "start_debt_assessment",
        stressor_count: count,
        has_face_scan: !!faceAnalysis,
        has_hrv: !!hrvData,
      },
    }).catch(() => {});
  } catch (err) {
    console.error("Analysis failed", err);
  }
}
```

**When to call it:**

- After completing a debt assessment
- After logging stressors
- After face scan (accept or skip)
- After connecting a wearable (Terra, Google Fit, or Garmin)
- After navigating to dashboard or prescription views
- After taking a significant action (set reminders, share score)

**When NOT to call it:**

- On every keystroke or scroll event
- For read-only operations like list fetches (low-signal noise)
- Inside server-side route handlers (`src/app/api/`) — it is a browser-only API

## 7. Notifications — System Push

Apps can publish system push notifications to users who have subscribed inside Eazo Mobile. Two surfaces:

**Client (`@eazo/sdk`)** — manage the per-(user, app) subscription bit:

```ts
import { notifications } from "@eazo/sdk";

const { subscribed } = await notifications.isSubscribed();
if (!subscribed) await notifications.subscribe();   // opt the current user in
// later…
await notifications.unsubscribe();
```

In a plain browser the methods resolve `{ subscribed: false }` and don't throw — apps render the right UI without special-casing. Inside Eazo Mobile the host writes the bit and the result reflects the new state.

The template wires this via `src/components/notifications/notifications-toggle.tsx`. Mount it wherever you want users to manage subscriptions (e.g., the dashboard, prescription page, or settings panel).

**Server (`@eazo/sdk/server`)** — fan out a notification to every subscriber:

```ts
import { notifications, EazoNotificationPublishError } from "@eazo/sdk/server";

await notifications.publish({
  appId: process.env.EAZO_APP_ID!,
  title: "Daily reminder",
  body: "Don't forget to review your tasks today.",
  data: { source: "cron-daily-digest" },     // forwarded to the device tap handler
  audience: "subscribers",                    // v1 only value
});
```

The helper signs an ES256K JWT with `EAZO_PRIVATE_KEY` and POSTs to `/api/open/notifications/publish`. v1 hard-caps subscriber fan-out at 5,000 (`code: 413` if exceeded). The request is short-lived — your backend doesn't need to be long-running, just reachable when you want to publish.

**Two example routes** ship with the template:

- `POST /api/notifications/test` (`src/app/api/notifications/test/route.ts`) — gated by `requireAuth`. Drives the "Send test notification" button.
- `GET /api/notifications/cron/daily-digest` (`src/app/api/notifications/cron/daily-digest/route.ts`) — Vercel Cron schedule (`vercel.json#crons`). Authenticates with `Authorization: Bearer ${CRON_SECRET}` (Vercel injects this automatically for cron-fired invocations). The default schedule is `0 17 * * *` (17:00 UTC daily) — adjust in `vercel.json`.

**Tap deep-link**: when a user taps a notification published with `appId: <X>`, Eazo Mobile auto-routes to `/app/viewer?id=<X>` so they land back inside your app.

## 8. MCP Server

Body Debt ships a built-in **MCP (Model Context Protocol) server** at `/api/mcp` with 5 Body Debt tools registered.

### Transport

Streamable HTTP (Web Standard), via `@modelcontextprotocol/sdk`'s `WebStandardStreamableHTTPServerTransport` (imported from `webStandardStreamableHttp.js`). Runs stateless — every request creates a fresh server instance, compatible with serverless deployments (Vercel, etc.).

**Do NOT replace this with `StreamableHTTPServerTransport` from `streamableHttp.js`.** That is a Node.js HTTP transport: it does not accept a `NextRequest`, requires manual body parsing (`request.text()`), and does not work on Vercel. The Web Standard variant is the only correct choice for Next.js.

### Authentication

The MCP endpoint uses the same `requireAuth(request)` guard as every other API route. It reads the `x-eazo-session` header and scopes all tool calls to the authenticated user's data. The `userId` is passed into every tool via closure — never trust user-supplied IDs.

### Connecting a Client

**Cursor / Claude Desktop (`mcp.json` / `claude_desktop_config.json`)**

```json
{
  "mcpServers": {
    "my-app": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "x-eazo-session": "<your-eazo-session-token>"
      }
    }
  }
}
```

For local development replace the URL with `http://localhost:3000/api/mcp`.

### How to Add a New Tool

**Step 1 — Create `src/lib/mcp/tools/<tool-name>.ts`**

Each tool lives in its own file and exports one `register*` function that receives the `McpServer` instance and the authenticated `userId`. Example from the existing codebase — `get-latest-debt`:

```ts
// src/lib/mcp/tools/get-latest-debt.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getLatestDebtSession } from "@/lib/db/queries";

export function registerGetLatestDebtTool(server: McpServer, userId: string) {
  server.tool(
    "get_latest_debt",
    "Get the user's most recent body debt score and recovery prescription.",
    {},
    async () => {
      const session = await getLatestDebtSession(userId);
      if (!session) {
        return {
          content: [{ type: "text", text: "No debt sessions found for this user." }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({
          debtScore: session.debtScore,
          verdict: session.verdict,
          recoveryTime: session.recoveryTime,
          prescription: session.prescription,
          createdAt: session.createdAt,
        }, null, 2) }],
      };
    }
  );
}
```

Rules for tool files:
- File: `src/lib/mcp/tools/<kebab-case>.ts`
- Export: one `register<ToolName>` function, nothing else
- Always use `userId` from the function argument — never from input args
- Return `{ isError: true, content: [...] }` for not-found / validation errors
- Return `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }` for success

**Step 2 — Register it in `src/lib/mcp/server.ts`**

```ts
// src/lib/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetLatestDebtTool } from "./tools/get-latest-debt";
import { registerGetDebtHistoryTool } from "./tools/get-debt-history";
import { registerLogStressorsTool } from "./tools/log-stressors";
import { registerGetPrescriptionTool } from "./tools/get-prescription";
import { registerGetRecoveryStatusTool } from "./tools/get-recovery-status";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "body-debt-mcp", version: "1.0.0" });

  registerGetLatestDebtTool(server, userId);
  registerGetDebtHistoryTool(server, userId);
  registerLogStressorsTool(server, userId);
  registerGetPrescriptionTool(server, userId);
  registerGetRecoveryStatusTool(server, userId);

  return server;
}
```

That's all — **do not modify `src/app/api/mcp/route.ts`**. It is transport-only glue and must not be rewritten. If it ever looks wrong, restore it to exactly this:

```ts
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildMcpServer } from "@/lib/mcp/server";

async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = buildMcpServer(auth.user.id);
  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
```

### File Layout (current)

```
src/lib/mcp/
  server.ts                    — assembles McpServer and registers all tools
  tools/
    get-latest-debt.ts          — `get_latest_debt` tool
    get-debt-history.ts         — `get_debt_history` tool
    get-prescription.ts         — `get_prescription` tool
    log-stressors.ts            — `log_stressors` tool
    get-recovery-status.ts      — `get_recovery_status` tool
src/app/api/mcp/
  route.ts                     — HTTP glue only (auth + transport + handler)
```

## 9. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_APP_ID` | Yes | Eazo app ID. Also passed as the `appId` arg to `notifications.publish` server-side. |
| `NEXT_PUBLIC_EAZO_APP_ID` | If sharing | Eazo app ID exposed to the client (used in share card). Same value as `EAZO_APP_ID`. |
| `EAZO_PRIVATE_KEY` | Yes | Hex-encoded 64-char private key; used by `requireAuth` to decrypt sessions and by `notifications.publish` to sign JWTs. |
| `DATABASE_URL` | If using DB | `postgresql://USER:PASS@HOST:PORT/DATABASE` |
| `CRON_SECRET` | If you ship the daily-digest cron | Shared secret Vercel Cron sends as `Authorization: Bearer …` when firing scheduled invocations. |
| `TERRA_DEV_ID` | If using Terra | Terra API developer ID for wearable integration. |
| `TERRA_API_KEY` | If using Terra | Terra API key. |
| `TERRA_SIGNING_SECRET` | If using Terra | Terra webhook HMAC signing secret for payload verification. |
| `GOOGLE_FIT_CLIENT_ID` | If using Google Fit | Google OAuth client ID for Google Fit REST API. |
| `GOOGLE_FIT_CLIENT_SECRET` | If using Google Fit | Google OAuth client secret. |
| `NEXT_PUBLIC_VERIFIER_ADDRESS` | If using SKALE | `HealthCredentialVerifier` contract address on SKALE Europa testnet. |
| `DEPLOYER_PRIVATE_KEY` | If deploying contracts | Private key for deploying contracts to SKALE testnet (no 0x prefix). |
| `EAZO_PLATFORM_API_BASE` | Optional | Override the Eazo platform base URL (defaults to `https://eazo.ai`). |
| `NEXT_PUBLIC_GENAUTH_APP_ID` | Optional | Override GenAuth App ID default. |
| `NEXT_PUBLIC_GENAUTH_APP_DOMAIN` | Optional | Override GenAuth tenant domain default. |

Copy `.env.example` to `.env` to configure locally.

## 10. UI Components

shadcn/ui is initialized. Available from `@/components/ui/`:

| Component | Import |
|---|---|
| Button | `import { Button } from "@/components/ui/button"` |
| Card | `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"` |
| Dialog | `import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"` |
| Input | `import { Input } from "@/components/ui/input"` |
| Label | `import { Label } from "@/components/ui/label"` |
| Select | `import { Select, SelectContent, SelectItem } from "@/components/ui/select"` |
| Sheet | `import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet"` |
| Tabs | `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"` |
| Textarea | `import { Textarea } from "@/components/ui/textarea"` |
| Sonner (toast) | `import { Toaster } from "@/components/ui/sonner"` |

Add more: `bunx shadcn@latest add <component>`. Icons: `lucide-react`. Animation: `framer-motion`.

## 11. Adding New Pages

Each URL maps to a `page.tsx` under `src/app/`. Extract non-trivial UI into `src/components/<feature>/` and keep `page.tsx` as a thin entry point.

1. **Route file** (`src/app/dashboard/page.tsx`):
   ```tsx
   import { DashboardPage } from "@/components/dashboard";
   export default function Dashboard() {
     return <DashboardPage />;
   }
   ```
2. **Page component** (`src/components/dashboard/index.tsx`):
   ```tsx
   "use client";
   import { useEazo } from "@eazo/sdk/react";

   export function DashboardPage() {
     const user = useEazo((s) => s.auth.user);
     // ...
   }
   ```
3. **If the page needs a new API route** — add `src/app/api/<resource>/route.ts` and guard it with `requireAuth`.

## 12. Coding Requirements

### 12.1 Component Encapsulation (mandatory)

- **Never write all code in one file.** A `page.tsx` must remain a thin entry point — it imports one top-level feature component and renders it. Business logic, UI sections, and sub-components all live in separate files.
- **One component per file — strictly enforced.** Each file must export exactly one component. No exceptions: even small helper components must have their own file. If you find yourself writing a second component in the same file, stop and split immediately.

Bad — multiple components in one file:

```tsx
// src/components/dashboard/index.tsx  ❌
export function StatsCard() { ... }
export function RecentActivity() { ... }
export function DashboardPage() {
  return (
    <>
      <StatsCard />
      <RecentActivity />
    </>
  );
}
```

Good — each component in its own file:

```tsx
// src/components/dashboard/stats-card.tsx  ✅
export function StatsCard() { ... }

// src/components/dashboard/recent-activity.tsx  ✅
export function RecentActivity() { ... }

// src/components/dashboard/index.tsx  ✅
import { StatsCard } from "./stats-card";
import { RecentActivity } from "./recent-activity";

export function DashboardPage() {
  return (
    <>
      <StatsCard />
      <RecentActivity />
    </>
  );
}
```
- **Extract every non-trivial section.** Any UI block that has its own state, its own data fetch, or spans more than ~50 lines should be its own component file.
- **Group by feature, not by type.** Place related components together under `src/components/<feature>/`. Do not dump everything into a flat `components/` folder.

Example of the correct split for a "Dashboard" feature:

```
src/components/dashboard/
  index.tsx          — DashboardPage (top-level, imported by page.tsx)
  dashboard-header.tsx
  stats-grid.tsx
  recent-activity.tsx
  activity-item.tsx
```

### 12.2 File Size Limits

| File type | Soft limit | Hard limit |
|---|---|---|
| Page component (`page.tsx`) | 30 lines | 50 lines |
| Feature component | 150 lines | 250 lines |
| Utility / helper | 80 lines | 150 lines |
| API route handler | 60 lines | 100 lines |

When a file approaches its hard limit, split it before continuing.

### 12.3 Naming Conventions

- Component files: `kebab-case.tsx` (e.g. `user-profile-card.tsx`)
- Component exports: `PascalCase` named export (e.g. `export function UserProfileCard`)
- Each feature folder exposes a barrel `index.tsx` that re-exports the top-level component.
- API helpers: `camelCase` functions in `src/lib/api/<resource>.ts`.

### 12.4 State and Data

- Do not fetch data directly inside a `page.tsx`. Delegate to a client component or a server component that lives in `src/components/`.
- Read auth state with `useEazo((s) => s.auth.user)` from `@eazo/sdk/react` — do not re-fetch profile inside individual components.
- Keep Zustand stores in `src/stores/`. Do not create ad-hoc `useState` sprawl across multiple files for shared state.

### 12.5 API Requests (mandatory)

- **All API call logic must live in `src/lib/api/`.** Never call `fetch` or `request()` directly inside a page or component file.
- Group by resource: `src/lib/api/features.ts`, `src/lib/api/analysis.ts`, etc. Each file exports typed async functions for that resource's operations.
- Re-export everything through `src/lib/api/index.ts` so consumers import from one place:

```ts
// correct
import { fetchUserProfile } from "@/lib/api";
const user = await fetchUserProfile();

// wrong — fetch inside a component
const res = await request("/api/user/profile");
```

- API functions must be fully typed: explicit parameter types and return types (no implicit `any`).
- Error handling belongs in the API layer, not scattered across components.

### 12.6 Imports

- Use `@/` path aliases everywhere — no relative `../../` chains.
- Import UI primitives from `@/components/ui/`, not directly from shadcn source paths.

## 13. Project Rules

- Prefer Bun for all install and script commands.
- Keep the codebase lean and framework-native.
- Do not reach into `@eazo/sdk` internals. The public surface is `auth`, `device`, `ai`, `storage`, `memory`, `notifications`, `useEazo`, `EazoProvider`, `requireAuth`, and semantic types.
- **`ai` must only be called inside `src/app/api/` route handlers — never in client components, hooks, or `src/lib/api/` helpers.**
- **Call `memory.reportAction()` (fire-and-forget) after every meaningful user mutation.** Always chain `.catch(() => {})` — Gum failures must never break core user flows. Do not call it for read-only fetches or inside server-side route handlers.
- **Maintain the privacy-first approach:** Never store face scan images, and ensure the guest-first flow remains frictionless.
- **Always maintain a local `users` table.** Every app must persist authenticated user info in its own database. The `users` schema and `upsertUser` query are the reference implementation — do not remove them. `GET /api/user/profile` upserts on every call (Web path); `UserSyncEffect` triggers the same upsert after a Mobile bridge login. Join against the local `users` table rather than relying solely on the SDK session.
- Before shipping, run `bun run lint` and `bun run build`.

## 14. Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
