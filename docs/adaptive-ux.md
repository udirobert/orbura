# Adaptive UI/UX — Research & Orbura Design Direction

Status: research synthesis (Nov 2026). Goal: make Orbura's interface *adaptive*
in the academic sense — the right surface, at the right time, for the right
person — not merely personalized theming.

## 1. What the research says

### The JITAI framework (the correct mental model)

"Just-in-Time Adaptive Interventions" is the established scientific framework
for exactly what Orbura is building: *the right type/amount of support, at the
right time, only when needed.* Four components (Nahum-Shani et al., 2014–2018;
PMC5364076, PMC6351973):

1. **Decision points** — moments when the system decides whether/how to intervene
   (check-in opened, wearable sync landed, dose day arrived, risk threshold crossed).
2. **Intervention options** — the menu of things the system can deliver
   (one safe action, education card, escalation prompt, rest-day suggestion,
   clinician notification).
3. **Tailoring variables** — the dynamic signals that drive the decision
   (HRV trend vs personal baseline, camera-vitals deviation, missed doses,
   side-effect logs, time-in-phase, receptivity/context).
4. **Decision rules** — protocolized if-then logic mapping variables → options.

Orbura already has most of this *in backend form*: the deterministic safety
policy is a decision-rule engine, `camera_vitals`/wearable observations are
tailoring variables, and "one safe action" is the intervention option. What's
missing is treating **the UI itself as an intervention surface** — the same
decision point should be able to change *what the user sees*, not just what the
backend does.

### Three kinds of adaptation (systematic review, 2025)

- **Adaptability** — user-controlled: user picks density, chooses which signals
  matter, customizes tiles/check-ins.
- **Adaptivity** — system-controlled: UI changes automatically with context
  (state, time, device, risk).
- **Hybrid (recommended)** — system proposes, user confirms/overrides.
  Pure adaptivity in health UI erodes trust; pure adaptability puts the
  burden of knowing what matters on the patient. Orbura should be hybrid:
  deterministic rules drive defaults, users can pin/dismiss/promote signals.

### Best-in-class product patterns

- **Oura (Instrument redesign)** — three-tier data depth: at-a-glance rings →
  focused metrics → deep exploratory views; unified *semantic color language*
  tied to personal baselines, not population norms; "one big thing" daily focus.
- **WHOOP** — strict progressive disclosure: Overview (3 numbers answering
  "how should I train today?") → week trends → raw biometrics for the 15% who
  want them. Recovery score *generates* the day's strain target — the UI
  output is an action budget, not a report.
- **Levels** — "show the pattern before the number": state named in plain
  words ("Spiking", "Recovering") at the center of a ring of readings; one
  number, one chart, one question per screen.
- **Wovi (GLP-1)** — single timeline unifying weight/food/meds/side-effects/
  glucose; *pattern detection* ("nausea peaked day 2, resolved day 5 —
  consistent with your last 3 dose increases"); ask-your-data questions.
- **Phasio / MeAgain / MyNetDiary GLP-1** — dual-role patient+practitioner
  views in one app; <90s weekly check-in; side-effect tracking is
  user-customizable; clinician-ready summaries for appointments.

Common thread: **none of them lead with data. They lead with a state, a
pattern, or an action — and let depth reveal itself on demand.**

## 2. What Orbura already has (don't rebuild)

| JITAI component | Existing Orbura asset |
|---|---|
| Decision points | check-in flow, `/api/vitals/check-in`, `/api/care/check-in`, dose schedule, wearable syncs |
| Intervention options | "one safe action" engine, recovery schedule, escalation workflow |
| Tailoring variables | stressor catalog + `computeSystemScores`, `camera_vitals` wearable observations, HRV pull, GLP-1 phase/dose state, `hasData` honesty flag |
| Decision rules | deterministic safety policy + exception-only clinician view |
| Personal baselines | longitudinal store, trend panels, ZK-verified wellness credential |
| Access surfaces | web app, Orbura Companion (Electron), share card, `/care/clinician/*` |

The gap is **presentation-layer adaptivity**: today every user sees the same
screens with the same density. The backend knows *who* you are (context, phase,
trend, risk) but the UI doesn't act on it.

## 3. Design direction — "one surface, many densities"

### Principle: the interface answers one question per state

Following Levels/WHOOP: each surface should resolve to a single question —
*"What do I do today?"* (patient), *"Who needs me?"* (clinician),
*"Is this claim true?"* (verifier/auditor). Depth is opt-in, never default.

### Concrete adaptive surfaces

1. **Adaptive home ("Today")** — the dashboard becomes state-driven:
   - GLP-1 week 1–2 titration → lead with side-effect check-in + today's dose
     action, not recovery metrics.
   - Stable adherence weeks → lead with baseline-vs-today delta and streak.
   - `hasData: false` systems already hide honestly — extend that pattern:
     *never* render a panel the user's data can't support.
   - Camera-vitals available → offer the 45s check-in as the primary action;
     unavailable → manual fallback is equally first-class, not a degraded mode.

2. **Progressive disclosure tiers** (Oura model, mapped to our data):
   - Tier 0: one card — state word + one action ("Steady", "Ease today").
   - Tier 1: system scores vs personal baseline, trend sparklines.
   - Tier 2: raw vitals, camera waveforms, ZK verification details.
   Users unlock tiers by engagement; clinicians/auditors can deep-link any tier.

3. **Pattern surfacing (Wovi model)** — the longitudinal record's killer
   feature: "Your nausea peaked 2 days after each of your last 3 dose
   increases" / "HRV runs ~8% below baseline on clinic visit days." This is
   where adaptivity becomes *relatable* — patterns in your own data, not
   population statistics.

4. **Role-adaptive surfaces** — same account, different UI by role:
   patient sees actions; clinician sees exception queue + audit timeline;
   auditor/verifier sees the ZK credential + journal digest. Care Companion
   already separates roles in the backend — the UI should mirror that
   boundary, never blend it.

5. **Channel adaptivity** — the decision point shouldn't require opening the
   app: Companion menu-bar glanceable state, iOS/Android widget (one number +
   one action), clinician digest. Each channel shows the *same* decision-rule
   output at its own density.

### The showcase opportunity (scalability + relatability)

The ZK credential is a differentiator no competitor has: **the UI can prove
its own claims.** Adaptive surfaces can expose verification depth as a
feature — "this baseline is cryptographically verified, here's the proof" —
turning privacy architecture into a trust UI. For grants/demos, a surface
that shows *the same decision rendered at patient / clinician / auditor
densities* demonstrates both the product thesis and the engineering in one
screenshot.

## 4. What to research next / open questions

- Receptivity modeling: JITAIs gate interventions on *receptivity* (is now a
  good moment?). We have context signals (time of day, recent engagement,
  camera availability) — worth a small decision-rule study before adding
  notification-style delivery.
- Notification vs in-app: pushing "one safe action" externally raises the
  stakes of the deterministic policy — needs the same audit trail as care
  actions.
- Measurement: define which adaptive behaviors we can A/B or at least
  instrument (action completion rate, check-in latency, escalation precision)
  before building the full matrix.

## References

- Nahum-Shani et al., "Just-in-Time Adaptive Interventions (JITAIs) in Mobile
  Health" — PMC5364076; "Where Are We Now" — PMC13217361
- "An expandable approach for design and personalization of digital JITAIs" —
  PMC6351973
- "Adaptive user interfaces in systems targeting chronic disease: systematic
  review" — doi.org/10.21203/rs.3.rs-2634008/v1
- Oura app redesign — instrument.com/work/oura-app; ouraring.com/blog/new-app-design
- WHOOP teardown — 925studios.co/blog/whoop-design-breakdown
- Levels UX — viktor.design/projects/designing-the-mobile-ux-for-real-time-glucose-monitoring
- Wovi — glp1companion.io; Phasio — contra.com/p/PFgZWZ26; MeAgain — screensdesign.com
