# Tether Developers Cup — Multi-Track Football Recovery Platform

> **Status:** Historical competition plan and Match Fit product reference. It is
> not the active company roadmap. Match Fit is now treated as a separate product
> shell; see [product strategy](./product-strategy.md) and
> [target architecture](./architecture.md).

## Competition

Tether Developers Cup. Football-themed knockout tournament.
$8,000 USDt total: $1K per track (Pears, QVAC, WDK) + $5K Cup Champion.

**Key dates (GMT-7):**
- July 6: registration closes, field locks
- July 8: first cut — submit project + 3-min demo video, top 16 advance
- July 12: second cut (semifinals) — 16 → 4 finalists
- July 14, 23:59: final submission deadline
- July 15–18: live pitch to Tether team
- July 19: winners announced

**Judging criteria (1–5 each):**
1. Technical ambition
2. User experience
3. Real-world use
4. Creativity
5. Real use of your track(s)

**Rule:** "Projects that combine more than one part of the stack
(e.g. QVAC + WDK) are welcome and impressive."

**Rule:** "QVAC track: all AI must run on the user's device through the QVAC
SDK. No cloud AI."

**Rule:** "Judges only score what you build during the event." Reusing old
code is allowed, but new commits must show meaningful progress.

## Strategy — Multi-Track (QVAC + WDK)

**Pitch:** *Match Fit is the self-hosted team doctor. Scan a player, get a
match-readiness score and return-to-play protocol — no third-party model
API, no API keys. Now with self-custodial squad payments: match-day
bonuses, player fines, and fan tipping — all in USDt, all from the same
app.*

### Why multi-track

A QVAC-only submission is strong but capped on two criteria (technical
ambition, real use of tracks). Adding WDK makes us a two-track project that
the rules explicitly reward, and the football payment use case (bonuses,
fines, tipping) is a natural fit no one else will have.

### Track mapping

| Track | What we use | How |
|---|---|---|
| **QVAC** | `@qvac/sdk` | 4-agent pipeline (triage, coach, schedule, reflection) running Qwen3-1.7B self-hosted on the app server |
| **WDK** | `@tetherto/wdk` + `@tetherto/wdk-wallet-evm` | Self-custodial USDt wallet for squad payments: bonuses, fines, fan tipping |

Pears (P2P) is a possible future addition for squad sharing, but WDK is
the priority — it has a clearer football use case and a simpler integration
path.

## Architecture

```
                    +---------------------------------+
                    |   QVAC Multi-Agent Pipeline      |
                    |   (triage -> coach -> schedule   |
                    |    -> reflection)                |
                    +---------------+-----------------+
                                    |
                    +---------------v-----------------+
                    |   Recovery Context / Mode        |
                    |   - stressor catalog              |
                    |   - scoring weights               |
                    |   - agent prompt templates        |
                    |   - UI vocabulary                 |
                    +---------------+-----------------+
                                    |
           +------------------------+------------------------+
           v                        v                        v
     +----------+             +----------+             +----------+
     | Personal |             | Football |             | (future) |
     |  health  |             | Match Fit|             |  modes   |
     +----------+             +----------+             +----------+
                                    |
                    +---------------v-----------------+
                    |   WDK Squad Payments              |
                    |   - self-custodial USDt wallet    |
                    |   - match-day bonuses             |
                    |   - player fines                  |
                    |   - fan tipping                   |
                    |   - squad treasury balance        |
                    +-----------------------------------+
```

## Implementation Plan

### ✅ Phase 1–6: Football mode + QVAC pipeline (COMPLETE)

All phases from the previous plan are done. See "Completed Phases" section
below for the full history.

### Phase 7: Cloud AI fallback configuration (CRITICAL — pre-July 8)

**Goal:** Eliminate disqualification risk from the "no cloud AI" rule.

The `NEXT_PUBLIC_ENABLE_CLOUD_VERDICT` flag already exists and defaults to
`false`. When off, the server skips all cloud AI calls — the deterministic
Layer 1 score serves as the verdict, and QVAC is the primary AI path with
deterministic fallback.

**No code deletion needed.** The flag already does exactly what the Tether
rule requires. We just need to:

- [ ] Ensure `NEXT_PUBLIC_ENABLE_CLOUD_VERDICT` is not set to `true` in the
      Tether deployment env
- [ ] Update `/tether` page data to show deterministic-only fallback chain
      (not "Cloud AI (Eazo/deepseek)")
- [ ] Update `tether-data.ts` fallback chain to show:
      QVAC → deterministic fallback (not QVAC → cloud AI)
- [ ] Keep the cloud AI code path intact — it's needed for the QVAC
      Hackathon (still being judged), where the Edge vs Cloud comparison
      is a featured metric

**Why not delete the cloud code?** The QVAC Hackathon is still being judged.
Judges "may ask you to walk through or run your project live." The Edge vs
Cloud timing comparison (21.5s edge vs 7.1s cloud) requires the cloud AI
path to be available when `ENABLE_CLOUD_VERDICT=true`. Deleting it would
break that feature for an active competition.

**Principle: DRY** — the flag is the single source of truth for cloud AI
behavior. No code duplication, no feature branches, no deleted code that
needs rewriting later.

### Phase 8: WDK wallet integration (HIGH — pre-July 8)

**Goal:** Add self-custodial USDt wallet for squad payments.

#### 8.1: WDK client module

New domain folder: `src/lib/wdk/`

| File | Purpose |
|---|---|
| `src/lib/wdk/index.ts` | WDK client singleton — init, register EVM wallet, export typed helpers |
| `src/lib/wdk/types.ts` | `SquadPayment`, `PaymentType`, `WalletState` types |
| `src/lib/wdk/payments.ts` | `sendBonus()`, `sendFine()`, `sendTip()`, `getTreasuryBalance()` |

**Principle: MODULAR** — WDK client is a self-contained module with no
dependencies on the rest of the app. The app calls into it; it never
reaches out.

**Principle: DRY** — single source of truth for WDK init and payment
logic. No inline WDK calls in components or routes.

WDK init (server-side, in an API route):

```ts
import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

// Manager's seed phrase — stored in env, never exposed to client
const wdk = new WDK(process.env.WDK_SEED_PHRASE!)
  .registerWallet('ethereum', WalletManagerEvm, {
    provider: process.env.ETH_RPC_URL ?? 'https://eth.drpc.org',
  })
```

USDt contract address on Ethereum mainnet:
`0xdAC17F958D2ee523a2206206994597C13D831ec7`

#### 8.2: Squad payment types

Extend `SquadPlayer` in `src/lib/types.ts`:

```ts
export interface SquadPlayer {
  // ...existing fields...
  walletAddress?: `0x${string}`;  // player's EVM address for receiving payments
}

export type PaymentType = "bonus" | "fine" | "tip";

export interface SquadPayment {
  id: string;
  type: PaymentType;
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  amount: string;       // human-readable USDt amount (e.g. "50")
  amountWei: bigint;    // raw USDt units (6 decimals)
  txHash?: `0x${string}`;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  note?: string;        // "Player of the match", "Late to training", etc.
}
```

**Principle: ENHANCEMENT FIRST** — extend the existing `SquadPlayer`
interface rather than creating a parallel type.

#### 8.3: Payment store slice

New slice: `src/stores/slices/wallet-slice.ts`

| Field | Type | Persisted |
|---|---|---|
| `walletConnected` | `boolean` | yes |
| `managerAddress` | `` `0x${string}` `` | yes |
| `treasuryBalance` | `string` | no (ephemeral) |
| `payments` | `SquadPayment[]` | yes |
| `connectWallet()` | `() => Promise<void>` | — |
| `disconnectWallet()` | `() => void` | — |
| `refreshBalance()` | `() => Promise<void>` | — |
| `addPayment()` | `(p: SquadPayment) => void` | — |
| `updatePaymentStatus()` | `(id, status, txHash?) => void` | — |

**Principle: CLEAN** — wallet state is a separate slice from profile and
session. Cross-slice coordination via the store composer, same pattern as
the existing three slices.

#### 8.4: Payment API routes

| Route | Method | Purpose |
|---|---|---|
| `src/app/api/wallet/balance/route.ts` | GET | Get treasury USDt balance |
| `src/app/api/wallet/send/route.ts` | POST | Send USDt (bonus, fine, or tip) |
| `src/app/api/wwallet/history/route.ts` | GET | Get payment history |

**Principle: CLEAN** — all WDK blockchain calls live in API routes, never
in client components. Same pattern as the existing `requireAuth` +
`src/app/api/` convention.

**Security:** `WDK_SEED_PHRASE` is server-only. The client never sees the
seed phrase. The client requests a payment via the API; the server signs
and broadcasts. This is self-custodial from the user's perspective (the
manager holds the keys via env) and safe from the app's perspective (no
client-side key exposure).

#### 8.5: Payment UI

Enhance `SquadScreen.tsx` — add a payment panel below the readiness board:

| Component | Location | Purpose |
|---|---|---|
| `SquadPaymentPanel` | new section in `SquadScreen.tsx` | Treasury balance, send bonus/fine/tip buttons |
| `PlayerPaymentRow` | new row in each player card | Player's wallet address + quick-send buttons |
| `PaymentHistoryDrawer` | new drawer in `SquadScreen.tsx` | List of past payments with tx hashes |

**Principle: ENHANCEMENT FIRST** — extend `SquadScreen.tsx` rather than
creating a new screen. The payment panel is a conditional section that
only renders when `ctx.supportsSquad && walletConnected`.

**Principle: PERFORMANT** — payment state is loaded lazily (only when the
payment panel is opened). Balance refresh is manual, not polled.

#### 8.6: Wallet connection flow

1. Manager taps "Connect Treasury" button in squad view
2. API route generates a WDK wallet from `WDK_SEED_PHRASE` (server-side)
3. Returns the manager's EVM address to the client
4. Client stores `managerAddress` in the wallet slice
5. Manager can now send payments to any player with a `walletAddress`

**No browser wallet extension required.** The WDK wallet is server-side
and self-custodial (the manager holds the seed phrase via env var). This
is simpler than MetaMask integration and aligns with the WDK's
"self-custodial and stateless" design.

### Phase 9: Tether judge page update (pre-July 8)

Update `/tether` page to reflect the multi-track submission:

- [ ] Add WDK track badge to header
- [ ] Add "Squad Payments" section showing bonus/fine/tip flow
- [ ] Update judging criteria cards to mention WDK usage
- [ ] Update architecture diagram to include WDK payment layer
- [ ] Add "Two-track project" callout

### Phase 10: Demo video (pre-July 8, mandatory)

3-minute YouTube unlisted video. Script:

1. **0:00–0:15** — Hook: "The self-hosted team doctor. Now with squad
   payments."
2. **0:15–0:45** — Open Match Fit, add a player, log stressors (match
   minutes, poor sleep)
3. **0:45–1:15** — QVAC pipeline runs: triage → coach → schedule →
   reflection. Show agent trace + timing.
4. **1:15–1:45** — Squad readiness board: 5 players, traffic-light tiers
5. **1:45–2:30** — WDK payments: connect treasury, send "Player of the
   Match" bonus in USDt, show tx confirmation
6. **2:30–2:50** — Self-hosted demo: show the QVAC pipeline running on the app server without a third-party model API
7. **2:50–3:00** — Close: "QVAC + WDK. No third-party model API. No API keys."

### Phase 11: Pears P2P squad sharing (STRETCH — post-July 8)

**Goal:** Three-track project (QVAC + WDK + Pears).

Replace the current squad share API (`/api/squad/share` → in-memory cache →
`/squad/shared/[token]`) with Pears Stack P2P:

- Manager creates a Hyperswarm topic for the squad
- Coaching staff joins the topic via a share code
- Squad readiness data syncs peer-to-peer, no server

**Principle: CONSOLIDATION** — delete the in-memory squad share store
(`src/lib/squad-share-store.ts`) and the API route. Replace with Pears-based
P2P sharing.

This is a stretch goal — only if time permits after WDK is solid.

## Round Milestones

- **Round of 16 (July 8):** Football mode + QVAC pipeline + WDK payments
  functional. Cloud AI fallback disabled. 3-min demo video submitted.
- **Semifinals (July 12):** WDK payment history. Polish: payment
  animations, tx confirmation states. Pears P2P sharing (stretch).
- **Final (July 14–15):** Live demo: squad scan → readiness board →
  USDt bonus payment → self-hosted QVAC mode.

## Dependency Installation

```bash
bun add @tetherto/wdk @tetherto/wdk-wallet-evm
```

WDK is the Tether Wallet Development Kit. EVM wallet module provides
Ethereum/EVM-compatible chain support (needed for USDt on Ethereum).

## New Environment Variables

```bash
WDK_SEED_PHRASE=           # 12 or 24-word seed phrase for the manager's wallet
ETH_RPC_URL=               # Ethereum RPC URL (default: https://eth.drpc.org)
NEXT_PUBLIC_USDT_CONTRACT= # USDt contract address (default: mainnet 0xdAC17F958D2ee523a2206206994597C13D831ec7)
```

**Security:** `WDK_SEED_PHRASE` is server-only. Never expose to the client.
Never commit to git. Use a test wallet with small amounts for the hackathon.

## New Files

| File | Purpose |
|---|---|
| `src/lib/wdk/index.ts` | WDK client singleton — init, register EVM wallet |
| `src/lib/wdk/types.ts` | `SquadPayment`, `PaymentType`, `WalletState` types |
| `src/lib/wdk/payments.ts` | `sendBonus()`, `sendFine()`, `sendTip()`, `getTreasuryBalance()` |
| `src/stores/slices/wallet-slice.ts` | Wallet state (persisted: address, payments; ephemeral: balance) |
| `src/app/api/wallet/balance/route.ts` | GET treasury USDt balance |
| `src/app/api/wallet/send/route.ts` | POST send USDt payment |
| `src/app/api/wallet/history/route.ts` | GET payment history |

## Modified Files

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `walletAddress` to `SquadPlayer`, add `SquadPayment` + `PaymentType` |
| `src/components/screens/SquadScreen.tsx` | Add `SquadPaymentPanel`, `PlayerPaymentRow`, `PaymentHistoryDrawer` |
| `src/components/screens/tether/tether-data.ts` | Add WDK track info, payment section, update judging criteria |
| `src/components/screens/tether/TetherPage.tsx` | Render WDK sections |
| `src/app/api/analyze/stream/route.ts` | No change — `NEXT_PUBLIC_ENABLE_CLOUD_VERDICT` flag already handles this |
| `src/components/screens/evidence/evidence-data.ts` | No change — QVAC evidence page keeps cloud comparison for QVAC Hackathon |
| `src/stores/useBodyDebtStore.ts` | Compose `wallet-slice` into the store |
| `package.json` | Add `@tetherto/wdk`, `@tetherto/wdk-wallet-evm` |
| `.env.example` | Add WDK env vars |

## Deleted Files (CONSOLIDATION)

| File | Reason |
|---|---|
| `src/lib/squad-share-store.ts` | Replaced by Pears P2P (Phase 11, stretch) |
| `src/app/api/squad/share/route.ts` | Replaced by Pears P2P (Phase 11, stretch) |

These are only deleted if Phase 11 (Pears) is completed. Otherwise they
remain as-is.

## Core Principles Applied

- **ENHANCEMENT FIRST:** WDK payments extend the existing `SquadScreen`
  and `SquadPlayer` type. No new screen, no parallel type system.
- **CONSOLIDATION:** Cloud AI fallback is disabled for the Tether build.
  Less code, less risk.
- **PREVENT BLOAT:** WDK client is a single module (`src/lib/wdk/`) with
  three files. Payment UI is three components inside the existing
  `SquadScreen.tsx`, not a new screen.
- **DRY:** All WDK calls go through `src/lib/wdk/payments.ts`. No inline
  WDK imports in components or routes.
- **CLEAN:** WDK blockchain calls live in API routes only. Wallet state is
  a separate store slice. Client never sees the seed phrase.
- **MODULAR:** `src/lib/wdk/` is self-contained — no dependencies on the
  rest of the app. The app calls into it; it never reaches out.
- **PERFORMANT:** Payment state is lazy-loaded. Balance refresh is manual.
  WDK wallet init happens once on first API call, then cached.
- **ORGANIZED:** New domain folder `src/lib/wdk/` follows the existing
  pattern of `src/lib/contexts/`, `src/lib/blockchain/`, `src/stressors/`.

## Completed Phases (History)

### ✅ Phase 1: RecoveryContext type + config registry
### ✅ Phase 1.1: Stressor catalog consolidation
### ✅ Phase 1.2: Design tokens / inline hex sweep
### ✅ Phase 1.3: Zustand store slice pattern
### ✅ Phase 1.4: Zod schemas for SSE events
### ✅ Phase 2: Context-aware scoring
### ✅ Phase 2 extended: ContextProvider + vocabulary sweep + first-run mode picker
### ✅ Phase 3: Dashboard header diet + a11y + loader trim
### ✅ Phase 3 (original): Context-aware QVAC pipeline
### ✅ Phase 4 (original): Store + API wiring
### ✅ Phase 5 (original): Squad view (football mode)
### ✅ Phase 6 (original): UI theming + mode switching

See git history for details on completed phases.
