#!/usr/bin/env node

/**
 * Deploy the Orbura ZK credential stack to Ink Sepolia (chainId 763373).
 *
 * Steps:
 *   1. Deploy EZKLVerifierReusable (Halo2VerifierReusable)
 *   2. Register the VKA chunks on it
 *   3. Deploy HealthCredentialVerifier(halo2Verifier, vkDigest)
 *   4. Optionally submit the local proof fixture (--with-fixture)
 *
 * Usage:
 *   node scripts/deploy-ink-sepolia.mjs [--with-fixture] [--fixture /path.json]
 *
 * Requires: DEPLOYER_PRIVATE_KEY in .env or environment, plus testnet ETH
 * on Ink Sepolia (faucet: https://console.optimism.io/faucet → Ink Sepolia).
 *
 * Writes deployments/ink-sepolia.json with all deployed addresses.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const INK_SEPOLIA_RPC = "https://rpc-qnd-sepolia.inkonchain.com";
const INK_SEPOLIA_CHAIN_ID = 763373;
const EXPLORER = "https://explorer-sepolia.inkonchain.com";

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
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

function compileSolidity(file, contractName, optimizerRuns = 200) {
  const source = readFileSync(resolve(root, "contracts", file), "utf8");
  const input = {
    language: "Solidity",
    sources: { [file]: { content: source } },
    settings: {
      viaIR: file.includes("Reusable"),
      optimizer: { enabled: true, runs: optimizerRuns },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };
  const output = JSON.parse(require("solc").compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((e) => e.severity === "error");
  if (errors.length) {
    console.error("Compilation errors:", JSON.stringify(errors, null, 2));
    process.exit(1);
  }
  const contract = output.contracts[file][contractName];
  if (!contract) {
    console.error(`Contract ${contractName} not found in ${file}`);
    process.exit(1);
  }
  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function main() {
  loadEnv();
  const withFixture = process.argv.includes("--with-fixture");
  const fixtureIdx = process.argv.indexOf("--fixture");
  const fixturePath = fixtureIdx > -1 ? process.argv[fixtureIdx + 1] : "/tmp/orbura-proof-fixture.json";

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set");
    process.exit(1);
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(INK_SEPOLIA_RPC);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== INK_SEPOLIA_CHAIN_ID) {
    console.error(`ERROR: RPC returned chainId ${network.chainId}, expected ${INK_SEPOLIA_CHAIN_ID}`);
    process.exit(1);
  }
  const wallet = new ethers.Wallet(privateKey, provider);
  const deployer = await wallet.getAddress();
  const balance = await provider.getBalance(deployer);
  console.log("Deployer:", deployer);
  console.log("Balance:", ethers.formatEther(balance), "ETH (Ink Sepolia)");
  if (balance === 0n) {
    console.error("ERROR: no testnet ETH — claim from https://console.optimism.io/faucet (Ink Sepolia)");
    process.exit(1);
  }

  const chunks = JSON.parse(readFileSync(resolve(root, "public", "ezkl", "vk-chunks.json"), "utf8"));
  const vkDigest = ethers.keccak256(ethers.concat(chunks.map((h) => h)));
  console.log("VKA chunks:", chunks.length, "digest:", vkDigest);

  // 1. Halo2VerifierReusable
  console.log("\n[1/4] Compiling + deploying Halo2VerifierReusable...");
  const halo2 = compileSolidity("EZKLVerifierReusable.sol", "Halo2VerifierReusable");
  console.log("Bytecode:", Math.round(halo2.bytecode.length / 2 / 1024), "KB");
  const halo2Factory = new ethers.ContractFactory(halo2.abi, halo2.bytecode, wallet);
  const halo2Contract = await halo2Factory.deploy();
  await halo2Contract.waitForDeployment();
  const halo2Address = await halo2Contract.getAddress();
  console.log("Halo2VerifierReusable:", halo2Address, `(tx ${halo2Contract.deploymentTransaction()?.hash})`);

  // 2. registerVka
  console.log("\n[2/4] Registering VKA...");
  const registerAbi = [{
    inputs: [{ internalType: "bytes32[]", name: "vka", type: "bytes32[]" }],
    name: "registerVka",
    outputs: [{ internalType: "bytes32", name: "vka_digest", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  }];
  const register = new ethers.Contract(halo2Address, registerAbi, wallet);
  const regTx = await register.registerVka(chunks);
  const regReceipt = await regTx.wait();
  console.log("VKA registered. tx:", regTx.hash, "gas:", regReceipt.gasUsed.toString());

  // 3. HealthCredentialVerifier
  console.log("\n[3/4] Compiling + deploying HealthCredentialVerifier...");
  const app = compileSolidity("HealthCredentialVerifier.sol", "HealthCredentialVerifier");
  const appFactory = new ethers.ContractFactory(app.abi, app.bytecode, wallet);
  const appContract = await appFactory.deploy(halo2Address, vkDigest);
  await appContract.waitForDeployment();
  const appAddress = await appContract.getAddress();
  console.log("HealthCredentialVerifier:", appAddress, `(tx ${appContract.deploymentTransaction()?.hash})`);

  const result = {
    chain: "ink-sepolia",
    chainId: INK_SEPOLIA_CHAIN_ID,
    rpc: INK_SEPOLIA_RPC,
    explorer: EXPLORER,
    deployer,
    deployedAt: new Date().toISOString(),
    halo2Verifier: halo2Address,
    healthCredentialVerifier: appAddress,
    vkDigest,
    vkaChunks: chunks.length,
    registerVkaTx: regTx.hash,
  };

  // 4. Optional fixture proof
  if (withFixture) {
    console.log("\n[4/4] Submitting proof fixture...", fixturePath);
    if (!existsSync(fixturePath)) {
      console.error(`Fixture not found at ${fixturePath} — run: bun run zk:fixture`);
    } else {
      const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
      const verifyAbi = [{
        inputs: [
          { internalType: "bytes", name: "proof", type: "bytes" },
          { internalType: "uint256[]", name: "instances", type: "uint256[]" },
          { internalType: "bytes32[]", name: "vka", type: "bytes32[]" },
        ],
        name: "verifyAndLogCredential",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      }];
      const verifier = new ethers.Contract(appAddress, verifyAbi, wallet);
      const instances = fixture.publicInstances.map((v) => BigInt(v));
      const proofTx = await verifier.verifyAndLogCredential(fixture.proofHex, instances, chunks, { gasLimit: 30_000_000 });
      const proofReceipt = await proofTx.wait();
      console.log("Proof verified on-chain! tx:", proofTx.hash, "gas:", proofReceipt.gasUsed.toString());
      result.proofTx = proofTx.hash;
    }
  }

  mkdirSync(resolve(root, "deployments"), { recursive: true });
  writeFileSync(resolve(root, "deployments", "ink-sepolia.json"), JSON.stringify(result, null, 2));
  console.log("\nSaved deployments/ink-sepolia.json");
  console.log("Explorer:", `${EXPLORER}/address/${appAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
