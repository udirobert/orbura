# Recent progress

Snapshot of craft + platform work landed together. Longer detail lives in the
linked docs.

## Face-scan honesty + gating (2026-08-30)

**Credibility hardening** for the ZK face-scan pipeline: the cryptography is
real, but the 7 facial-geometry features are unvalidated heuristics — so we
stopped over-claiming and started instrumenting for validation.

- **New [face-scan-science.md](./face-scan-science.md):** per-feature literature
  table (EAR is validated for drowsiness only; brow/mouth ratios are weak or
  ad hoc), explicit claims-we-make vs. don't-make, and a validation roadmap
  (longitudinal capture → correlation → retire/refine circuit features).
- **Demo copy softened:** `skale-privacy-demo.md` no longer claims a "neural
  network stress score" — it says facial-tension features → experimental
  heuristic score, with a pointer to the science doc.
- **Feature extraction now test-locked:** `face-mesh-features.test.ts` (13
  tests) verifies EAR/brow/mouth math against hand-computed geometry, plus
  scale invariance (the property the EZKL circuit depends on), asymmetry
  handling, degenerate inputs, and 3D distance behavior.
- **Anatomy explorer gated:** `/anatomy` renders an unavailable notice unless
  `NEXT_PUBLIC_ANATOMY_ENABLED=true` (models are unlicensed pending review).
  Static import restored; no `require` hack.

**Next steps (in order):**

1. Send the licensing request email to thebuggeddev/anatomy — the flag makes
   shipping safe either way, but the email is the actual unblock.
2. Migrate MediaPipe FaceMesh → Tasks Vision (`@mediapipe/tasks-vision`,
   ESM-friendly, typed `FaceLandmarker`), validated by the new feature tests
   to confirm identical feature output; removes the runtime-`require` hack.
3. Property tests for `src/stressors/scoring.ts`: bounds, monotonicity,
   `hasData` contract, and modifier-table coverage via canonical input matrix.
4. Move judge pages (`/evidence`, `/autoscientist`, `/tether`) under a
   `/showcases/` prefix so the main product flow touches none of them.
5. Start longitudinal feature-vector capture (no images, PostgreSQL canonical)
   so the validation roadmap in face-scan-science.md can produce data.

## MediaPipe Tasks Vision migration + scoring property tests (2026-08-30)

- **MediaPipe FaceMesh → Tasks Vision** (`@mediapipe/tasks-vision`): ESM
  import, proper types, no more runtime `require`/globalThis hack. Legacy
  `onResults`/`send({image})` surface preserved via a `FaceMeshAdapter`
  wrapper, so `use-face-scan-pipeline.ts` behavior is unchanged. Model
  (`face_landmarker.task`) and WASM are self-hosted under `public/mediapipe/`.
  `extractStressFeatures` untouched — the feature tests prove the circuit
  boundary is unchanged. Legacy `@mediapipe/face_mesh` and
  `@mediapipe/camera_utils` removed from dependencies.
- **Scoring property tests** (`scoring-properties.test.ts`, 12 tests):
  bounds (0–100), finiteness, `hasData` contract, monotonicity in alcohol
  count, mobility-clamping behavior, circadian penalty ordering + unparseable
  input safety, live-score bounds, and counterfactual drop/null invariants —
  over a canonical input matrix spanning every modifier table row.
- Suite now at **430 tests / 33 files**, all green. Build compiles.
- **Deployed** to nuncio-vultr via `scripts/deploy.sh`; pm2 online, app 200,
  model asset serving at `/mediapipe/face_landmarker.task`. One manual camera
  smoke test of the scan flow in a real browser is still worth doing —
  automated coverage covers feature math and build integrity, not live WASM
  init.

**Still open from the earlier list:** move judge pages (`/evidence`,
`/autoscientist`, `/tether`) under `/showcases/`, and start longitudinal
feature-vector capture for the face-scan validation roadmap.

## Product direction

**Decision:** evolve from a shared mode switcher into separate product shells on
a modular-monolith platform. Care Companion is the primary commercial direction;
its first wedge is adherence rescue during the first 12 weeks of UK GLP-1
initiation and dose escalation. Orbura remains the recovery laboratory, Match
Fit remains a separate football product, and Fan Recovery plus hackathon pages
remain experimental/showcase surfaces.

Safety and escalation stay deterministic. OpenAI and QVAC are AI adapters,
Supermemory is a derived retrieval index, and PostgreSQL becomes the canonical
longitudinal record. See [product-strategy.md](./product-strategy.md) and
[architecture.md](./architecture.md).

## UX craft (motion grammar)

**Decision:** polish Orbura’s existing metaphors (orbs, gauges, systems). Do
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

## Care Companion — closed-loop pilot workflow

**Decision:** patients and clinicians now close the loop on every recommended
action and escalation, with a required audit trail for clinical decisions.

**Shipped:**

- Patients can mark an intervention `completed` or `skipped`, choose a
  structured outcome (`helped`, `too_hard`, `side_effect`, `no_time`), and add
  an optional short note.
- Clinicians must add a review note before marking an escalation `resolved` or
  `clinic_reviewed`; every action writes an immutable row to
  `care_audit_logs` (actor, clinic, patient, target, action, reason,
  timestamp).
- New `/care/clinician/patient/[patientId]` timeline shows observations,
  interventions, escalations, and clinical review notes for authorised
  clinicians only.
- `ClinicianPage` now previews recent patient outcomes and links into the
  longitudinal record.
- New migration `0009_tearful_silver_surfer.sql` adds `care_audit_logs` plus
  `outcome_code` and `outcome_note` to `care_interventions`.

## Wearable measurement-source adapters

Extended the Garmin and Apple Health measurement-source adapters to accept
user-owned exports, keeping live Terra and Google Fit in place.

- **Garmin .FIT parser** (`src/app/api/garmin/parse/route.ts`):
  - Accepts `{ csvText }` for the legacy HRV CSV and `{ fitBase64 }` for
    binary `.FIT` files.
  - Uses `fit-file-parser` to read HRV status summaries, resting heart rate,
    and sleep levels.
  - Maps extracted data into the existing `HRVData` shape with
    `source: "garmin_fit"`.
  - Updated `src/components/screens/garmin-upload.tsx` to branch between CSV
    text and FIT binary input.

- **Apple Health `export.zip` parser**
  (`src/components/screens/apple-health-upload.tsx` and
  `src/app/api/apple-health/parse/route.ts`):
  - Unzips the user's `export.zip` in the browser with `fflate`, extracts the
    `export.xml`, and sends only that XML to the server.
  - Server streams the XML with `sax` and pulls `HKQuantityTypeIdentifier*` and
    `HKCategoryTypeIdentifierSleepAnalysis` records.
  - Derives HRV (SDNN), resting heart rate, and sleep-stage minutes without
    requiring a third-party conversion app.
  - Added `apple_health` to `HRVSource` and the HRV device picker.

Type check passes with `bun x tsc --noEmit`.
