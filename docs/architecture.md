# Target architecture

## Direction

Use a modular monolith. Keep one repository and deployable application while
making product, domain, application, integration, and platform boundaries
explicit.

```text
Product shells
  Body Debt | Match Fit | Fan Recovery | Care Companion | Showcases
        |
Application use cases
  assessment | daily plan | adherence | escalation | clinician summary
        |
Domains
  recovery | observations | care plans | interventions | outcomes | safety
        |
Ports
  AI planner | summarizer | memory index | measurement source | notifier
        |
Adapters
  OpenAI | QVAC | Supermemory | Terra | Google Fit | Garmin | EZKL/SKALE | WDK
        |
Platform
  Auth.js | PostgreSQL | organizations | authorization | consent | audit
```

Delivery code in `src/app/` authenticates and validates requests, invokes an
application use case, and renders or streams the result. Domain code does not
import Next.js, Drizzle, OpenAI, QVAC, Supermemory, Terra, SKALE, or WDK.

## Product boundaries

The existing `RecoveryContextConfig` remains useful for variants that share the
same recovery workflow. It is not the model for chronic care. Care Companion has
different users, roles, data, safety requirements, and journeys and therefore
receives a separate product shell and domain.

Long-term route ownership:

```text
/                 Body Debt or the current primary product
/match-fit        football readiness
/fan-recovery     experimental fan experience
/care             chronic-care companion
/showcase         hackathon and technology demonstrations
```

The mode switcher may remain in demonstrations during migration. It must not
appear inside the patient care experience.

## Incremental source layout

New code should move toward this shape without a big-bang file migration:

```text
src/
  app/                         Next.js delivery layer
  products/
    body-debt/
    match-fit/
    fan-recovery/
    care-companion/
  domain/
    recovery/
    observations/
    care-plans/
    adherence/
    outcomes/
    safety/
  application/
    assessments/
    coaching/
    escalations/
    clinician-summaries/
  integrations/
    ai/openai/
    ai/qvac/
    memory/supermemory/
    wearables/
    privacy/
    payments/wdk/
  platform/
    auth/
    db/
    organizations/
    authorization/
    consent/
    audit/
    notifications/
```

Existing modules are migrated when touched. Compatibility exports are preferable
to a large mechanical move.

## Domain records

`debt_sessions` remains the record for the existing recovery product. Chronic
care uses explicit longitudinal records:

- organizations and organization memberships;
- patient profiles and optional linked login accounts;
- care programs, protocol versions, and enrollments;
- observations and measurements with source, unit, time, confidence, and
  provenance;
- interventions and intervention events;
- care-plan versions;
- alerts and resolution state;
- clinician summaries;
- consent and retention records;
- audit events;
- analysis runs with model and policy provenance.

A score is a derived view, not the primary record. Persist the observation IDs,
algorithm version, and safety-policy version used to produce it.

## AI responsibilities

### Deterministic policy

Owns red flags, escalation thresholds, contraindication checks, allowed action
classes, required clinician review, and output validation.

### OpenAI adapter

Owns structured longitudinal synthesis, selection and explanation of an allowed
action, message classification, and clinician summaries. Responses are parsed
through versioned Zod schemas before use.

### QVAC adapter

Owns private or offline low-risk coaching where the runtime is genuinely local,
and may provide graceful non-clinical fallback. In the hosted Next.js app the
QVAC worker runs on the server host; it must not be described as browser-local.

### Human clinical team

Owns diagnosis, prescribing, dose changes, alert resolution, and authorization
of clinical protocols.

Each analysis run records provider, model, model version, instruction version,
safety-policy version, relevant input IDs, validated output, and human edits.

## Memory

PostgreSQL is canonical. Supermemory is an optional derived retrieval index.
Write structured observations, interventions, and outcomes to PostgreSQL before
indexing safe summaries. Losing or disabling Supermemory must not erase the
patient record.

Clinical outcomes require explicit events such as offered, accepted, completed,
declined, not possible, helpful, not helpful, improved, or worsened. A future
score change alone is correlation, not confirmed adherence or causation.

## Capability placement

- **OpenAI and QVAC** are AI adapters behind narrow use-case interfaces.
- **Supermemory** is a retrieval adapter, not the health record.
- **Terra, Google Fit, and Garmin** are measurement-source adapters.
- **MediaPipe and EZKL** are browser privacy/attestation capabilities and are
  optional in care journeys.
- **SKALE** anchors proofs only when a real verifier needs an attestation; never
  place identifiable health data on-chain.
- **WDK** belongs to Match Fit and must leave the global product state over time.
- **MCP** remains an authenticated experimental integration surface.
- **Eazo-named shims** are compatibility code scheduled for gradual replacement
  by explicit auth, AI, memory, and notification modules.

Avoid a universal `execute(any)` capability registry. Prefer narrow interfaces
whose names preserve product intent: `CarePlanGenerator`,
`ClinicianSummarizer`, `MemoryIndex`, `MeasurementSource`, and `Notifier`.

## Safety, privacy, and trust

- Never store face images, raw pixels, or full landmark arrays.
- Never let an LLM suppress or downgrade a deterministic clinical alert.
- Validate external webhook signatures before accepting observations.
- Encrypt sensitive credentials and tokens at rest.
- Scope every clinical query by organization, subject, and role.
- Audit clinically relevant reads and mutations.
- Support retention, export, correction, and deletion workflows.
- Describe browser-local, server-local, and third-party processing accurately.
- Assess UK GDPR, clinical-safety, and medical-device obligations from the
  product's intended claims before a live clinical pilot.

## Migration sequence

1. **Truth and containment** — correct runtime claims, enforce type checking,
   verify webhooks, expose unavailable integrations honestly, and separate
   showcase capabilities with flags.
2. **Application boundaries** — extract orchestration from route handlers and
   introduce narrow AI, memory, wearable, and notification ports.
3. **Care foundation** — add organizations, roles, enrollments, observations,
   interventions, outcomes, alerts, consent, and audit records.
4. **GLP-1 vertical** — build the dose-day check-in, daily symptom check, one
   allowed action, explicit outcome feedback, deterministic escalation,
   clinician exception queue, and summary.
5. **Pilot readiness** — complete threat modeling, privacy operations, clinical
   governance, observability, customer discovery, and success metrics.

Do not introduce microservices until independent scaling, isolation, deployment,
or team ownership creates a demonstrated need.
