#!/usr/bin/env node

/**
 * Generate a known-good EZKL proof fixture for the current public/ezkl artifacts.
 *
 * Default output: /tmp/body-debt-proof-fixture.json
 * Optional output: node scripts/generate-proof-fixture.mjs path/to/fixture.json
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outPath = process.argv[2]
  ? resolve(root, process.argv[2])
  : "/tmp/body-debt-proof-fixture.json";
const proofPath = "/tmp/body-debt-proof.json";

function requireFile(path) {
  if (!existsSync(path)) {
    console.error(`ERROR: Missing ${path}. Run python scripts/compile-circuit.py first.`);
    process.exit(1);
  }
}

function run(args) {
  const result = spawnSync("ezkl", args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function normalizeFieldElement(value) {
  const trimmed = String(value).trim();
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return BigInt(trimmed).toString();
  if (/^\d+$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bigEndian = trimmed.match(/[0-9a-fA-F]{2}/g).reverse().join("");
    return BigInt(`0x${bigEndian}`).toString();
  }
  throw new Error(`Unsupported field element: ${trimmed}`);
}

function flatten(value) {
  if (Array.isArray(value)) return value.flatMap((item) => flatten(item));
  return [value];
}

const paths = {
  witness: "public/ezkl/witness.json",
  compiled: "public/ezkl/compiled.ezkl",
  pk: "public/ezkl/pk.key",
  vk: "public/ezkl/vk.key",
  srs: "public/ezkl/srs.key",
  settings: "public/ezkl/settings.json",
  chunks: "public/ezkl/vk-chunks.json",
  digest: "public/ezkl/vk-digest.json",
};

Object.values(paths).forEach((path) => requireFile(resolve(root, path)));

run([
  "prove",
  "-W", paths.witness,
  "-M", paths.compiled,
  "--pk-path", paths.pk,
  "--srs-path", paths.srs,
  "--proof-path", proofPath,
]);

run([
  "verify",
  "-S", paths.settings,
  "--proof-path", proofPath,
  "--vk-path", paths.vk,
  "--srs-path", paths.srs,
]);

const proof = JSON.parse(readFileSync(proofPath, "utf8"));
const digest = JSON.parse(readFileSync(resolve(root, paths.digest), "utf8"));
const rawInstances = flatten(proof.instances).map((value) => String(value));
const publicInstances = rawInstances.map(normalizeFieldElement);

const fixture = {
  generatedAt: new Date().toISOString(),
  ezklVersion: proof.version ?? null,
  proofHex: proof.hex_proof,
  rawInstances,
  publicInstances,
  prettyPublicInputs: proof.pretty_public_inputs,
  vkDigest: digest.digest,
  vkChunks: digest.chunks,
  proofPath,
};

writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`);

console.log(`Wrote proof fixture to ${outPath}`);
console.log(`Public instances: ${publicInstances.join(", ")}`);
console.log(`VKA digest: ${digest.digest}`);
