#!/usr/bin/env node

/**
 * Generate the reusable-verifier VKA artifact and convert it to bytes32[] JSON.
 *
 * EZKL's reusable verifier does not accept raw vk.key bytes. It expects the
 * compact VKA artifact produced by `ezkl create-evm-vka`.
 *
 * Outputs:
 * - public/ezkl/vka.bytes
 * - public/ezkl/vk-chunks.json
 * - public/ezkl/vk-digest.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { keccak256 } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const ezklDir = resolve(root, "public", "ezkl");
const paths = {
  settings: resolve(ezklDir, "settings.json"),
  vk: resolve(ezklDir, "vk.key"),
  srs: resolve(ezklDir, "srs.key"),
  vka: resolve(ezklDir, "vka.bytes"),
  chunks: resolve(ezklDir, "vk-chunks.json"),
  digest: resolve(ezklDir, "vk-digest.json"),
};

function requireFile(path) {
  if (!existsSync(path)) {
    console.error(`ERROR: Missing ${path}. Run python scripts/compile-circuit.py first.`);
    process.exit(1);
  }
}

mkdirSync(ezklDir, { recursive: true });
requireFile(paths.settings);
requireFile(paths.vk);
requireFile(paths.srs);

const result = spawnSync("ezkl", [
  "create-evm-vka",
  "-S", paths.settings,
  "--vk-path", paths.vk,
  "--srs-path", paths.srs,
  "--vka-path", paths.vka,
], {
  cwd: root,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const vka = readFileSync(paths.vka);
if (vka.length < 8) {
  console.error("ERROR: VKA artifact is too short.");
  process.exit(1);
}

const count = Number(vka.readBigUInt64LE(0));
const expectedBytes = 8 + count * 32;
if (vka.length !== expectedBytes) {
  console.error(`ERROR: Unexpected VKA size. Expected ${expectedBytes} bytes, got ${vka.length}.`);
  process.exit(1);
}

const chunks = [];
for (let i = 0; i < count; i += 1) {
  const start = 8 + i * 32;
  chunks.push(`0x${vka.subarray(start, start + 32).toString("hex")}`);
}

const concatenated = `0x${chunks.map((chunk) => chunk.slice(2)).join("")}`;
const digest = keccak256(concatenated);

writeFileSync(paths.chunks, `${JSON.stringify(chunks, null, 2)}\n`);
writeFileSync(
  paths.digest,
  `${JSON.stringify({ digest, chunks: chunks.length, sourceBytes: vka.length, source: "vka.bytes" }, null, 2)}\n`
);

console.log(`Wrote ${chunks.length} VKA chunks to ${paths.chunks}`);
console.log(`VKA digest: ${digest}`);
