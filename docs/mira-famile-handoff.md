# Mira — Famile shared identity contract

**Status:** Superseded. The canonical network contract now lives at
`famile/web/docs/MIRA.md`. This file is kept as a historical handoff note;
for current posture vocabulary, voice, safety charter, orb spec, and tier
transitions, read the canonical doc.

The shared contract *code* still lives in this repo at
`src/lib/mira/contract.ts` until it is extracted to a private
`@famile/mira-contract` package. Keep it in sync with
`famile/web/docs/MIRA.md`.

The related voice direction is documented in
`../../famile/web/docs/VOICE_PLATFORM.md`. It covers reusable transport and event
patterns only; it does not add voice biomarkers or emotion inference to Mira.

---

## What was decided (historical)

Mira is the persistent personal agent identity across Famile health and
wellness products. Each product runs its own Mira instance with a common
visual/behavioural contract. There is no shared backend yet — Mira is a
shared *identity protocol*, not a shared service.

The contract is:

```
Famile Mira posture → visual form + motion + one-line copy
```

Each product renders Mira in its own material and palette, but reads from
the same posture vocabulary so users recognise Mira's grammar across
products.

## The shared contract

The canonical file is in this repo at:

```
src/lib/mira/contract.ts
```

**Copy it into each product:**

- **Ardum:** `src/agent/mira-contract.ts` (alongside the existing
  `mira-presence.ts`)
- **Sukari:** `domain/agent/miraContract.ts` (alongside the existing
  `miraPresence.ts`)

When the contract stabilises, migrate to a private `@famile/mira-contract`
npm package. Until then, keep the file in sync manually.

## Posture vocabulary

### Core (every product supports these)

| Posture | Breath | Intent |
|---|---|---|
| `steady` | 6000ms | Idle, default, no active task |
| `offering` | 4000ms | Something is ready for the user |
| `holding` | 7000ms | Deferred, non-binding — saved for later |
| `watching` | 5000ms | Attentive, waiting for the user's update |
| `completed` | 4500ms | Settled, done, logged |

### Extensions (product-specific)

| Posture | Product | Intent |
|---|---|---|
| `inquiry` | Ardum | Clarifying, processing input |
| `gathering` | Ardum | Coordination in flight (booking, inviting) |
| `resolving` | Ardum | Setback absorbed, re-forming |
| `adapting` | Sukari | Mission adjusted (made easier) after user feedback |

If a posture becomes useful across two products, promote it to the core
set. Keep extensions rare.

## What each product needs to do

### Ardum

Ardum already has the richest Mira implementation. The alignment work is:

1. **Adopt the shared contract.** Copy `contract.ts` into
   `src/agent/mira-contract.ts`. Update `mira-presence.ts` to import
   `MiraPosture`, `MiraPresence`, `MiraReactionKind`, `MiraActivity`,
   `MiraRenderTier` from the shared contract instead of defining them
   locally. Keep Ardum's 8 postures — they map cleanly:
   - `steady`, `offering`, `holding`, `watching`, `arriving` → core
     (rename `arriving` to `completed` to match the shared vocabulary)
   - `inquiry`, `gathering`, `resolving` → extensions (already in the
     shared contract)

2. **Rename `arriving` → `completed`.** This is the only breaking rename.
   The semantics are the same (commitment settled). Updating the enum
   value aligns Ardum with the shared vocabulary without changing
   behaviour.

3. **Add Famile positioning.** Ardum currently has zero references to
   Famile. Update `README.md`, `docs/product-vision.md`, and
   `src/app/layout.tsx` to reference Famile as the parent and Mira as
   the shared agent. Suggested footer copy: "Ardum is part of Famile.
   Mira helps across the suite."

4. **Move to `ardum.famile.xyz`.** Ardum is currently on
   `ardum.vercel.app`. Add a custom domain in Vercel and update
   `metadataBase` in `layout.tsx`.

5. **Keep Ardum's material.** The warm cream/terracotta palette, the 3D
   metaball orb, the contemplative register — all of this stays. The
   shared contract is about posture grammar, not pixels.

### Sukari

Sukari is already aligned on positioning (Famile references exist) and
has a working MiraOrb. The alignment work is:

1. **Adopt the shared contract.** Copy `contract.ts` into
   `domain/agent/miraContract.ts`. Update `miraPresence.ts` to import
   from the shared contract instead of defining `MiraPosture` locally.
   Sukari's 5 postures map to the core + one extension:
   - `offering`, `holding`, `waiting`, `completed` → core
     (rename `waiting` to `watching` to match the shared vocabulary)
   - `adapting` → extension (already in the shared contract)
   - Add `steady` as the default/idle posture (Sukari doesn't have it
     yet — it should, for the landing state)

2. **Rename `waiting` → `watching`.** Semantics are the same (attentive,
   waiting for update). This aligns Sukari with the shared vocabulary.

3. **Add `steady` posture.** Sukari's current 5 postures are all
   active states. Add `steady` for the landing/no-mission state so the
   orb isn't forced into an active posture when nothing is happening.

4. **Rebrand from `glucosewars` to `sukari`.** Same process Orbura went
   through with `bodydebt`. The legacy `glucosewars` identifier is still
   in:
   - `package.json` name
   - `app.json` slug and deep link scheme
   - AsyncStorage keys (`glucoseWars.playerProgress`,
     `glucoseWars.demoMaya`)
   - Deployed URL (`glucosewars.netlify.app`)
   - `netlify.toml` domain config
   - `domain/config/workerUrl.ts`
   - `ShareCard.tsx` share URL

   Storage keys need a migration path (read old key, write new key) so
   existing users don't lose progress. The deep link scheme change
   means old links break — consider a redirect or keep the old scheme
   as an alias.

5. **Move to `sukari.famile.xyz`.** Add custom domain in Netlify.

6. **Keep Sukari's material.** The dark clinical aesthetic, green/blue
   accents, translucent field orb — all stays. The shared contract is
   about posture grammar, not pixels.

### Orbura (this repo)

Orbura is the scoring engine. Mira fits as the presence that observes
stressors, computes debt, and remembers what worked. The mapping is in
`src/lib/mira/orbura-mapping.ts`:

| Orbura phase | Mira posture |
|---|---|
| Landing, no active session | `steady` |
| User logging stressors | `inquiry` |
| Score computed, prescription ready | `offering` |
| Recovery in progress | `holding` |
| Checking recovery timeline | `watching` |
| Recovery cleared | `completed` |

Orbura does not use `gathering`, `resolving`, or `adapting` yet. If
Orbura adds a setback flow later, it should use `resolving`.

The existing `DebtOrb` is a debt gauge, not an agent body. The
`orbPersonality` system (honest/gentle/scientific/sarcastic) is a voice
system, not a posture system. These can coexist with Mira:
- The `DebtOrb` remains the score visualisation (gauge).
- Mira's orb would be a separate, smaller presence — a "Mira field"
  beside the mission note or prescription, not a replacement for the
  debt gauge.
- The personality system maps to Mira's voice, not her postures.

## Voice guidelines

Mira's voice is consistent across products. The copy changes; the
register does not.

- Calm, observant, practical. Never urgent or theatrical.
- Short sentences. One idea per line.
- Third person: "Mira noticed…", "Mira is holding…", "Mira logged this."
- Never diagnoses, prescribes, or changes a medication dose.
- Never implies cross-product memory. Say "Mira in Sukari" if the
  boundary matters, not "Mira remembers from Ardum".
- The orb is decorative to screen readers. The `label` + `message` are
  the accessible source of meaning.

## Reduced-motion contract

When `prefers-reduced-motion` is active, Mira renders as a static,
luminous form. Posture is conveyed through:
- the textual label + message (always present, always accessible)
- a static color/shape per posture (no animation)

Never rely on motion alone to distinguish postures. All three products
already have `useReducedMotion` hooks — wire them into the Mira orb
rendering.

## What NOT to share

- **Pixels.** Each product keeps its own palette, material, and orb
  shape. The contract is posture grammar, not a component library.
- **Backend.** There is no shared Mira service yet. Each product runs
  its own Mira instance. Cross-product memory is a future migration,
  not a current promise.
- **Domain state.** Each product maps its own domain state to Mira
  postures. The mapping files (`orbura-mapping.ts`, Ardum's
  episode-status mapping, Sukari's world-state mapping) are
  product-specific and should not be shared.
