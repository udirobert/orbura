# Smart Contracts

Body Debt uses the reusable EZKL/Halo2 verifier path. The old one-off generated `EZKLVerifier.sol` path is deprecated; normal app traffic should go through `HealthCredentialVerifier`.

## Contracts

| Contract | File | Purpose |
|---|---|---|
| `Halo2VerifierReusable` | `EZKLVerifierReusable.sol` | EZKL-generated reusable Halo2 verifier. Deployed separately and reused across app-facing verifier deployments. |
| `HealthCredentialVerifier` | `HealthCredentialVerifier.sol` | App-facing contract. Atomically verifies a proof through `Halo2VerifierReusable` and logs a credential event only on success. |

`HealthCredentialVerifier.verifyAndLogCredential(...)` is the only function the frontend should call for SKALE verification.

## Prerequisites

Set a funded deployer in `.env`:

```bash
DEPLOYER_PRIVATE_KEY=0x...
```

Get SKALE Europa testnet sFUEL from the SKALE faucet.

## Deployment Order

1. Generate or refresh the ONNX model:

   ```bash
   python scripts/generate-stress-model.py
   ```

2. Compile the EZKL circuit and keys:

   ```bash
   python scripts/compile-circuit.py
   ```

   This also runs `scripts/generate-vk-chunks.mjs`. If you already have `public/ezkl/vk.key`, you can run only:

   ```bash
   bun run zk:chunks
   ```

3. Deploy `Halo2VerifierReusable` if no reusable verifier exists for this circuit family:

   ```bash
   node scripts/deploy-reusable-verifier.mjs
   ```

   If redeployed, update `HALO2_VERIFIER_ADDRESS` in:

   - `src/lib/blockchain/skale-client.ts`
   - `scripts/deploy-standalone.mjs`
   - `scripts/register-vk-on-chain.mjs`

4. Register the VKA chunks on `Halo2VerifierReusable`:

   ```bash
   node scripts/register-vk-on-chain.mjs
   ```

   Save the printed VKA digest.

5. Generate a local proof fixture if you changed proof serialization or calldata handling:

   ```bash
   bun run zk:fixture
   ```

6. Deploy `HealthCredentialVerifier`:

   ```bash
   node scripts/deploy-standalone.mjs
   ```

   Or pass the digest explicitly:

   ```bash
   node scripts/deploy-standalone.mjs --vk-digest 0x...
   ```

7. Add the deployed app-facing verifier to `.env`:

   ```bash
   NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
   ```

8. Submit the local fixture against the deployed verifier:

   ```bash
   bun run zk:submit-fixture
   ```

9. Restart the app.

## Verification Contract Notes

`HealthCredentialVerifier` constructor pins:

- `halo2Verifier`: deployed `Halo2VerifierReusable`
- `approvedVkDigest`: expected digest for the VKA chunks in `vk-chunks.json`

At runtime, it:

- computes `keccak256(proof)` for replay protection
- checks the submitted VK artifact digest against `approvedVkDigest`
- calls `halo2Verifier.verifyProof(proof, instances, vka)`
- emits `HealthCredentialVerified` only if the proof passes

Do not submit mock proofs or app-level rounded scores. The frontend must send raw proof bytes and exact EZKL public instances.
