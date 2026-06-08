#!/usr/bin/env node

/**
 * Standalone deployment script for HealthCredentialVerifier (atomic verify + log).
 * Uses solc + ethers directly — no hardhat dependency.
 *
 * The new contract requires the Halo2VerifierReusable to already be deployed
 * with a VK registered. The VKA digest is computed from vk-chunks.json or
 * passed via --vk-digest.
 *
 * Usage: node scripts/deploy-standalone.mjs [--vk-digest 0x...]
 * Requires: DEPLOYER_PRIVATE_KEY in .env or environment
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const HALO2_VERIFIER_ADDRESS = "0x01c8C37961eA7548600323A3c4F636c75b7B31d0";
const SKALE_RPC = "https://testnet.skalenodes.com/v1/juicy-low-small-testnet";

async function main() {
  const envPath = resolve(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in .env or environment");
    process.exit(1);
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(SKALE_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();
  console.log("Deployer address:", address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(address)), "sFUEL");

  // Resolve VKA digest
  let vkDigest = process.argv.find((_, i, arr) => arr[i - 1] === "--vk-digest");
  if (!vkDigest) {
    console.log("No --vk-digest provided, computing from vk-chunks.json...");
    const chunksPath = resolve(__dirname, "..", "public", "ezkl", "vk-chunks.json");
    if (!existsSync(chunksPath)) {
      console.error("ERROR: vk-chunks.json not found. Provide --vk-digest or run bun run zk:chunks first.");
      process.exit(1);
    }
    const vka = JSON.parse(readFileSync(chunksPath, "utf8"));
    vkDigest = ethers.keccak256(ethers.concat(vka.map(h => h)));
    console.log("Computed VKA digest:", vkDigest);

    console.log("Ensure this digest has been registered with scripts/register-vk-on-chain.mjs before using the app.");
  }

  console.log("\nHalo2 verifier:", HALO2_VERIFIER_ADDRESS);
  console.log("VKA digest:", vkDigest);

  const contractPath = resolve(__dirname, "..", "contracts", "HealthCredentialVerifier.sol");
  const source = readFileSync(contractPath, "utf8");

  let solc;
  try {
    solc = require("solc");
  } catch {
    console.log("solc not found, installing...");
    const { execSync } = await import("child_process");
    execSync("npm install solc@0.8.28", { cwd: resolve(__dirname, ".."), stdio: "pipe" });
    solc = require("solc");
  }

  console.log("\nCompiling HealthCredentialVerifier.sol...");
  const input = {
    language: "Solidity",
    sources: {
      "HealthCredentialVerifier.sol": { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:", JSON.stringify(errors, null, 2));
      process.exit(1);
    }
  }
  const contract = output.contracts["HealthCredentialVerifier.sol"]["HealthCredentialVerifier"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Deploying to SKALE Europa Testnet...");
  console.log("Constructor args:", HALO2_VERIFIER_ADDRESS, vkDigest);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const verifier = await factory.deploy(HALO2_VERIFIER_ADDRESS, vkDigest);
  await verifier.waitForDeployment();

  const deployedAddress = await verifier.getAddress();
  console.log("\n✅ Deployed to:", deployedAddress);
  console.log("\nAdd to your .env:");
  console.log(`NEXT_PUBLIC_VERIFIER_ADDRESS=${deployedAddress}`);

  console.log("\nView on explorer:");
  console.log(`https://juicy-low-small-testnet.explorer.skalenodes.com/address/${deployedAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
