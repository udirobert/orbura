# Body Debt

Body Debt is evolving into a longitudinal intervention platform: turn fragmented
health signals into one safe action, learn what a person can sustain, and bring
a human care team in when judgment is needed.

The repository currently contains several product shells and technology
showcases built on shared recovery infrastructure:

- **Body Debt** — the original personal recovery product.
- **Match Fit** — football squad readiness and recovery.
- **Fan Recovery** — an experimental post-match recovery experience.
- **Care Companion** — the primary commercial direction for chronic care.
- **Showcases** — QVAC, Supermemory, SKALE/EZKL, WDK, and prior hackathon work.

QVAC, OpenAI, Supermemory, wearables, ZK/SKALE, WDK, and MCP are capabilities or
integrations, not peer modes in a patient experience.

## Current product direction

The first care-companion wedge is UK GLP-1 titration support:

> Help patients through the first 12 weeks of initiation and dose escalation,
> while helping digital clinics identify silent disengagement, persistent side
> effects, and cases that need human review.

The intended product is an adherence-rescue and care-continuity layer, not a
prescriber, diagnostic system, autonomous dose manager, or generic chatbot.
Deterministic policy owns safety and escalation; AI operates inside a
clinic-approved protocol; clinicians own diagnosis, prescribing, dose changes,
and alert resolution.

See [product strategy](docs/product-strategy.md) and
[target architecture](docs/architecture.md).

## Existing recovery platform

The current app logs lifestyle stressors, computes deterministic recovery debt
across five systems, and streams a personalized plan through a multi-stage
analysis pipeline. Optional capabilities include wearable data, browser-local
MediaPipe/EZKL processing, Supermemory retrieval, QVAC inference, and on-chain
proof anchoring.

Runtime location matters:

- MediaPipe feature extraction and EZKL proof generation run in the browser.
- In the hosted Next.js deployment, the QVAC worker runs on the server host as a
  child process; it is not browser-local.
- Supermemory calls are server-side and may target a configured local or hosted
  service.

## Supermemory integration

Memory context is retrieved before analysis and injected into triage and coach
prompts. The current recovery demo stores completed sessions, retrieves relevant
history, and lets users forget individual facts or reset memory.

The existing `outcome_signal` compares score changes and repeated advice. It is
useful experimental context, but it is not proof of adherence or causation. The
care product will store explicit intervention and outcome events in PostgreSQL,
with Supermemory used only as a derived retrieval index.

| Primitive | Where | Current use |
|---|---|---|
| `add()` | `POST /api/memory`, `logSession()`, `logOutcomeSignal()` | Logs actions and recovery-session summaries |
| `search()` / `profile()` | `GET /api/memory/context` | Retrieves profile facts and relevant memories |
| `forget()` | `DELETE /api/memory` | User-controlled single and mass forget |

Demo routes:

| Route | Purpose |
|---|---|
| `/coach-memory` | Side-by-side day-one and day-two recovery plans |
| `/preview` | Full labeled example dashboard, isolated from user data |
| `/evidence` | QVAC showcase |
| `/autoscientist` | AutoScientist showcase |
| `/tether` | Tether/Match Fit showcase |

## Architecture direction

The target is a modular monolith:

```text
product shells
  -> application use cases
  -> recovery and care domains
  -> narrow capability ports
  -> OpenAI/QVAC/Supermemory/wearable/privacy/payment adapters
  -> Auth.js/PostgreSQL/authorization/consent/audit platform
```

Existing `RecoveryContextConfig` variants remain useful for recovery products.
Chronic care receives its own product shell, roles, longitudinal data model, and
safety boundary rather than becoming another global mode.

## Quick start

```bash
bun install
bun dev
```

Verification:

```bash
bun run lint
bun run test
bun run build
```

## Documentation

- [Product strategy](docs/product-strategy.md)
- [Target architecture](docs/architecture.md)
- [Recent progress](docs/progress.md)
- [Deployment](docs/deployment.md)
- [Motion and UX](docs/motion-ux.md)
- [Face-scan reliability](docs/face-scan.md)
- [ZK pipeline](docs/zk-pipeline.md)
- [Supermemory showcase](docs/supermemory-demo.md)
- [Tether/Match Fit historical plan](docs/tether-cup-plan.md)
- [SKALE privacy showcase](docs/skale-privacy-demo.md)
- [Legacy materials](docs/legacy/)

## Repository shape

- `src/` — application, product UI, domains, and integrations.
- `contracts/` — Halo2/SKALE verifier contracts.
- `scripts/` — deployment, QVAC runtime, and artifact tooling.
- `docs/` — active strategy, architecture, operations, and showcase notes.
- `docs/legacy/` — archived hackathon notes.
- `hf-space/archive/` — historical Hugging Face experiments.
