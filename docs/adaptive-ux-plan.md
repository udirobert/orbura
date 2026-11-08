# Adaptive UI/UX — Implementation Plan

Companion to `docs/adaptive-ux.md` (research). This is the build plan:
what exists, what's missing, and the order to build it. Guiding rule from
the research: **the UI is an intervention surface** — every screen should
resolve to one question and reveal depth on demand.

## What already exists (verified in code)

| JITAI component | Existing asset |
|---|---|
| Intervention option | `pickInterventionAction` in `src/lib/db/queries/debt-sessions.ts` — extracts today's/thisMorning/rightNow action from a session prescription |
| Follow-through loop | `GET /api/interventions/latest` + `POST /api/interventions/respond` + `setSessionAdherence` — unanswered prior-session actions surface with HRV before/after outcome |
| Pattern detection | `getUserPatterns` — trend direction, best/worst system, day-of-week pattern, streaks; feeds `formatPatternsForPrompt` for AI + `MemoryCard` UI |
| Care loop | `src/products/care-companion/` (CarePage, CareCheckInForm/Result, ClinicianPage, ClinicianPatientPage, ClinicAdminPage), `/api/vitals/check-in`, `/api/care/check-in`, `care_audit_logs` |
| Honest-data flag | `SystemScore.hasData` distinguishes "clear" from "never assessed" |
| Context system | `RecoveryContextConfig` per mode (personal/football/fan) — scoring weights, vocabulary, agent prompts |
| ZK trust artifact | EZKL/SKALE credential flow + new RISC Zero/Garaga Starknet path (`zkvm/`) |
| Preferences store | `user_preferences` table + `src/lib/db/queries/user-preferences.ts` |

**The gap is presentation-layer adaptivity**: every user sees the same screens
at the same density regardless of state, phase, role, or channel.

## Phase A — Adaptive "Today" surface (highest leverage)

One state-driven home surface that answers *"What do I do today?"* and
nothing else by default.

**Backend:**
- New `GET /api/today` aggregator returning a `TodayState`:
  ```ts
  {
    mode: RecoveryMode,
    phase: "glp1-titration" | "stable" | "off-plan" | null,  // from care records
    pendingIntervention: { action, sessionId, date } | null, // reuse getPendingIntervention
    primarySignal: { kind: "camera" | "wearable" | "manual", freshness } | null,
    headline: { stateWord, deltaVsBaseline, source },
    actions: Action[] // max 1 primary + ≤2 secondary
  }
  ```
- Decision rules live in a pure function `src/lib/today/decision-rules.ts`
  (deterministic, unit-testable — same philosophy as the safety policy;
  the LLM never picks the primary action).
- Inputs: pending intervention, care phase, latest vitals (camera/wearable),
  `getUserPatterns` output, `hasData` per system, time-of-day.

**Frontend:**
- `src/components/screens/TodayScreen.tsx` — Tier-0 card: state word +
  one action + one "why" line. Tiers 1–2 expand in place (progressive
  disclosure, Oura model).
- Route: make `/` (or `/dashboard`) render TodayScreen for the personal
  context; Match Fit/Fan keep their own configs via `RecoveryContextConfig`.

**Adaptivity rules (v1):**
| Condition | Primary surface |
|---|---|
| Pending unanswered intervention | "Yesterday's action — did it happen?" + outcome |
| GLP-1 titration weeks 1–4 | Side-effect check-in + today's dose action |
| Camera vitals fresh (<24h) | Vitals delta vs baseline + optional re-scan |
| Streak at risk / worst-day pattern | Protect-the-streak action |
| `hasData:false` everywhere | Onboarding: first check-in CTA, not empty charts |

## Phase B — Role-density rendering (the showcase piece)

Same decision, three densities — patient / clinician / auditor.

- Extract the `TodayState` into a render-agnostic model; build three
  surfaces over it:
  - **Patient**: state word + action (Phase A).
  - **Clinician** (`/care/clinician/*`): exception queue + audit timeline —
    already partially exists; align it to the same `TodayState` model.
  - **Auditor/verifier**: credential card showing model ID, score, healthy
    flag, `sha256(features)` digest, and chain proof link (SKALE tx /
    Starknet tx `0x04267e49…`). This is the "UI proves its own claims"
    differentiator.
- Deliverable: one demo route (e.g., `/preview/adaptive`) rendering all
  three densities side-by-side for the grant/demo narrative.

## Phase C — Pattern surfacing (relatability)

- `getUserPatterns` already computes trend/system/day-of-week — surface it:
  - "Pattern" strip on TodayScreen when confidence is sufficient
    (≥2 sessions/day-of-week, ≥3 sessions trend).
  - Extend to care domain: dose-day vs side-effect-day correlation,
    camera-vitals deviation vs check-in scores.
- Copy rule: patterns are phrased as observations ("HRV runs ~8% below
  baseline on clinic days"), never causal claims — consistent with the
  wellness/no-diagnosis framing.

## Phase D — Channel adaptivity (later)

- Companion menu-bar/tray: same `TodayState`, glanceable density.
- iOS/Android widget: state word + one action.
- Clinician digest: daily email/push of exceptions only.
- Gate: only after Phase A proves the decision-rule model; notifications
  inherit the audit-trail requirement of care actions.

## Explicit non-goals (v1)

- No LLM-chosen primary actions — deterministic rules only.
- No receptivity modeling / push notifications yet.
- No new product modes — adaptive layers sit *inside* existing
  `RecoveryContextConfig` boundaries (Care Companion stays separate).
- No diagnostic claims in pattern copy.

## Build order & verification

1. `decision-rules.ts` + unit tests (pure, no I/O) — verify rule matrix.
2. `/api/today` + `TodayScreen` behind the personal context; verify
   pending-intervention and GLP-1-phase branches with seeded sessions.
3. Role-density preview route — screenshot-worthy demo artifact.
4. Pattern strip — verify `hasData` gating and copy rules.

Estimated surface area: 1 API route, 1 pure rule module + tests,
1 screen component, 1 preview route, small query additions. Reuses
existing tables — no schema changes required for v1.
