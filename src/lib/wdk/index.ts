/**
 * WDK client singleton — server-side only.
 *
 * Initializes the WDK with an EVM wallet from the manager's seed phrase.
 * All blockchain operations go through this module. Never import in client
 * components — use the API routes in src/app/api/wallet/ instead.
 *
 * Security: WDK_SEED_PHRASE is read from env and never exposed to the
 * client. The client only sees addresses and balances.
 */
import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import type { EvmAddress } from "./types";

// Re-export payment operations for API routes
export { getTreasuryBalance, sendPayment, getEthBalance } from "./payments";
export { toBaseUnits, fromBaseUnits, formatUsdt } from "./payments";

// ─── Constants ───────────────────────────────────────────────────────────────

/** USDt contract on Ethereum mainnet (6 decimals) */
export const USDT_CONTRACT =
  (process.env.NEXT_PUBLIC_USDT_CONTRACT as EvmAddress) ??
  ("0xdAC17F958D2ee523a2206206994597C13D831ec7" as EvmAddress);

/** USDt has 6 decimals (not 18 like most ERC-20s) */
export const USDT_DECIMALS = 6;

const ETH_RPC_URL = process.env.ETH_RPC_URL ?? "https://sepolia.drpc.org";

/** Sepolia testnet chain ID (11155111) */
const SEPOLIA_CHAIN_ID = 11155111;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * The WDK getAccount() returns IWalletAccountWithProtocols, but at runtime
 * the object also has all wallet methods (getAddress, getBalance, transfer,
 * etc.). We cast to this interface to access them.
 */
interface EvmAccount {
  getAddress(): Promise<string>;
  getBalance(): Promise<bigint>;
  getTokenBalance(tokenAddress: string): Promise<bigint>;
  transfer(options: {
    token: string;
    recipient: string;
    amount: bigint | number;
  }): Promise<{ hash: string; fee: bigint }>;
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _wdk: WDK | null = null;
let _managerAddress: EvmAddress | null = null;

/**
 * Get the initialized WDK instance. Lazily creates it on first call.
 * Throws if WDK_SEED_PHRASE is not set.
 */
export async function getWdk(): Promise<WDK> {
  if (_wdk) return _wdk;

  const seedPhrase = process.env.WDK_SEED_PHRASE;
  if (!seedPhrase) {
    throw new Error("WDK_SEED_PHRASE environment variable is not set");
  }

  if (!WDK.isValidSeed(seedPhrase)) {
    throw new Error("WDK_SEED_PHRASE is not a valid BIP-39 seed phrase");
  }

  _wdk = new WDK(seedPhrase).registerWallet("ethereum", WalletManagerEvm, {
    provider: ETH_RPC_URL,
    chainId: SEPOLIA_CHAIN_ID,
  });

  return _wdk;
}

/**
 * Get the manager's EVM account (index 0).
 * The account is cast to EvmAccount to access wallet methods.
 */
export async function getEvmAccount(): Promise<EvmAccount> {
  const wdk = await getWdk();
  const account = await wdk.getAccount("ethereum", 0);
  return account as unknown as EvmAccount;
}

/**
 * Get the manager's EVM address (account index 0).
 * Cached after first resolution.
 */
export async function getManagerAddress(): Promise<EvmAddress> {
  if (_managerAddress) return _managerAddress;

  const account = await getEvmAccount();
  const address = await account.getAddress();
  _managerAddress = address as EvmAddress;
  return _managerAddress;
}

/**
 * Check if WDK is configured (seed phrase present in env).
 * Used by API routes to return a clear error before attempting init.
 */
export function isWdkConfigured(): boolean {
  const seed = process.env.WDK_SEED_PHRASE;
  return !!seed && WDK.isValidSeed(seed);
}
