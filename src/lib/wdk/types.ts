/**
 * WDK types — shared between client and server.
 *
 * The server holds the WDK wallet instance and seed phrase.
 * The client only sees addresses, balances, and payment records.
 */

export type PaymentType = "bonus" | "fine" | "tip";

export type EvmAddress = `0x${string}`;

export interface SquadPayment {
  id: string;
  type: PaymentType;
  fromAddress: EvmAddress;
  toAddress: EvmAddress;
  /** Human-readable USDt amount (e.g. "50") */
  amount: string;
  /** Raw USDt units (6 decimals) */
  amountRaw: string;
  txHash?: string;
  status: "pending" | "confirmed" | "failed";
  createdAt: number;
  /** "Player of the match", "Late to training", etc. */
  note?: string;
  /** Player name for display in payment history */
  playerName?: string;
}

export interface WalletState {
  connected: boolean;
  managerAddress: EvmAddress | null;
  /** Human-readable USDt balance (e.g. "1,250.00") */
  treasuryBalance: string | null;
}

export interface SendPaymentRequest {
  type: PaymentType;
  toAddress: EvmAddress;
  /** USDt amount in human-readable units (e.g. 50 for $50) */
  amount: number;
  note?: string;
  playerName?: string;
}

export interface SendPaymentResponse {
  payment: SquadPayment;
  txHash: string;
}

export interface BalanceResponse {
  address: EvmAddress;
  /** Human-readable USDt balance */
  balance: string;
  /** Raw balance in base units */
  balanceRaw: string;
}
