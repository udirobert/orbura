#!/usr/bin/env node

/**
 * Submit a generated proof fixture to HealthCredentialVerifier.
 *
 * Usage:
 *   bun run zk:fixture
 *   node scripts/submit-proof-fixture.mjs [/tmp/body-debt-proof-fixture.json]
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const fixturePath = process.argv[2] ?? "/tmp/body-debt-proof-fixture.json";
const SKALE_RPC = "https://testnet.skalenodes.com/v1/juicy-low-small-testnet";

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  console.error("ERROR: DEPLOYER_PRIVATE_KEY not set.");
  process.exit(1);
}

const verifierAddress = process.env.NEXT_PUBLIC_VERIFIER_ADDRESS;
if (!verifierAddress || verifierAddress === "0x0000000000000000000000000000000000000000") {
  console.error("ERROR: NEXT_PUBLIC_VERIFIER_ADDRESS is not configured.");
  process.exit(1);
}

if (!existsSync(fixturePath)) {
  console.error(`ERROR: Fixture not found at ${fixturePath}. Run bun run zk:fixture first.`);
  process.exit(1);
}

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const chunks = JSON.parse(readFileSync(resolve(root, "public", "ezkl", "vk-chunks.json"), "utf8"));

if (!fixture.proofHex || !Array.isArray(fixture.publicInstances) || fixture.publicInstances.length === 0) {
  console.error("ERROR: Fixture missing proofHex or publicInstances.");
  process.exit(1);
}

const abi = [
  {
    inputs: [
      { internalType: "bytes", name: "proof", type: "bytes" },
      { internalType: "uint256[]", name: "instances", type: "uint256[]" },
      { internalType: "bytes32[]", name: "vka", type: "bytes32[]" },
    ],
    name: "verifyAndLogCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const appReadAbi = [
  {
    inputs: [],
    name: "halo2Verifier",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const halo2Abi = [
  {
    inputs: [
      { internalType: "bytes", name: "proof", type: "bytes" },
      { internalType: "uint256[]", name: "instances", type: "uint256[]" },
      { internalType: "bytes32[]", name: "vka", type: "bytes32[]" },
    ],
    name: "verifyProof",
    outputs: [
      { internalType: "bool", name: "success", type: "bool" },
      { internalType: "bytes32", name: "vka_digest", type: "bytes32" },
      { internalType: "int256[]", name: "rescaled_instances", type: "int256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const { ethers } = await import("ethers");
const provider = new ethers.JsonRpcProvider(SKALE_RPC);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(verifierAddress, abi, wallet);
const appReader = new ethers.Contract(verifierAddress, appReadAbi, provider);
const instances = fixture.publicInstances.map((value) => BigInt(value));
const rawBigEndianInstances = Array.isArray(fixture.rawInstances)
  ? fixture.rawInstances.map((value) => BigInt(`0x${String(value).replace(/^0x/, "")}`))
  : [];

console.log("Submitting proof fixture");
console.log("Verifier:", verifierAddress);
console.log("Wallet:", await wallet.getAddress());
console.log("Instances:", instances.map((value) => value.toString()).join(", "));
console.log("VKA digest:", fixture.vkDigest);

async function preflight(label, candidateInstances) {
  const halo2Address = await appReader.halo2Verifier();
  const halo2 = new ethers.Contract(halo2Address, halo2Abi, provider);
  try {
    const [success, digest] = await halo2.verifyProof.staticCall(
      fixture.proofHex,
      candidateInstances,
      chunks,
      { gasLimit: 30_000_000 }
    );
    console.log(`Halo2 static preflight (${label}):`, success ? "accepted" : "rejected");
    console.log("Halo2 VKA digest:", digest);
    return success;
  } catch (err) {
    console.error(`Halo2 static preflight (${label}) failed.`);
    if (err?.shortMessage) console.error(err.shortMessage);
    if (err?.reason) console.error(err.reason);
    if (err?.info?.error?.message) console.error(err.info.error.message);
    return false;
  }
}

let selectedInstances = instances;
try {
  if (!(await preflight("normalized", instances))) {
    if (rawBigEndianInstances.length === 0 || !(await preflight("raw-big-endian", rawBigEndianInstances))) {
      process.exit(1);
    }
    selectedInstances = rawBigEndianInstances;
  }
} catch {
  process.exit(1);
}

const tx = await contract.verifyAndLogCredential(
  fixture.proofHex,
  selectedInstances,
  chunks,
  { gasLimit: 30_000_000 }
);
console.log("Tx sent:", tx.hash);
const receipt = await tx.wait();
console.log("Tx confirmed:", tx.hash);
console.log("Gas used:", receipt.gasUsed.toString());
console.log(`Explorer: https://juicy-low-small-testnet.explorer.skalenodes.com/tx/${tx.hash}`);
