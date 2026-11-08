# Starknet Seed Grant — Application Draft

Program: Starknet Seed Grants (up to $25K STRK, non-dilutive, rolling).
Apply at starknet.questbook.app → "Starknet Foundation Grants".
Review ~1 month; KYC + grant agreement after selection.

Eligibility check: MVP/PoC ✅ (working on-chain verification), building on
Starknet tools ✅ (Garaga verifier, Cairo, sncast/scarb), no hackathon
participation — not required (criteria are "and/or").

Fill `⟨…⟩` placeholders before submitting.

---

## Project name

Orbura — privacy-preserving health credentials on Starknet

## One-line description

Orbura turns camera-based wellness check-ins into longitudinal health
interventions, with every verified measurement anchored by a zero-knowledge
credential on Starknet — proving a wellness state without revealing the
underlying biometrics.

## What are you building?

Orbura is a longitudinal health-intervention platform. Its first commercial
product supports patients in their first 12 weeks of GLP-1 treatment
(semaglutide/tirzepatide), where nausea, dehydration, and autonomic fatigue
peak during dose escalation — and most patients don't own wearables.

The camera becomes the sensor: an opt-in check-in measures breathing rate,
pulse, and HRV-derived signals in ~45 seconds via rPPG — no video is ever
recorded or uploaded. The derived feature vector feeds a small on-device
model whose output is proven in zero knowledge.

On Starknet, we verify that proof on-chain via Garaga's RISC Zero Groth16
verifier: the journal commits only `{model_id, score, healthy,
sha256(features)}` — the raw facial features never leave the prover. The
result is a durable, verifiable wellness credential that anchors the user's
longitudinal record and can be shown to clinicians as provenance, not just
self-report.

## Proof of concept — already live on Starknet Sepolia

- **Statement proven:** the same 7→16→8→1 stress MLP the production EZKL
  circuit evaluates, reimplemented as a RISC Zero zkVM guest (Rust,
  `no_std`), weights embedded from `model.onnx`.
- **Privacy boundary:** 7 facial features are private inputs
  (`env::read`); only model id, score bits, healthy flag, and
  `sha256(features)` are committed to the journal.
- **On-chain verification:** real Groth16 seal verified through Garaga's
  Cairo verifier — wrapper contract `OrburaCredential` at
  `0x05f4425f540974a2ec9a0146fc41a08e017ccc77f755db2487970c3c9dc492d1`,
  tx `0x04267e499ef5ad8d640101afa15b2f525358f854fcc8e7ab2aefe07c1abf4afe`
  (SUCCEEDED / ACCEPTED_ON_L2, ~3.0 STRK fee).
- **Proving pipeline:** GitHub Actions on `ubuntu-latest` (Groth16 needs
  x86_64 + Docker) regenerates proofs deterministically; artifacts are
  versioned in-repo.
- **Product integration:** verified credentials persist to Postgres
  (`zk_credentials`) and surface in the adaptive Today decision — patient,
  clinician, and auditor views render the same deterministic decision with
  cryptographic provenance attached.

## Why Starknet specifically

- Starknet is the most ZK-native major L2 — our core claim ("prove wellness
  state without revealing inputs") is the exact problem STARK/native
  verification ecosystems are built for.
- Garaga's maintained RISC Zero verifier let us verify Groth16/BN254 seals
  without porting proving systems — we contribute a real consumer-health
  use case for their verifier stack.
- Long-term: credential verification events map naturally to Starknet's
  account abstraction and cheap L2 fees for high-frequency check-ins.

## Milestones (3-month grant period)

1. **Month 1 — Productionize the credential flow.** Move camera-vitals
   check-ins through the RISC Zero guest (not just the fixture input);
   per-user proving pipeline with cost budget; credential write path for
   both SKALE (EZKL) and Starknet (RISC Zero) unified in `zk_credentials`.
2. **Month 2 — Clinician-facing provenance.** Care Companion clinician
   timeline shows verified-vs-self-reported distinction; audit density
   renders rule + inputs + on-chain proof for every adaptive decision.
3. **Month 3 — Mainnet-ready testnet soak + docs.** Sustained Sepolia
   proving cadence, prove-cost telemetry, public demo of the
   patient→decision→credential loop; developer docs for the guest program.

## Budget ask

⟨Recommend: $15–25K STRK⟩. Rough allocation:

- Proving infrastructure (Bonsai GPU proving or dedicated prover host): ~40%
- Contract audit / Cairo review of the OrburaCredential wrapper: ~20%
- Frontend integration + clinician surfaces: ~20%
- Community/education content (dev.to technical write-ups, workshop): ~20%

## Team

- ⟨Name⟩ — founder, full-stack + ZK pipelines (built EZKL→SKALE and
  RISC Zero→Starknet verification end-to-end)
- ⟨Name⟩ — second developer, health-product frontend
- Advisors: ⟨optional⟩

Links: github.com/udirobert/orbura · orbura.famile.xyz ·
docs/starknet-direction.md (full technical decision record)

## Ecosystem contribution

- Open-source RISC Zero guest proving a real-world health-ML statement —
  a reference implementation others can adapt (guest + weights export +
  CI proving workflow are all in-repo).
- Stress-tests Garaga's verifier at consumer-check-in cadence and feeds
  version-compatibility findings back (we hit and documented the
  risc0-v2-vs-v3 verifier-class mismatch).
- Positions Starknet as the verification layer for a consumer health
  category (GLP-1 adherence, camera vitals) that has no crypto-native
  incumbent.

---

## Submission checklist

- [ ] Fill placeholders (names, budget figure, advisor)
- [ ] Log into starknet.questbook.app with the applicant wallet
- [ ] Paste answers; attach repo link
- [ ] KYC + grant agreement if selected
