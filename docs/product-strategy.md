# Product strategy

## Company thesis

Body Debt is evolving from a multi-mode recovery demo into a longitudinal
intervention platform: turn fragmented health signals into one safe action,
learn what a person can sustain, and bring a clinician in when human judgment is
needed.

The platform may support several products, but they are not modes of one
user-facing health experience:

- **Body Debt** — the original personal recovery product and consumer laboratory.
- **Match Fit** — a separate football readiness product.
- **Fan Recovery** — an experimental football-fan recovery product.
- **Care Companion** — the primary commercial direction for chronic care.
- **Showcases** — hackathon evidence for QVAC, Supermemory, SKALE, and WDK.

QVAC, OpenAI, Supermemory, wearables, EZKL/SKALE, WDK, and MCP are capabilities
or integrations. They are not products and should not appear as peer modes in a
patient experience.

## Beachhead

The first care-companion wedge is deliberately narrow:

> Help UK patients through the first 12 weeks of GLP-1 initiation and dose
> escalation, while helping digital clinics identify silent disengagement,
> persistent side effects, and cases that need human review.

This is not a generic GLP-1 tracker, chatbot, prescriber, or dose-adjustment
system. It is an adherence-rescue and care-continuity layer between scheduled
clinical contacts.

### Patient job

- Understand whether today's experience is expected or needs help.
- Receive one manageable next action from the clinic-approved care plan.
- Avoid repeating history at every contact.
- Reach the care team when a deterministic safety rule requires escalation.

### Clinic job

- See exceptions rather than another dashboard of every patient.
- Resolve routine friction without consuming clinician time.
- Detect disengagement and concerning symptom patterns earlier.
- Enter reviews with a concise, attributable timeline of observations,
  interventions, adherence, and outcomes.

## Core product loop

```text
Clinic enrolls patient at treatment start
  -> patient completes a low-friction check-in
  -> deterministic policy evaluates safety and escalation
  -> AI selects and explains one allowed intervention
  -> patient records whether it was attempted and what happened
  -> care team sees only exceptions and scheduled summaries
  -> clinic measures safe continuity, workload, and outcomes
```

The system must distinguish a confirmed outcome from correlation. A later score
change or repeated recommendation is not proof that an intervention was
followed or effective.

## Product principles

1. **One action, not an information dump.** The primary patient surface is the
   next manageable action, with conversation as an escape hatch.
2. **Safety is deterministic.** LLMs may synthesize and explain inside a
   clinic-approved protocol; they do not suppress alerts, diagnose, prescribe,
   or change medication doses.
3. **Humans handle exceptions.** AI should reduce routine workload and improve
   escalation quality, not imitate a clinician.
4. **PostgreSQL is the record.** Retrieval systems may index canonical records
   but never become the only store of clinically meaningful facts.
5. **Evidence before claims.** Scores and biomarkers are estimates unless
   validated for the intended use. The clinical product avoids unsupported
   precision and diagnostic language.
6. **Progressive disclosure.** Wearables and richer inputs are optional. A
   patient can obtain value without a face scan, wallet, blockchain, or lengthy
   onboarding flow.
7. **Privacy claims are literal.** Browser-local, server-local, and third-party
   cloud processing are described accurately and separately.
8. **Separate products, shared platform.** Product-specific workflows and data
   remain explicit; shared identity, design, observations, AI ports, and audit
   infrastructure are reused.

## Distribution and business model

The initial distribution model is B2B2C. A digital clinic enrolls the patient as
part of treatment rather than relying on consumer app-store acquisition.

```text
Prescribing workflow
  -> default companion enrollment
  -> better patient continuity and clinician exception routing
  -> outcome and workload report
  -> clinic expands enrollment across eligible patients
  -> later employer, payer, or provider distribution
```

Start with a design-partner pilot and per-active-patient pricing. Outcome-linked
pricing should follow only after a baseline is established. The commercial goal
is not medication persistence at any cost; it is **clinically appropriate
continuity**: a patient continues safely or receives timely human review instead
of silently disappearing.

## Measures

Primary product measure:

- **Safe supported-treatment weeks** — scheduled treatment weeks that either
  continue within protocol or receive appropriate, timely human escalation.

Supporting measures:

- check-in and intervention completion;
- unresolved side-effect duration;
- silent-disengagement recovery;
- time from deterministic alert to clinical review;
- routine contacts avoided or shortened;
- clinically appropriate 12-week program continuity.

## Expansion path

```text
GLP-1 titration rescue
  -> full obesity-treatment adherence
  -> metabolic risk and prediabetes
  -> type 2 diabetes support
  -> broader cardiometabolic care
```

Expansion happens after the wedge demonstrates patient value, clinical safety,
and a repeatable distribution channel.

## Not now

- A universal chronic-condition platform.
- Medication prescribing or autonomous dose changes.
- Public health-score leaderboards or viral patient sharing.
- A required face scan or wearable connection.
- Blockchain as a substitute for consent, clinical evidence, or compliance.
- Microservices, separate repositories, or extracted packages before separate
  teams and scaling constraints justify them.
