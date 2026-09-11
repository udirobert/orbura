# Motion & UX craft

Orbura’s distinctiveness comes from product metaphors — debt orbs, system
meters, inverted gauges, clinical dark surfaces — not from decorative chart
kits or marketing flourishes.

Polish those signatures. Do not replace them with a second visual system.

**Status (landed):** shared tokens + `MotionProvider`, `Collapse` across main
disclosures, Opening/page/sheet aligned, dither-kit spike rejected. See
[progress.md](./progress.md).

## Principles

1. **Own the metaphors.** `DebtOrb`, `DebtGauge`, system accents, and recovery
   timelines are the brand. Keep personality; only add reduced-motion paths.
2. **One motion grammar.** Shared tokens live in `src/lib/motion/protocol.ts`
   (Framer) and CSS vars in `src/app/globals.css` (`--ease-protocol`,
   `--ease-drawer`, `--duration-*`). Prefer these over ad-hoc easings.
3. **Collapse without layout thrash.** Expand/collapse uses
   `src/components/ui/collapse.tsx` (CSS `grid-template-rows`), not
   Framer `height: "auto"`. Rotate a single chevron; don’t swap icons.
4. **Reduced motion is required.** `MotionProvider` sets
   `reducedMotion="user"`. CSS durations zero out under
   `prefers-reduced-motion`. Infinite orb CSS loops are disabled there.
5. **Frequency gates delight.** Press feedback (`whileTap` ~0.97–0.98) is fine.
   Long bounce/scale entries are not — especially on screens users revisit.
6. **Hover only on fine pointers.** Gate hover color shifts with
   `[@media(hover:hover)]:hover:…` so touch doesn’t stick “hovered” styles.
7. **One icon vocabulary.** Every domain signal and wearable source has a
   canonical lucide glyph in `src/lib/signal-icons.ts` (`SIGNAL_ICONS`,
   `SOURCE_ICONS`). The icon carries the domain so text stays short — reuse
   these instead of picking per-file icons or emoji. (Showcase pages and the
   five body-system glyphs are exempt.)
8. **Touch feels physical.** Buttons squash-and-stretch via
   `useSquishProps()` (`TAP_SQUISH` + `SPRING_TAP` in `protocol.ts`) and tick
   on `pointerdown` via `haptic()` in `src/lib/haptics.ts`. Haptics are a
   safe no-op where the Vibration API is unsupported.

## Timing scale

| Token | Value | Use |
| --- | --- | --- |
| `--duration-collapse` | 220ms | Accordion open/close |
| `--duration-page` | 220ms | Route enter/exit |
| `--duration-drawer-open` | 250ms | Sheet open |
| `--duration-drawer-close` | 150ms | Sheet close (faster than open) |
| `EASE_PROTOCOL` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enters, collapses, page |
| `EASE_DRAWER` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets / drawers |

## Do / don’t

| Do | Don’t |
| --- | --- |
| Extend `protocol.ts` + CSS tokens | Invent per-file easings |
| Use `Collapse` for disclosures | Animate `height: "auto"` |
| Floor enter scales at ≥0.9 | `scale: 0` / pop-from-nothing |
| Keep Recharts for breakdown charts | Adopt dither/bloom chart kits |
| Short score count-ups (~0.8s) | Multi-second blocking count-ups |
| Preserve DebtOrb breath/turbulence | Flatten the orb to a static badge |

## Key files

| Concern | Path |
| --- | --- |
| Framer tokens + reveal variants + press physics | `src/lib/motion/protocol.ts` |
| Haptic feedback | `src/lib/haptics.ts` |
| Icon vocabulary (signals + sources) | `src/lib/signal-icons.ts` |
| App `MotionConfig` | `src/components/providers/MotionProvider.tsx` |
| Grid-rows accordion | `src/components/ui/collapse.tsx` |
| Page enter/exit | `src/components/PageTransition.tsx` |
| Sheet timing | `src/components/ui/sheet.tsx` |
| CSS tokens + PRM | `src/app/globals.css` |
