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

1. **RISC Zero / SP1 (STARK-based zkVM) → Starknet.** Prove the same
   "features satisfy threshold" statement in a zkVM that emits a STARK, then
   verify on Starknet (directly or via a verifier bridge such as the
   RISC Zero/SP1-on-Starknet integrations). Keeps the privacy story, changes
   the prover. Medium effort — new circuit/proof pipeline, reuse the public
   inputs.
2. **EVM-L2 grant path instead.** Ink Spark ($500–20K USDC, rolling),
   Unichain (up to $7.5K), Base Builder Grants (up to $5K, Season 2 open).
   Our existing Solidity + EZKL pipeline deploys almost as-is on any EVM L2.
   Smaller money but near-zero porting cost — could run *in parallel* with
   the Starknet work as a fallback.
3. **Wait-and-see on Solidity-on-Starknet.** Starknet has been moving toward
   Solidity support; if/when native Solidity lands, our verifier ports
   directly (though the Halo2-vs-STARK proof mismatch remains regardless).

## Recommended path

- **Near term:** apply to **Ink Spark** or **Base Builder Grants** with the
  existing EVM deployment — cheap grant revenue while the Starknet path is
  built. Requires deploying `HealthCredentialVerifier` on the target L2
  (testnet first) — bounded work, scripts already exist
  (`deploy-standalone.mjs`).
- **Medium term:** spike a **RISC Zero or SP1** guest program that proves the
  same statement our EZKL circuit proves, verify the STARK on Starknet testnet,
  then apply to **Starknet Seed Grants** with a working PoC + the Orbura demo.
- Keep SKALE deployment live — it's the working demo; grants don't require
  abandoning it.

## Action items

- [ ] Decide EVM-L2 fallback target (Ink vs Base vs Unichain) and deploy
      verifier testnet instance
- [ ] Apply to chosen L2 grant (rolling — do early, budgets thin at round end)
- [ ] Research RISC Zero vs SP1 Starknet verification paths (docs + examples)
- [ ] Spike zkVM proof of the 7-dim threshold statement
- [ ] Apply to Starknet Seed Grants once PoC verifies on Starknet testnet
- [ ] Monitor esp.ethereum.foundation for ESP wishlist items (none open as of Nov 2026)

## References

- Starknet grants: https://www.starknet.io/grants/ · Seed via
  https://starknet.questbook.app/
- L2 grant comparison: https://www.web3grant.com/guides/ethereum-layer-2-grants
- EF ESP: https://esp.ethereum.foundation/ (Wishlist/RFP only, currently none)
- Presage challenge (separate track): `docs/presage-challenge.md`
