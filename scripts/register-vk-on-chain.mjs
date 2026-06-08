#!/usr/bin/env node

/**
 * Register the EZKL verification key on the deployed Halo2VerifierReusable.
 * This must be done once before verifyProof can be called.
 *
 * Usage: node scripts/register-vk-on-chain.mjs
 * Requires: DEPLOYER_PRIVATE_KEY in .env or environment
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  // Load env
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
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set");
    process.exit(1);
  }

  const VERIFIER_ADDRESS = "0x01c8C37961eA7548600323A3c4F636c75b7B31d0";

  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(
    "https://testnet.skalenodes.com/v1/juicy-low-small-testnet"
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = await wallet.getAddress();
  const balance = await provider.getBalance(address);
  console.log("Registering VKA via account:", address);
  console.log("Balance:", ethers.formatEther(balance), "sFUEL");

  // Read VKA chunks
  const chunksPath = resolve(__dirname, "..", "public", "ezkl", "vk-chunks.json");
  let vka;
  try {
    vka = JSON.parse(readFileSync(chunksPath, "utf8"));
  } catch {
    console.error("ERROR: vk-chunks.json not found. Run the chunking script first.");
    process.exit(1);
  }
  console.log("VKA chunks:", vka.length);
  const vkDigest = ethers.keccak256(ethers.concat(vka.map((h) => h)));
  console.log("VKA digest:", vkDigest);

  // Build the minimal ABI for registerVka
  const abi = [
    {
      inputs: [{ internalType: "bytes32[]", name: "vka", type: "bytes32[]" }],
      name: "registerVka",
      outputs: [{ internalType: "bytes32", name: "vka_digest", type: "bytes32" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];

  const contract = new ethers.Contract(VERIFIER_ADDRESS, abi, wallet);

  console.log("Calling registerVka with", vka.length, "chunks...");
  console.log("(This may take 1-2 minutes due to calldata size...)");

  const startTime = Date.now();
  const tx = await contract.registerVka(vka);
  console.log("Tx sent:", tx.hash);

  const receipt = await tx.wait();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ VKA registered in ${duration}s`);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Tx hash:", tx.hash);
  console.log("VKA digest:", vkDigest);

  // The registerVka returns the VKA digest via the event
  // It's also logged in the tx logs
  console.log("\nVKA digest available above and from tx logs on explorer:");
  console.log(`https://juicy-low-small-testnet.explorer.skalenodes.com/tx/${tx.hash}`);

  console.log("\n✅ VKA is now registered. verifyProof() is ready to use.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
