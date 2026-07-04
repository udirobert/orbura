/**
 * WDK payment operations — server-side only.
 *
 * All functions go through the WDK client singleton. Never import in
 * client components — use the API routes in src/app/api/wallet/ instead.
 */
import { getEvmAccount, USDT_CONTRACT, USDT_DECIMALS } from "./index";
import type { EvmAddress, SquadPayment, PaymentType, BalanceResponse } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert human-readable USDt to raw base units (6 decimals) */
export function toBaseUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDT_DECIMALS));
}

/** Convert raw base units to human-readable USDt string */
export function fromBaseUnits(raw: bigint): string {
  const divisor = BigInt(10) ** BigInt(USDT_DECIMALS);
  const whole = raw / divisor;
  const fraction = raw % divisor;
  const fractionStr = fraction.toString().padStart(USDT_DECIMALS, "0");
  return `${whole}.${fractionStr}`;
}

/** Format USDt with thousands separators (e.g. "1,250.00") */
export function formatUsdt(raw: bigint): string {
  const plain = fromBaseUnits(raw);
  const [whole, frac] = plain.split(".");
  const wholeFormatted = Number(whole).toLocaleString("en-US");
  return `${wholeFormatted}.${frac}`;
}

function generatePaymentId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the manager's USDt treasury balance.
 */
export async function getTreasuryBalance(): Promise<BalanceResponse> {
  const account = await getEvmAccount();
  const address = (await account.getAddress()) as EvmAddress;
  const balanceRaw = await account.getTokenBalance(USDT_CONTRACT);
  return {
    address,
    balance: formatUsdt(balanceRaw),
    balanceRaw: balanceRaw.toString(),
  };
}

/**
 * Send a USDt payment to a player.
 *
 * @param type - bonus, fine, or tip
 * @param toAddress - player's EVM address
 * @param amount - human-readable USDt amount (e.g. 50 for $50)
 * @param note - optional note ("Player of the match", etc.)
 * @param playerName - optional player name for display
 */
export async function sendPayment(
  type: PaymentType,
  toAddress: EvmAddress,
  amount: number,
  note?: string,
  playerName?: string,
): Promise<{ payment: SquadPayment; txHash: string }> {
  if (amount <= 0) throw new Error("Amount must be positive");
  if (amount > 10_000) throw new Error("Amount exceeds $10,000 safety limit");

  const account = await getEvmAccount();
  const fromAddress = (await account.getAddress()) as EvmAddress;
  const amountRaw = toBaseUnits(amount);

  // WDK EVM transfer — handles gas, nonce, and signing internally
  const result = await account.transfer({
    token: USDT_CONTRACT,
    recipient: toAddress,
    amount: amountRaw,
  });

  const payment: SquadPayment = {
    id: generatePaymentId(),
    type,
    fromAddress,
    toAddress,
    amount: amount.toString(),
    amountRaw: amountRaw.toString(),
    txHash: result.hash,
    status: "confirmed",
    createdAt: Date.now(),
    note,
    playerName,
  };

  return { payment, txHash: result.hash };
}

/**
 * Get the manager's ETH balance (for gas estimation).
 */
export async function getEthBalance(): Promise<string> {
  const account = await getEvmAccount();
  const balance = await account.getBalance();
  const divisor = BigInt(10) ** BigInt(18);
  const ethRaw = balance / divisor;
  const ethFraction = (balance % divisor) / (BigInt(10) ** BigInt(14));
  return `${ethRaw}.${ethFraction.toString().padStart(4, "0")}`;
}
