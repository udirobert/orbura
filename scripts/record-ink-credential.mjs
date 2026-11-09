#!/usr/bin/env node
/**
 * Record a confirmed Ink (EZKL/Halo2) credential in Orbura.
 *
 * Counterpart to zkvm/scripts/record-credential.mjs for the EVM path:
 * reads the proof fixture produced by `bun run zk:fixture`, derives
 * score/healthy the same way the browser prover does (clamp output to
 * [0,1], healthy = score < 0.5), and POSTs /api/credentials after the
 * on-chain verification tx confirmed. Auth is a short-lived link token —
 * generate one at orbura → HRV → Camera check-in → link code.
 *
 * Usage:
 *   node scripts/record-ink-credential.mjs --tx 0xb6fd… --token orb1.…
 *   node scripts/record-ink-credential.mjs --tx 0x… --fixture /path.json --api https://orbura.famile.xyz --token orb1.…
 */
import { readFile } from "node:fs/promises";

const THRESHOLD = 0.5; // matches use-face-scan-pipeline.ts worker invocation

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const txHash = arg("tx");
const token = arg("token");
const api = (arg("api") ?? "https://orbura.famile.xyz").replace(/\/$/, "");
const fixturePath = arg("fixture") ?? "/tmp/orbura-proof-fixture.json";

if (!txHash || !token) {
  console.error("Usage: record-ink-credential.mjs --tx <ink-tx-hash> --token <orb1.link-token> [--fixture <path>] [--api <url>]");
  process.exit(1);
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const rawScore = Number(fixture.prettyPublicInputs?.rescaled_outputs?.[0]?.[0] ?? NaN);
if (!Number.isFinite(rawScore)) {
  console.error(`Fixture at ${fixturePath} has no rescaled_outputs — regenerate with: bun run zk:fixture`);
  process.exit(1);
}
const score = Math.max(0, Math.min(1, rawScore));
const healthy = score < THRESHOLD;

const body = {
  source: "face_scan",
  modelId: "orbura-stress-v1",
  score,
  healthy,
  inputDigest: null, // fixture proofs carry no feature digest — real scans do
  prover: "ezkl",
  chain: "ink",
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
console.log(`chain=ink tx: ${txHash}`);
