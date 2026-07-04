# ZK Pipeline Notes

This document holds the longer implementation notes for Body Debt's face-scan ZK flow. Keep `AGENTS.md` compact and link here for detail.

## Purpose

The face scan proves that a small, audited model ran over private facial stress features without sending raw biometric data to the server or chain.

The on-chain record is a credential event, not a storage layer for sensitive health data.

## Data Flow

```text
Browser camera
  -> MediaPipe FaceMesh
  -> reduced feature vector
  -> EZKL worker
  -> local proof generation
  -> local proof verification
  -> exact proof bytes + exact public instances
  -> SKALE Europa transaction
  -> HealthCredentialVerified event
```

## Privacy Boundaries

- Raw pixels never leave the browser.
- The full 468-point landmark array is not sent to the ZK circuit.
- The circuit receives a small feature vector only.
- `zkProof` is ephemeral Zustand state and is excluded from localStorage persistence.
- On-chain data should remain minimal: proof hash, model identifier, and public result metadata.
- The captured frame data URL (`capturedImageUrl`) is cleared on retake, delete, skip, or navigation. It is never persisted to Zustand or localStorage.
- The `extractedFeatures` object (6 geometric scalars) is kept in pipeline state for the result-screen visual breakdown but is not persisted.

## Current Model

The browser derives seven features:

- `leftEyeAspect`
- `rightEyeAspect`
- `browTension`
- `mouthTension`
- `eyeSymmetry`
- `mouthOpening`
- normalized time-of-day

These feed a 7 -> 16 -> 8 -> 1 MLP exported by `scripts/generate-stress-model.py`.

## Worker Requirements

`src/workers/ezkl-prover.worker.ts` is the only place that should run EZKL proof generation.

The worker returns:

- `proof`: JSON/debug representation of the EZKL proof
- `proofHex`: raw proof bytes as `0x...`
- `publicInstances`: verifier public inputs as field elements
- `publicInputs`: app-facing metadata for UI
- `verified`: local EZKL verification result

The client must not synthesize verifier instances from app metadata such as `stress_score`. If `publicInstances` is missing, SKALE verification should be skipped or marked failed.

## Contracts

`contracts/EZKLVerifierReusable.sol` is the reusable EZKL/Halo2 verifier. It verifies proof bytes against public instances and a verification key artifact (`vka`).

`contracts/HealthCredentialVerifier.sol` is the app-facing contract. It:

- pins a `Halo2VerifierReusable` address
- pins an approved VKA digest
- rejects replayed proof hashes
- calls `halo2Verifier.verifyProof(...)`
- emits `HealthCredentialVerified` only after proof verification passes

The app should call only `HealthCredentialVerifier.verifyAndLogCredential(...)` during normal operation.

## Artifact Pipeline

1. Generate the ONNX model:

   ```bash
   python scripts/generate-stress-model.py
   ```

2. Compile the EZKL circuit:

   ```bash
   python scripts/compile-circuit.py
   ```

   This produces `public/ezkl/compiled.ezkl`, `settings.json`, `witness.json`, `pk.key`, `srs.key`, and `vk.key`, then runs `scripts/generate-vk-chunks.mjs`.

3. Generate VKA chunks manually if needed:

   ```bash
   bun run zk:chunks
   ```

   This writes:

   - `public/ezkl/vk-chunks.json`
   - `public/ezkl/vk-digest.json`

4. Register the VKA chunks:

   ```bash
   node scripts/register-vk-on-chain.mjs
   ```

5. Generate a local proof fixture when changing worker extraction or contract calldata:

   ```bash
   bun run zk:fixture
   ```

   By default this writes `/tmp/body-debt-proof-fixture.json`.

6. Deploy the app-facing verifier:

   ```bash
   node scripts/deploy-standalone.mjs
   ```

7. Put the deployed app-facing verifier in `.env`:

   ```bash
   NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
   ```

8. Submit the local fixture to the deployed verifier:

   ```bash
   bun run zk:submit-fixture
   ```

## Fixture To Prove Before Shipping

Before claiming the full chain works, produce one known-good fixture:

- a real `proofHex`
- exact `publicInstances`
- the `vk-chunks.json` used to deploy/register
- the local EZKL verification result
- a successful `verifyAndLogCredential(...)` transaction hash

This fixture should be used to harden the worker's `publicInstances` extraction. The current extraction is defensive because EZKL proof JSON shape can vary by engine version.

## Shared Helpers

Field-element normalization and public-instance extraction live in `src/lib/zk/field-elements.ts`. The worker (`src/workers/ezkl-prover.worker.ts`) imports from this module. It handles three EZKL output formats:

- `0x`-prefixed hex (e.g. `0x2be4` -> `"11236"`)
- plain decimal strings (pass-through)
- 64-character hex without prefix (little-endian byte-reversed field elements)

The same logic was previously duplicated between the worker and `scripts/generate-proof-fixture.mjs`. The script still has its own copy because it runs in Node without the app's module resolution, but any future changes should stay in sync.

## Testing

```bash
bun run test
```

Three test files cover the ZK pipeline:

| File | What it guards |
|---|---|
| `src/__tests__/zk-field-elements.test.ts` | `normalizeFieldElement` across hex, decimal, and byte-reversed formats; `collectFieldElements` across nested arrays and mixed types; `extractPublicInstances` across all EZKL proof JSON shapes and fallback priority |
| `src/__tests__/skale-client.test.ts` | Chain guard, zero-address check, chain ID constant, ABI shapes for both contracts, `fetchVkChunks` with mocked fetch |
| `src/__tests__/zk-artifacts.test.ts` | `vk-digest.json` shape, `vk-chunks.json` entry count matches digest, every chunk is valid bytes32, **keccak256 of concatenated chunks matches the on-chain VKA digest**, `compiled.ezkl` exists and is non-empty |

The keccak digest test in `zk-artifacts.test.ts` catches any mismatch between `vk-chunks.json` and `vk-digest.json` without needing a live chain call. If this test fails after regenerating artifacts, the on-chain verifier will reject the VKA.

## Known Gaps

- `EZKLVerifierReusable` has a private `registeredVkas` mapping. Existing deployments cannot expose a getter. If redeploying the reusable verifier, add a view function such as `isVkaRegistered(bytes32 digest)`.
- Production build has unrelated blockers around Google font fetching and QVAC worker bundling.
- The app currently falls back to mock proof generation if artifacts are missing. Mock proofs must never be submitted on-chain.
