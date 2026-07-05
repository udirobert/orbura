# Body Debt

Body Debt is a recovery intelligence app focused on two active tracks:

- SKALE programmable privacy: prove the face-scan and scoring steps without exposing raw biometric data.
- Tether Developers Cup: ship a football Match Fit experience with on-device QVAC reasoning and WDK-backed squad payments.

The app logs lifestyle stressors, computes deterministic physiological debt across five systems, and streams recovery guidance through an on-device QVAC pipeline. The SKALE path adds zero-knowledge proof generation and on-chain verification for the face-scan flow.

## Current focus

- Privacy-preserving health verification on SKALE
- Football / match-readiness flows for the Tether Cup
- On-device AI for recovery coaching, scheduling, and explainability

## Documentation

- [docs/tether-cup-plan.md](docs/tether-cup-plan.md) — strategy and implementation notes for Tether.
- [docs/skale-privacy-demo.md](docs/skale-privacy-demo.md) — demo flow for the SKALE privacy story.
- [docs/deployment.md](docs/deployment.md) — deployment, HTTPS, and runtime notes.
- [docs/zk-pipeline.md](docs/zk-pipeline.md) — ZK artifact workflow and on-chain verification.

## Repo shape

- [src/](src/) — main app, UI, QVAC pipeline, and SKALE client logic.
- [contracts/](contracts/) — Halo2/SKALE verifier contracts.
- [scripts/](scripts/) — active deployment and runtime helpers.
- [archive/legacy-gradio/](archive/legacy-gradio/) — historical root-level Gradio prototype scripts.
- [docs/legacy/](docs/legacy/) — archived notes for older hackathon tracks.
- [hf-space/archive/](hf-space/archive/) — historical Hugging Face experiment scripts.
- [scripts/legacy/](scripts/legacy/) — preserved historical deployment / audit scripts.

## Quick start

```bash
bun install
bun dev
```

## Legacy materials

Older hackathon notes and scripts are archived in [docs/legacy/](docs/legacy/) and [scripts/legacy/](scripts/legacy/). They remain available for reference, but the active launch plan now centers on SKALE and Tether.
