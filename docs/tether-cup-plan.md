# Tether Developers Cup — Multi-Context Recovery Platform

## Competition

Tether Developers Cup, QVAC track. Theme: football + tournament moment.
All AI must run on-device through QVAC SDK, no cloud AI APIs.

## Strategy

Pivot from single-purpose "Body Debt" (personal health) to a **multi-context
recovery platform** where football ("Match Fit") is the headline demo mode and
personal health is the existing secondary mode. Additive, not replacing.

Pitch: *"Match Fit is the first context on a multi-context recovery platform
powered entirely by on-device AI. Scan a player, get a match-readiness score and
return-to-play protocol — no cloud, no API keys, works in a locker room with no
signal."*

## Architecture

```
                    +---------------------------------+
                    |   QVAC Multi-Agent Pipeline      |
                    |   (triage -> coach -> schedule)  |
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
```

## Implementation Plan — Status

### ✅ Phase 1: RecoveryContext type + config registry

- ✅ `RecoveryMode` type in `src/lib/types.ts`
- ✅ Football `StressorType` entries (`match_minutes`, `card_stress`, `travel_timezone`, `concussion_check`)
- ✅ `RecoveryContextConfig` interface
- ✅ `src/lib/contexts/personal.ts`, `football.ts`, `types.ts`, `index.ts` (`getContextConfig`)
- ✅ `RecoveryContext.tsx` — React context provider + `useRecoveryContext()` hook

### ✅ Phase 1.1: Stressor catalog consolidation

- ✅ Single `src/stressors/` domain folder (`types.ts`, `catalog.ts`, `scoring.ts`, `index.ts`)
- ✅ 10-stressor catalog with `RecoveryMode[]` filter (6 universal + 4 football-only)
- ✅ Single source of truth for STRESSORS, ACK_COPY, CONFIDENCE_CONFIG
- ✅ All scoring in one place (`computeSystemScores`, `computeCounterfactual`, etc.)
- ✅ Deleted `src/lib/stressor-scoring.ts` and `src/lib/systemScoring.ts`

### ✅ Phase 1.2: Design tokens / inline hex sweep

- ✅ Fixed WCAG A violation (`--color-text-muted`)
- ✅ Added `--color-text-faint` and `--color-text-disabled` for tertiary copy
- ✅ ~30 component files migrated from inline hex to CSS vars

### ✅ Phase 1.3: Zustand store slice pattern

- ✅ Three slices: `profile-slice` (persisted forever), `session-slice` (midnight expiry), `stream-slice` (ephemeral)
- ✅ Cross-slice coordination preserved

### ✅ Phase 1.4: Zod schemas for SSE events

- ✅ `src/lib/sse-schemas.ts` — Zod v4 schemas for all 10 SSE event types
- ✅ Validation in stream route — non-blocking, warns on mismatch

### ✅ Phase 2: Context-aware scoring (Phase 2 of tether-cup-plan)

- ✅ `computeSystemScores` accepts `mode` param
- ✅ Football-specific scoring logic for `match_minutes`, `card_stress`, `travel_timezone`, `concussion_check`
- ✅ `computeScore` in `score/route.ts` accepts and passes `mode`
- ✅ Football-specific `BASE_WEIGHTS` and `CONTEXT_MULTIPLIERS`

### ✅ Phase 2 extended: ContextProvider + vocabulary sweep + first-run mode picker

- ✅ React context provider wrapper in layout.tsx
- ✅ `useRecoveryContext()` hook throughout UI (DashboardScreen, SquadScreen, etc.)
- ✅ `mode === "football"` ternaries replaced with `ctx.supportsSquad` and vocabulary lookups
- ✅ Opening screen mode picker with two cards (Personal / Match Fit)

### ✅ Phase 3: Dashboard header diet + a11y + loader trim

- ✅ Two-row compact dashboard header, badges consolidated, pulsing dot removed
- ✅ Aria-labels, `aria-expanded`, `aria-modal`, `focus-visible` outlines, `aria-live` regions
- ✅ AnalysisLoader trimmed: social proof chip removed, science facts removed, spacing reduced

### Phase 4: QVAC cache + cloud flag + integration tests + parallel signals

- Cache QVAC weights between sessions
- `NEXT_PUBLIC_ENABLE_CLOUD_VERDICT` flag
- Integration tests for SSE pipeline
- Fan-out HRV + face-scan in parallel

### Phase 3 (original): Context-aware QVAC pipeline

- ✅ `MultiAgentInput` includes `mode: RecoveryMode`
- ✅ `scripts/qvac-worker.mjs` agent prompts use context-specific vocabulary
- ✅ Mode passed through stream route to worker

### Phase 4 (original): Store + API wiring

- ✅ `mode` in Zustand store, persisted
- ✅ `setMode` action
- ✅ `squad: SquadPlayer[]` in store
- ✅ `mode` in `AnalyzeBodyRequest`

### Phase 5 (original): Squad view (football mode)

- ✅ `SquadPlayer` type: id, name, position, stressors, faceAnalysis?, analysis?
- ✅ Squad management: add/remove players, scan each, see team readiness board
- ✅ Team readiness summary: fit to start / impact sub / out

### Phase 6 (original): UI theming + mode switching

- ✅ Mode toggle in header (`ModeToggle.tsx`)
- ✅ Context-aware vocabulary from `RecoveryContextConfig` in all screens
- ✅ Opening screen mode picker for first-time users

## Round Milestones

- **Round of 16 (July 8):** Football mode functional — scan a player, get
  match-readiness score + return-to-play protocol, all on QVAC. Personal mode
  still works.
- **Quarter-Finals (July 10):** 3-min demo video. Leads with football, 20s beat
  showing mode switch to personal. Edge-vs-Cloud timing panel.
- **Semi-Finals (July 12-13):** Pitch deck. Multi-context platform story.
- **Final (July 15):** Live demo squad view + face scan + agent trace.

## Files Created

| File | Purpose |
|---|---|
| `src/lib/contexts/index.ts` | Registry: `getContextConfig(mode)` |
| `src/lib/contexts/personal.ts` | Personal health context config |
| `src/lib/contexts/football.ts` | Football "Match Fit" context config |
| `src/lib/contexts/types.ts` | `RecoveryContextConfig` interface |
| `src/lib/contexts/RecoveryContext.tsx` | React context provider + hook |
| `src/stressors/types.ts` | Stressor domain types |
| `src/stressors/catalog.ts` | Stressor catalog definitions |
| `src/stressors/scoring.ts` | System scoring + counterfactual |
| `src/stressors/index.ts` | Barrel exports |
| `src/lib/sse-schemas.ts` | Zod schemas for SSE events |
| `src/stores/slices/profile-slice.ts` | Profile slice (persisted) |
| `src/stores/slices/session-slice.ts` | Session slice (midnight expiry) |
| `src/stores/slices/stream-slice.ts` | Stream slice (ephemeral) |
| `src/components/screens/SquadScreen.tsx` | Football squad management + readiness board |

## Known Follow-ups

- **Intake UI**: Football-specific stressors (`match_minutes`, `card_stress`,
  `travel_timezone`, `concussion_check`) are scored server-side and visible in the
  football context's stressor catalog. The intake screen now reads from the
  context catalog via `byMode(mode)` — already wired.
- **Squad player analysis flow**: Players can be added to the squad and the
  per-player scan flow (setActivePlayerId → intake → scan → analysis → store on
  player) is functional. Re-scan on existing player updates their analysis.
- **Demo script**: Update `docs/qvac-edge-ai-demo.md` to lead with football
  ("Match Fit") before showing personal mode.
