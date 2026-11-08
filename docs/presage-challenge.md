# Presage SmartSpectra SDK Challenge

DEV challenge entry. Source: https://dev.to/events/143 (`#presagechallenge`)

## Facts

- **Runs:** Nov 4 – Nov 22, 2026. Submissions due **Nov 22, 11:59 PM PST** (Nov 23, 07:59 UTC). Winners announced Dec 10.
- **Prompt:** "Best Overall Human-Sensing Experience" — build a working experience with the Presage SmartSpectra SDK that responds meaningfully to real-time human signals captured through a camera.
- **Prize categories (can win overall + both):**
  - Most Creative or Delightful Use
  - Best Thoughtful Real-World Use (usability, consent, responsible data handling)
- **Prizes:** $300 × 10 winners (4 overall + 3 + 3), DEV++ membership, badges.
- **Rules:** solo, 18+, one entry. Must integrate SmartSpectra SDK and use ≥1 live signal (pulse, breathing rate, HRV, expressions). Public repo + DEV post + setup instructions + demo video required. Judges verify SDK use via repo + video.
- **Not allowed:** diagnosis/treatment claims, medical decision-making, covert/non-consensual monitoring.
- **Judging:** use of underlying technology, usability/UX, originality/creativity.
- **API:** Presage free trial, no extra credits; limits → Presage Discord.

## SmartSpectra SDK

Docs: https://smartspectra.presagetech.com/docs — repo: github.com/Presage-Security/SmartSpectra
Agent skill: `npx skills add Presage-Security/SmartSpectra --skill using-smartspectra`
MCP server: https://mcp.presagetech.com/mcp (can fetch API key, register app, search docs)
Dev portal (API keys): Presage Developer Admin Portal

Signals: pulse/pleth waveform, pulse rate, HRV, breathing rate + waveforms,
myofacial analysis (iris tracking, blink, talk detection, expression
classification), relative BP waveform, built-in quality/confidence metrics.

Platforms: Android (Kotlin, minSdk 28), iOS (Swift, 17+), C++ (Win/macOS/Linux),
Node.js/Electron (Node 20+, Electron 28+). Auth: API key (all) or OAuth (mobile).

**Wellness disclaimer on all SDK metrics** — not FDA-cleared, no diagnosis/treatment.
Aligns with our existing wellness (not clinical) framing.

## Entry concept

Guided daily "check-in" experience: explicit camera consent → live vitals
(pulse, HRV, breathing) → signal-quality feedback → a personal baseline/nudge card.
Reuses our privacy UX (`PrivacyBadge` consent states, on-device processing,
nothing uploaded) — the differentiator for "Best Thoughtful Real-World Use".

Open question for spike: does the Node.js SDK run in a plain browser/Next.js page,
or does it require Electron/native camera access? Determines app shell.

## Deliverables checklist

- [x] API key from Presage Developer Portal (or via MCP)
- [x] Working app using ≥1 live signal
- [x] Public repo (https://github.com/udirobert/orbura)
- [x] Setup instructions (showcases/presage-smartspectra/README.md)
- [x] Demo video: https://youtu.be/qh4MoSaLfSI (85s cinematic showcase with wide↔macro choreography, rPPG science, and narration)
- [x] DEV post published: https://dev.to/papajams/orbura-a-camera-check-in-that-becomes-a-baseline-presage-smartspectra-sdk-challenge-3ljm
- [x] Camera consent flow + data-handling disclosure in app and post

## API key & credit budget

- Key lives in `showcases/presage-smartspectra/.smartspectra-key`
  (chmod 600, gitignored) or `SMARTSPECTRA_API_KEY` env.
- `scripts/build-renderer.mjs` injects it as an esbuild `define` at bundle
  time — the key is never in committed source. `dist/` is gitignored.
- **Metering: 100 credits ≈ 50 min of live measurement (1 credit = 30s).**
  Be sparing: build/test UI with the SDK stopped; keep verification
  sessions short; prefer the SDK's video-file input for repeatable tests.
  Do not leave `npm start` running unattended.

## Status

- [x] Challenge spec captured (this doc)
- [x] SDK spike: Electron + `@smartspectra/node-sdk` confirmed; sample vendored
      at `showcases/presage-smartspectra/`, key injection wired
- [x] Live measurement verified: SDK reached `Running`, breathing readout
      produced (~7–9 BR/min); pulse needs the cardio toggle (key may not be
      provisioned for it). ~3 credits spent total across smoke tests.
- [x] App build (Orbura check-in): consent → guided scan → result card,
      full design-language port (fonts, tokens, motion, MiniOrb, system
      accents, one-safe-action card). Verified via Playwright smoke.
- [x] Electron teardown fixed: deferred destroy + graceful close handler;
      verified clean exit after a live session.
- [x] Vitals → Orbura bridge: `POST /api/vitals/check-in` stores
      breathing/pulse/HRV as `camera_vitals` wearable observations with
      baseline deltas; result card has opt-in "Save to Orbura".
- [x] Demo video + DEV post:
      - 85-second film on YouTube: https://youtu.be/qh4MoSaLfSI
      - Published DEV.to article: https://dev.to/papajams/orbura-a-camera-check-in-that-becomes-a-baseline-presage-smartspectra-sdk-challenge-3ljm
      - Complete hackathon milestone achieved. Next: Phase 2 Core Product Integration.
