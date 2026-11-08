#!/usr/bin/env node
/**
 * Record a confirmed Starknet credential in Orbura.
 *
 * Reads zkvm/artifacts/proof.json (journal_decoded), requires the L2
 * verification tx hash, and POSTs /api/credentials. Auth is either a
 * browser session (not usable from CLI) or a short-lived link token —
 * generate one at orbura → HRV → Camera check-in → link code.
 *
 * Usage:
 *   node scripts/record-credential.mjs --tx 0x04267e… --token orb1.…
 *   node scripts/record-credential.mjs --tx 0x… --api https://orbura.famile.xyz --token orb1.…
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const proofPath = join(here, "../artifacts/proof.json");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const txHash = arg("tx");
const token = arg("token");
const api = (arg("api") ?? "https://orbura.famile.xyz").replace(/\/$/, "");

if (!txHash || !token) {
  console.error("Usage: record-credential.mjs --tx <starknet-tx-hash> --token <orb1.link-token> [--api <url>]");
  process.exit(1);
}

const proof = JSON.parse(await readFile(proofPath, "utf8"));
const j = proof.journal_decoded;
if (!j) {
  console.error("proof.json has no journal_decoded — regenerate artifacts with the updated host (CI workflow).");
  process.exit(1);
}

const MODEL_IDS = { "0x4f524255": "ORBU" };
const body = {
  source: "camera_vitals",
  modelId: MODEL_IDS[j.model_id] ?? j.model_id,
  score: j.score,
  healthy: j.healthy,
  inputDigest: `sha256:${j.feature_digest.replace(/^0x/, "")}`,
  prover: "risc0",
  chain: "starknet",
  txHash,
};

const res = await fetch(`${api}/api/credentials`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-orbura-link-token": token,
  },
  body: JSON.stringify(body),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`POST /api/credentials failed (${res.status}):`, data.error ?? data);
  process.exit(1);
}
console.log(`Credential recorded: id=${data.id} model=${body.modelId} score=${body.score} healthy=${body.healthy}`);
console.log(`tx: ${txHash}`);
