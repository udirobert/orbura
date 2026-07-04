#!/usr/bin/env node
/**
 * Generate a fresh BIP-39 seed phrase for the WDK manager wallet.
 *
 * Usage:
 *   node scripts/generate-wdk-seed.mjs           # 12-word (default)
 *   node scripts/generate-wdk-seed.mjs --words 24 # 24-word
 *
 * The seed phrase is printed to stdout. Copy it into your .env file:
 *
 *   WDK_SEED_PHRASE="word1 word2 word3 ..."
 *
 * NEVER commit the seed phrase to git. .env is already gitignored.
 * NEVER share the seed phrase with anyone. Anyone with the seed
 * phrase controls the wallet's funds.
 */
import WDK from "@tetherto/wdk";

const args = process.argv.slice(2);
let wordCount = 12;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--words" && args[i + 1]) {
    const n = parseInt(args[i + 1], 10);
    if (n === 12 || n === 24) {
      wordCount = n;
    } else {
      console.error("Invalid word count. Must be 12 or 24.");
      process.exit(1);
    }
  }
}

const seedPhrase = WDK.getRandomSeedPhrase(wordCount);

console.log("┌─────────────────────────────────────────────────────────┐");
console.log("│  WDK Manager Wallet — Seed Phrase Generated             │");
console.log("├─────────────────────────────────────────────────────────┤");
console.log("│  ⚠️  Store this securely. Anyone with this phrase       │");
console.log("│     controls the wallet's funds.                        │");
console.log("├─────────────────────────────────────────────────────────┤");
console.log("│                                                         │");
console.log(`│  ${seedPhrase}`);
console.log("│                                                         │");
console.log("├─────────────────────────────────────────────────────────┤");
console.log("│  Add to .env:                                           │");
console.log('│  WDK_SEED_PHRASE="' + seedPhrase + '"');
console.log("│                                                         │");
console.log("│  Next steps:                                            │");
console.log("│  1. Fund the wallet with ETH (for gas) on mainnet       │");
console.log("│  2. Fund the wallet with USDt on mainnet                │");
console.log("│  3. Restart the dev server                             │");
console.log("│  4. Open /squad → Connect USDt Treasury                 │");
console.log("└─────────────────────────────────────────────────────────┘");
