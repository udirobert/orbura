# Recent progress

Snapshot of craft + platform work landed together. Longer detail lives in the
linked docs.

## Product direction

**Decision:** evolve from a shared mode switcher into separate product shells on
a modular-monolith platform. Care Companion is the primary commercial direction;
its first wedge is adherence rescue during the first 12 weeks of UK GLP-1
initiation and dose escalation. Body Debt remains the recovery laboratory, Match
Fit remains a separate football product, and Fan Recovery plus hackathon pages
remain experimental/showcase surfaces.

Safety and escalation stay deterministic. OpenAI and QVAC are AI adapters,
Supermemory is a derived retrieval index, and PostgreSQL becomes the canonical
longitudinal record. See [product-strategy.md](./product-strategy.md) and
[architecture.md](./architecture.md).

## UX craft (motion grammar)

**Decision:** polish Body Debt’s existing metaphors (orbs, gauges, systems). Do
**not** adopt decorative chart kits (dither-kit) or ambient SFX (cuelume) as
defaults — they compete with the clinical product personality.

**Shipped:**

- Shared motion tokens (`src/lib/motion/protocol.ts` + CSS `--duration-*` /
  `--ease-*`) and app-wide `MotionProvider` (`reducedMotion="user"`)
- `Collapse` primitive (CSS grid-rows) replacing Framer `height: "auto"` on
  heatmap, history, MemoryCard, AgentTrace, SystemPanels, ConfidenceSignal,
  TimelineBand, StressorLedgerRow, Squad expands
- Page + sheet timing aligned; Opening entry softened onto `EASE_PROTOCOL`
- Dashboard score count-up shortened; press/hover gated more carefully
- Docs: [motion-ux.md](./motion-ux.md)

## Face scan reliability

Users reported scans failing after a good preview. Root causes were structural:

1. Confirm ran MediaPipe on an unmounted / stopped `<video>` after review
2. Retake remounted video but never restarted the detection loop
3. EZKL worker prefetch `{ success }` could be treated as a finished proof
4. Strict lighting/blur/distance often blocked Capture on normal phones

**Shipped:** still-frame extraction, detection restart on camera phase,
prefetch filtering + prove timeout, softer gates + “Capture anyway”, async
MediaPipe init + manual fallback CTA. Docs: [face-scan.md](./face-scan.md)

## Auth & persistence (platform)

Auth is **NextAuth.js (Auth.js v5)** — self-hosted; Eazo SDK stubs delegate to
it. Guest-first API routes still fall through when `requireAuth` is false.

**Guest upgrade (landed):** `GuestAuthCard` is a real sign-in CTA (not
“coming soon”). Dashboard shows locked heatmap / past-scores teasers that
route into `/auth/signin`. Preferences + squad sync still hydrate after login.

Also landed alongside this pass: user preferences sync, patterns hooks, squad
API/schema, memory migrate path, and related Drizzle migrations. Env template
documents `AUTH_SECRET`, `AUTH_URL`, email magic-link SMTP, and GitHub OAuth.

## Care Companion — clinic-enrolled check-ins and care record

**Decision:** the patient surface is now clinic-enrolled. A check-in only becomes
part of the care record once a clinic has assigned the patient, so the app
cannot promise a care-team response for an unassigned user.

**Shipped:**

- `carePatients.clinicId` is required to submit or view a care summary; routes
  return `403` with a clear message when the patient is not enrolled.
- `fastingGlucoseUnit` added to observations, schema, forms, API validation, and
  summary display (mg/dL or mmol/L).
- `currentDoseMg` and `startedAt` fields on `carePatients`, editable from the
  clinic admin enrolment flow.
- Patient summary now surfaces the clinic name, medication, dose, and treatment
  start date as a read-only care record.
- Recent intervention outcomes (completed / skipped) are shown to both patients
  and clinicians, forming a simple adherence trail between visits.
- `CarePage`, `CareSummaryPage`, `ClinicianPage`, and `ClinicAdminPage` redesigned
  around one clear next step and exception-oriented review.
- Updated test suites to match the new enrolment and outcome shapes; all
  care-related tests pass.
