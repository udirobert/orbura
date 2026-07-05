# QVAC Edge AI Hackathon — Demo Script (2 minutes)

This script has two modes. The first 60-90 seconds lead with the **football
("Match Fit")** context, which is the headline demo for the Tether Developers
Cup QVAC track submission. The remaining seconds show the **personal**
context to demonstrate the multi-context platform. See
`docs/tether-cup-plan.md` for the strategy.

If you're only demoing the personal context, skip the first half and start at
"0:30 — Personal Mode".

## Setup (before recording)

1. Open the live deployment at https://bodydebt.thisyearnofear.com in Chrome (Safari on iPhone for the mobile-camera demo)
2. Set the mode toggle in the header to **Match Fit** (football) — the default
3. Ensure you have **no other tabs open** (judges see your screen)
4. Open DevTools → Console so the QVAC progress logs are visible
5. Have a webcam ready (or hold your phone camera to the laptop screen)
6. **Open the DevTools Network tab** and filter to `/api/qvac/infer` — the judges will see the SSE events stream live, including `agent_start`, `agent_token`, and `agent_done` events
7. **Have `/evidence` open in a second tab** at https://bodydebt.thisyearnofear.com/evidence — close with it as the summary page

---

## 0:00–0:30 — Football Opening (Match Fit)

**Show:** The Match Fit dashboard with the squad readiness board populated for 4–5 players.

**Say:**
> *"This is Match Fit — the first context on a multi-context recovery platform powered entirely by on-device AI. No cloud, no API keys, works in the locker room with no signal. The manager scans each player; the on-device model scores their match-readiness across five body systems and streams a return-to-play protocol."*

**Show:** Tap "Scan" on a player. Open the intake screen with football-specific stressors: match minutes, card stress, travel fatigue, head impact.

**Say:**
> *"The intake takes 30 seconds. You log match minutes, training load, sleep, alcohol, and football-specific factors like timezone shift from travel or a yellow card. All of this feeds a deterministic physiological model on-device — no cloud call."*

---

## 0:30–0:50 — Face Scan + ZK Proof (the privacy layer)

**Show:** The face scan screen

**Say:**
> *"Here's where the privacy layer kicks in. The face scan extracts 468 facial landmarks using MediaPipe — all in the browser. Seven stress-relevant features are computed from those landmarks: eye aspect ratio, brow tension, mouth asymmetry. Then a zero-knowledge proof circuit runs in a Web Worker to prove the model was executed correctly on your real biometric data — without ever exposing that data."*

**Click:** Accept privacy → Open camera → "Capture & Prove"

**Show:** The proof lifecycle visual animates through 4 stages:
1. **Extract features** (green checkmark)
2. **Generate ZK proof** (circuit board animates)
3. **Cryptographic verify** (EZKL verify)
4. **SKALE commit**

**Say:**
> *"Watch the circuit board — each step lights up as it completes. The proof generates in 2-3 seconds, then verifies locally using EZKL's cryptographic engine. Total time: about 4 seconds. The cloud equivalent takes 6+ seconds and would send your biometric data to a server. We keep it here."*

---

## 0:50–1:20 — QVAC Multi-Agent Pipeline (the key demo)

**Show:** The analysis loader transitions to show live agent activity

**Say:**
> *"Now the QVAC edge AI pipeline kicks in. Four agents run sequentially on your device using Qwen3-1.7B quantized to Q4 — no cloud calls. The agent prompts are mode-aware — they speak match-readiness and return-to-play vocabulary in football mode, body debt and recovery vocabulary in personal mode."*

**Show:** The loader now displays live agent cards:
1. **Triage Agent** (active, token streaming) — analyzes the 5-system breakdown
2. **Recovery Coach Agent** (pending) — generates the 4-part prescription
3. **Schedule Agent** (pending) — produces a time-blocked recovery schedule
4. **Reflection Agent** (pending) — rewrites the Coach's prescription in the user's chosen voice

**Say:**
> *"Watch the green QVAC badge — 'Qwen3-1.7B · on-device'. The Triage Agent identifies which body system needs priority attention. Its output feeds the Coach Agent, which writes the player's protocol. The Schedule Agent turns that into a match-day plan. Then the Reflection Agent rewrites everything in your selected voice — honest, gentle, scientific, or sarcastic — without losing the specific actions. Each agent streams tokens live, and you can see exactly how long each one took."*

**Show:** The agents complete one by one, each showing a green checkmark and duration. The dashboard appears with:
- The Edge AI badge next to "MATCH FIT"
- The "Last verified on SKALE" pill if the face scan was completed (links to the SKALE Europa explorer)
- The Agent Trace panel (collapsible, showing all 4 agents, their durations, and QVAC source)
- The Match-Day Schedule from the Schedule Agent
- The Edge vs Cloud performance comparison bars (real measured timings)
- The Counterfactual callout — "What would change this"

---

## 1:20–1:40 — The Prescription + Agent Trace

**Show:** Scroll to the prescription screen

**Say:**
> *"This match-day protocol was generated by 4 QVAC agents running on your device. Tap the 'Multi-Agent Pipeline' panel to see exactly what happened: the Triage Agent identified Brain as the priority system, the Coach Agent wrote specific recovery actions, the Schedule Agent blocked out the player's day, and the Reflection Agent put it all in your voice. All on-device, all verifiable."*

**Show:** Expand the Agent Trace panel — judges see:
- Each agent's name, description, duration, and "QVAC local" source badge
- The triage output (PRIORITY / SECONDARY / AVOID)
- Total pipeline duration
- **Edge vs Cloud performance bars** — a green bar showing the total on-device pipeline time next to a red bar showing the parallel cloud verdict time. Judges see the exact "Nx faster" multiplier live.

**Say:**
> *"This bar is real — the cloud verdict runs in parallel with the QVAC pipeline, and we record both durations. On this run, edge finished in Nx the time of the cloud call. That's not a marketing claim; it's a measured comparison you can see on screen. The cloud call is labeled 'benchmark only' — it's there to prove the on-device path is faster, not to power the product."*

**Show:** Scroll to the counterfactual callout below the system panels

**Say:**
> *"Here's the counterfactual — a deterministic engine re-run with one variable flipped. 'If the player had slept 7+ hours, Brain debt would drop from 67 to 22.' This isn't an LLM. It's three minutes of math that converts a score into a lever. Managers screenshot this line."*

**Show:** Open the share card screen on a phone or second window

**Say:**
> *"The share card embeds the player's actual recovery arc — a 3-segment timeline showing Danger, Recovering, and Cleared states with the real time-to-cleared. Anyone who sees the share image sees a personalized protocol, not a generic score."*

---

## 1:40–1:55 — Personal Mode Switch

**Show:** Click the mode toggle in the header → switch to "Body Debt" (personal)

**Say:**
> *"Same engine, different context. The mode toggle swaps the stressor catalog, scoring weights, agent vocabulary, and UI copy. Personal mode adds alcohol, sleep, training, and stress. The same QVAC pipeline now speaks body debt and recovery language."*

---

## 1:55–2:00 — Close

**Show:** The Match Fit dashboard with Edge AI badge, on-chain SKALE pill, agent trace, match-day schedule, and squad readiness board

**Say:**
> *"Match Fit is the first context on a multi-context recovery platform powered entirely by on-device AI. Four agents, one local model, zero cloud calls. The locker room, the player's home, anywhere — your body, your data, your intelligence."*

**Show:** Open `/evidence` in a new tab — judges see the single-page summary with architecture diagram, agent pipeline timings, Edge vs Cloud benchmark, counterfactual, and fallback chain.

**Say:**
> *"That page is also at bodydebt.app/evidence — a single-page summary of everything we just walked through. Judges can screenshot it and have the whole story."*

---

## Key talking points for judges

| Topic | One-liner |
|---|---|
| **Why edge AI?** | "Four AI agents run on-device with zero data leaving the device." |
| **Multi-agent orchestration** | "Triage → Coach → Schedule → Reflection — sequential pipeline with structured outputs that feed each other." |
| **QVAC SDK** | "Qwen3-1.7B Q4 with TurboQuant KV-cache quantization via @qvac/sdk." |
| **Fork isolation** | "The LLM runs in `child_process.fork()` — if it crashes, your session doesn't." |
| **Real benchmarks** | "Each agent reports its own duration. Total pipeline time is visible in the UI. Edge vs Cloud bars show real measured timings, not estimates." |
| **Counterfactual engine** | "Deterministic re-run with one variable flipped. Not an LLM. Converts a score into the one change that would help most." |
| **Offline resilience** | "Cloud calls have 5s and 8s timeouts. When offline, deterministic fallbacks at every layer mean the user still gets a score, a prescription, and a schedule. The QVAC model caches locally after first download, so the pipeline works with no network." |
| **SKALE on-chain anchor** | "After the face scan, the ZK proof is committed on-chain via `HealthCredentialVerifier.verifyAndLogCredential` on SKALE Europa testnet. The dashboard surfaces a 'Last verified on SKALE' pill that links to the explorer." |
| **Reflection Agent** | "A 4th agent rewrites the Coach's prescription in the user's chosen voice (honest/gentle/scientific/sarcastic). Specific actions and quantities are preserved — only the tone changes." |
| **Localization** | "Deterministic fallback strings are translated into English, Spanish, and French. The QVAC pipeline runs in the user's language." |
| **ZK as privacy layer** | "The ZK proof verifies the face scan was real without exposing biometric data. It's the privacy layer for the edge AI." |
| **Continuous return loop** | "Sticky section nav, confidence explainer, progressive system reveal, and 'check back tomorrow' nudge close the loop." |

## Demo checklist

- [ ] QVAC model cached before recording (visit app once, let first inference complete — ~738MB downloads on first run, then cached at `~/.qvac/models/`)
- [ ] `bare` runtime installed on server (`which bare` returns a path)
- [ ] pm2 restarted after latest build (`pm2 restart bodydebt`)
- [ ] Face scan calibrated to current lighting
- [ ] Stressors pre-filled (don't burn 15s clicking)
- [ ] Browser zoom at 100% so the Agent Trace panel text reads on screen
- [ ] DevTools Network tab filtered to `/api/qvac/infer` for the SSE event narrative

## Pitfalls to avoid

- ❌ Don't spend more than 15 seconds on the intake flow — pre-fill stressors or have them ready
- ❌ Don't let the model download phase stall — ensure the QVAC model is cached before recording
- ❌ Don't skip the Agent Trace panel — this is the key differentiator for the multi-agent criteria
- ❌ Don't gloss over the Edge vs Cloud bars — they're measurable proof of the performance claim
- ❌ Don't skip the counterfactual — it's the highest-leverage line in the UI and the cheapest "wow"
- ❌ Don't skip the 4th agent — the Reflection Agent is what pushes you from "multi-agent" to "deeply orchestrated"
- ❌ Don't ignore the SKALE on-chain pill — judges increasingly look for verifiable privacy claims
- ✅ Do point out the "Edge AI" badge on the dashboard — it proves QVAC was used
- ✅ Do expand the Agent Trace panel so judges see all 4 agents and their timings
- ✅ Do mention the schedule output from the Schedule Agent — it's a tangible multi-agent result
- ✅ Do point at the confidence tier badge and tap it to show the inline explanation
- ✅ Do mention offline mode: kill wifi and re-run the analysis to demonstrate the deterministic fallback chain
- ✅ Do flip between languages (EN/ES/FR) on the dashboard to show the i18n coverage
- ✅ Do open `/evidence` as the closing tab — it's the cheat sheet judges can keep
