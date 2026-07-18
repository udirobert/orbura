# Supermemory Demo Flow

> **Status:** Recovery-memory showcase. In the care architecture, PostgreSQL is
> canonical and Supermemory is a derived retrieval index. The current score
> delta/repeated-advice signal is correlation, not confirmed adherence or
> causation. See [target architecture](./architecture.md).

This script walks through the before/after contrast that makes the
Supermemory integration visible. The key narrative: **a recovery coach
without memory is a calculator. With memory, it's infrastructure that
shapes behavior across sessions.**

## Setup

| URL | What it shows |
|---|---|
| `https://bodydebt.thisyearnofear.com/coach-memory` | Static day 1 vs day 2 prescription comparison |
| `https://bodydebt.thisyearnofear.com/preview` | Full labeled example dashboard (day 2 with memory) |

Pre-seeded data lives under the `demo-bodydebt-seed` container tag — two
analysis sessions showing a recurring sleep-debt pattern.

Locally: `bun dev`, then open `/coach-memory` or `/preview`.

Legacy `?demo=1` URLs redirect to `/preview`.

## Demo script (90 seconds)

### Act 1 — The problem (0-15s)

**Narration:** "Every recovery app gives you the same generic advice every time. Drink water. Get sleep. We built something different."

**On screen:** Opening screen → tap *See how your coach learns over time* → `/coach-memory` side-by-side.

**Action:** Point at day 1 (generic) vs day 2 (`from memory` chips on caffeine, walk, alcohol).

### Act 2 — The memory layer (15-45s)

**Narration:** "Body Debt uses Supermemory as cross-session infrastructure. On session 2, the coach recalls your history before the agents run."

**On screen:** Open `/preview` or run a real second session.

**Action:** During analysis, show the loader badge driven by the real `memory_recall` SSE event — "Recalling N things your coach knows."

**Key moment:** Expand the agent trace panel. Show memory context injected into triage + coach prompts.

### Act 3 — The personalized prescription (45-70s)

**Narration:** "Memory shaped the output — not just the prompt. Each prescription line is tagged `from memory` or `new today`."

**On screen:** Prescription screen → attribution chips + "Why this prescription" callout.

**Action:** Dashboard → "Remembers you" badge → expand "Your coach remembers" card.

### Act 4 — The closed loop (70-90s)

**Narration:** "After each session, we log an outcome signal — did debt move? did the coach repeat prior advice? That's how memory becomes infrastructure, not a dump."

**On screen:** Mention outcome signals in memory card facts after a second real session, or cite the API below.

**Action:** Show per-fact forget on prescription (real sessions only — disabled in `/preview`).

**Closing:** "Body Debt — recovery coaching with memory that learns from outcomes. Built on Supermemory."

## Key differentiators

1. **Memory shapes behavior.** Injected into QVAC triage + coach agents; prescriptions change measurably.
2. **Outcome feedback loop.** `logOutcomeSignal()` logs debt delta + echoed advice after each session.
3. **All three primitives.** `add()`, `profile()`/`search()`, `forget()` — curated, not a dumping ground.
4. **User-controlled memory.** Per-fact forget, mass-forget, example mode isolated from real data.
5. **Visible causality.** Attribution chips, agent trace, real SSE recall — users see *why* advice changed.

## Memory loop (architecture)

```text
Session N-1: logSession() stores prescription + score
Session N:   profile() + search() → inject into agents → personalized prescription
After N:     logOutcomeSignal() logs debt delta + echoed prior advice
Session N+1: recall includes outcomes, not just inputs
```

Implementation: `src/lib/supermemory/outcome-signals.ts`, wired in
`/api/analyze/stream` before `logSession()`.

## Pre-seeded data

Two sessions seeded to `demo-bodydebt-seed`:

| Session | Score | Key stressors | What it shows |
|---|---|---|---|
| 1 | 52 | Poor sleep (5h), work stress | Baseline |
| 2 | 64 | Poor sleep (4h), alcohol (3 beers), work stress | Recurring pattern + new factor |

## API verification

```bash
# Memory health
curl -s "https://bodydebt.thisyearnofear.com/api/memory/status?containerTag=demo-bodydebt-seed" | jq .

# Recall for demo container
curl -s "https://bodydebt.thisyearnofear.com/api/memory/context?containerTag=demo-bodydebt-seed&q=body+debt" | jq .

# Store a new memory
curl -s -X POST "https://bodydebt.thisyearnofear.com/api/memory" \
  -H "Content-Type: application/json" \
  -d '{"containerTag":"demo-bodydebt-seed","content":"User viewed dashboard","event_type":"page_view"}'

# Forget all memories (demo container only — do not run on real users)
curl -s -X DELETE "https://bodydebt.thisyearnofear.com/api/memory" \
  -H "Content-Type: application/json" \
  -d '{"containerTag":"demo-bodydebt-seed","all":true}'
```
