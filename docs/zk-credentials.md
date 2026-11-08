# ZK Credential Records — spec

Goal: make verified wellness credentials durable, queryable records so the
adaptive UI's auditor density (and clinician trust signals) can show *real*
proof status instead of fixtures. Today proofs are ephemeral — generated in
the browser/worker, verified on-chain, then discarded.

## What exists

- **EZKL/Halo2 path (SKALE):** browser MediaPipe → 7-feature vector → EZKL
  worker proof → `HealthCredentialVerifier.verifyAndLogCredential` on SKALE
  Europa → `HealthCredentialVerified` event. Proof bytes are intentionally
  ephemeral (`zkProof` excluded from Zustand persistence).
- **RISC Zero path (Starknet):** `zkvm/` guest proves the same 7→16→8→1 MLP;
  Groth16 seal verified on Starknet Sepolia via Garaga wrapper
  `OrburaCredential` at `0x05f4425f…492d1` (tx `0x04267e49…`). Host emits
  `zkvm/artifacts/proof.json` + `calldata.json`.
- **Journal contents (both paths):** `model_id`, `score_bits`, `healthy`,
  `sha256(features)` — raw features never leave the prover.

## Proposed table: `zk_credentials`

```ts
pgTable("zk_credentials", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  source: varchar("source", { length: 32 }).notNull(),   // "face_scan" | "camera_vitals"
  modelId: varchar("model_id", { length: 64 }).notNull(),// e.g. "ORBU", "ORBU-stress-mlp-v1"
  score: real("score"),                                  // clamped 0–1, null if not in journal
  healthy: boolean("healthy"),
  inputDigest: varchar("input_digest", { length: 80 }),  // "sha256:…" of feature vector
  prover: varchar("prover", { length: 16 }).notNull(),   // "ezkl" | "risc0"
  chain: varchar("chain", { length: 16 }).notNull(),     // "skale" | "starknet" | "local"
  txHash: varchar("tx_hash", { length: 80 }),            // null until confirmed
  verifiedAt: timestamp("verified_at"),                  // on-chain acceptance time
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("zk_credentials_user_idx").on(t.userId, t.createdAt),
])
```

Rules:

- **Write only after confirmation.** A row is inserted when the verify
  transaction reaches `ACCEPTED_ON_L2` / SKALE confirmation — never on
  proof generation alone. `chain: "local"` rows are allowed for devnet-free
  local verification, clearly marked.
- **No raw features, ever.** Only `inputDigest` (sha256 of the feature
  vector) is stored — enough for audit correlation, useless for reconstruction.
- **Guests:** camera-vitals guest check-ins (`device:` userIds) get rows
  under their device id, same as `wearable_observations` today.

## Write paths

1. **SKALE (existing flow):** after `verifyAndLogCredential` confirms, the
   client POSTs `/api/credentials` with `{ modelId, score, healthy,
   inputDigest, prover: "ezkl", chain: "skale", txHash }`. Server inserts.
   Client must not self-report `verified: true` without txHash for
   `chain !== "local"`.
2. **Starknet:** after the wrapper's verify tx confirms, same endpoint with
   `prover: "risc0"`, `chain: "starknet"`, txHash. Journal decode gives
   score/healthy.
3. **Local dev:** `chain: "local"`, no txHash — powers Storybook/preview.

## Read paths

- `GET /api/credentials/latest` → most recent verified credential for the
  caller (dashboard trust badge, auditor density).
- `GET /api/today` gains `latestCredential` — auditor density joins it to
  `TodayState.provenance` (was this decision made with a verified signal?).
- Clinician patient endpoint returns `credentials` count/latest for the
  trust column — provenance indicator, not a clinical claim.

## UI surfacing

- **Patient:** subtle "verified check-in" marker on the Today card when the
  freshest signal carries a credential — never a dashboard of crypto.
- **Clinician:** credential count + last verified date in the patient
  header ("3 verified camera check-ins").
- **Auditor (`/preview/adaptive` → live):** rule id + inputs + credential
  block populated from `zk_credentials` instead of fixtures.

## Out of scope (v1)

- No on-chain reads back into the DB (event indexing) — writes are
  client-confirmed POSTs; a reconciliation job can come later.
- No credential revocation/expiry semantics.
- No PII beyond userId linkage already present in other tables.
