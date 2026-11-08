# Starknet Direction & Grant Strategy

Decision (Nov 2026): shift the on-chain credential strategy's *ecosystem focus*
toward Starknet, primarily to unlock non-dilutive grants. This doc records the
opportunity, the technical gap, and the recommended path.

## Why Starknet

- **Starknet Seed Grants** — up to **$25K in STRK**, non-dilutive, rolling,
  aimed at early-stage teams with an MVP/PoC. Apply via
  starknet.questbook.app. No equity, no deadline — the most attainable
  crypto grant found for our stage.
- **Ecosystem fit** — Starknet is the most ZK-native major L2; our
  privacy-preserving credential story (prove wellness state without revealing
  inputs) is on-thesis for them. Judges/grant reviewers will get it instantly.
- **Growth Grants** ($25K–$1M STRK) exist for later-stage teams with live
  products — a possible Series-A-shaped follow-on.

## The technical gap (be honest about this)

Our current pipeline is **EVM + Halo2**:

```text
MediaPipe → 7-dim features → EZKL (Halo2/BN254) proof →
HealthCredentialVerifier.sol (Solidity) → SKALE testnet
```

Starknet is **not EVM-compatible** and verifies **STARKs over its own field**,
not Halo2/BN254 proofs. Consequences:

- `HealthCredentialVerifier.sol` cannot deploy on Starknet — it would need a
  Cairo rewrite.
- EZKL proofs cannot be verified on Starknet — the proving system itself is
  incompatible. "Porting" is not a contract migration; it's a proving-system
  migration.

### Realistic options

1. **RISC Zero zkVM → Starknet via Garaga (chosen path).** RISC Zero emits
   **Groth16 proofs over BN254** — the same curve family our EZKL pipeline
   already uses — and **Garaga ships maintained Cairo verifier contracts for
   RISC Zero on Starknet**. So no STARK port is needed: we port only the
   *statement* (the 7→16→8→1 MLP forward pass) into a Rust guest program,
   prove it with the RISC Zero zkVM, and verify the seal on Starknet through
   Garaga's contract. This is a much smaller gap than a proving-system
   migration.
2. **EVM-L2 grant path (parallel fallback).** Ink Spark ($500–20K USDC,
   rolling), Unichain (up to $7.5K), Base Builder Grants (up to $5K, Season 2
   open). Our existing Solidity + EZKL pipeline deploys almost as-is on any
   EVM L2. Smaller money but near-zero porting cost — run in parallel.
3. **SP1 alternative.** SP1 also has a Garaga verifier path; evaluate only if
   RISC Zero tooling hits a wall. Prefer RISC Zero first — Groth16/BN254
   matches our existing curve and verifier-contract familiarity.
4. **Wait-and-see on Solidity-on-Starknet.** Starknet has been moving toward
   Solidity support; if/when native Solidity lands, our verifier ports
   directly (though the Halo2-vs-STARK proof mismatch remains regardless).

## Recommended path

- **Phase 0 (now, cheap):** apply to an **EVM-L2 grant** (Ink Spark or Base
  Builder Grants) with the existing deployment — deploy
  `HealthCredentialVerifier` on the target L2 testnet first (bounded work,
  `deploy-standalone.mjs` exists). Grant budgets thin toward round end, so
  apply early.
- **Phase 1 — zkVM spike:** write a **RISC Zero guest in Rust** reproducing
  the EZKL circuit's statement — the 7→16→8→1 MLP forward pass with weights
  embedded as constants generated from `model.onnx`. Commit only
  `{model_id, score, threshold_bool}` to the journal. Verify a real seal
  locally end-to-end.
- **Phase 2 — Starknet testnet PoC:** instantiate Garaga's RiscZero verifier
  on Starknet Sepolia, submit a real seal, emit the credential event. Measure
  prover cost (RISC Zero proving is heavier than EZKL — record prove time
  and RAM so the UX story stays honest).
- **Phase 3 — grants:** apply to **Starknet Seed Grants** with the working
  PoC + Orbura demo.
- Keep SKALE deployment live — it's the working demo; grants don't require
  abandoning it.

### Privacy boundary in the zkVM design (decide deliberately)

- RISC Zero `env::read` inputs are bound privately into the execution trace;
  only `env::commit` output lands in the public journal. The guest should
  read the 7 facial features as **private inputs** and commit only the
  derived score/threshold result — never the raw features.
- If a feature *commitment* is needed for audit, commit `sha256(features)`
  rather than the features themselves.
- This preserves the existing privacy story: prove wellness state without
  revealing inputs.

## Action items

- [ ] Decide EVM-L2 fallback target (Ink vs Base vs Unichain) and deploy
      verifier testnet instance
- [ ] Apply to chosen L2 grant (rolling — do early, budgets thin at round end)
- [x] Research zkVM→Starknet verification paths — **done**: Garaga maintains
      Cairo verifier contracts for RISC Zero (Groth16/BN254) on Starknet
- [x] Spike RISC Zero guest proving the 7-dim MLP statement (Phase 1) —
      done: `zkvm/` workspace, guest commits
      `{model_id, score_bits, healthy, sha256(features)}`, features private;
      local receipt verifies, score matches ONNX output, ~43s CPU prove
      (dev profile)
- [x] Verify seal on Starknet Sepolia via Garaga (Phase 2) — **done**
  (Nov 8, 2026). A real RISC Zero Groth16 proof of the stress-MLP statement
  was verified on-chain through Garaga's Cairo verifier.

  **On-chain artifacts (Starknet Sepolia):**
  - `OrburaCredential` wrapper: class `0x47360ace…d83b`, deployed at
    `0x05f4425f540974a2ec9a0146fc41a08e017ccc77f755db2487970c3c9dc492d1`
    (declare tx `0x0371d02b…`, deploy tx `0x06192f1b…`)
  - Source-built Garaga verifier (garaga main `d97b4d3`, risc0-zkvm 3.0.6):
    class `0x1c4078b1a732111b25cbe827b4829d24cfc7664539fc8d511171e9b78910ac3`
  - Source-built UniversalECIP (same commit): class
    `0x20dc39fc30f4d62db17cc86a911f1f27135d255357ce99d3b40e2da78f800dd`
  - Verification tx `0x04267e49…`: **SUCCEEDED / ACCEPTED_ON_L2**,
    `credentials_verified() == 1`, `last_journal_len() == 140`,
    `StressCredentialVerified` event emitted, fee ≈ **3.0 STRK**.
  - Proof artifacts: `zkvm/artifacts/proof.json` (seal/image_id/journal)
    and `zkvm/artifacts/calldata.json` (2095 felts incl. length prefix),
    produced by `.github/workflows/zkvm-prove.yml` on `ubuntu-latest`
    (Groth16 proving needs x86_64 + Docker; M3/arm64 can't run it locally).

  **Version-compatibility lesson (important):** the *released* Garaga v1.1.0
  class hash `0x41d5e111…` targets **risc0 v2.2.2** (control root
  `0xCE52…`) and rejects v3 proofs — our first invoke reverted with
  `Invalid proof`. The fix was declaring the verifier built from garaga
  `main` (`d97b4d3`), whose constants match risc0-zkvm **3.0.6**
  (control root `0xA54D…`). Rule: **zkvm version, garaga_rs rev, Cairo
  verifier source, and Cairo/scarb/snforge versions must all come from the
  same garaga commit**; the sample app's `sdk_parameters_match_the_v3_cairo_verifier`
  test enforces this upstream.

  Account used: existing OZ account `sonicguardian`
  (`0x23e62ffc…55df`) on Starknet Sepolia via sncast accounts file
  `~/.starknet_accounts/orbura_sepolia.json` (not committed).
- [x] Apply to Starknet Seed Grants once PoC verifies on Starknet testnet
      — **draft ready**: `docs/starknet-grant-application.md` (Nov 8, 2026);
      PoC exceeded the gate — live credential record flows through
      `/api/today` auditor density
- [ ] Monitor esp.ethereum.foundation for ESP wishlist items (none open as of Nov 2026)

## References

- Starknet grants: https://www.starknet.io/grants/ · Seed via
  https://starknet.questbook.app/
- L2 grant comparison: https://www.web3grant.com/guides/ethereum-layer-2-grants
- EF ESP: https://esp.ethereum.foundation/ (Wishlist/RFP only, currently none)
- Presage challenge (separate track): `docs/presage-challenge.md`
