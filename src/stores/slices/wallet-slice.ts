import type { StateCreator } from "zustand";
import type { SquadPayment } from "@/lib/wdk/types";

/**
 * Wallet slice — WDK squad payment state.
 *
 * Persisted: managerAddress, payments (survives page reload)
 * Ephemeral: treasuryBalance, connecting, sendingPayment
 *
 * All blockchain operations happen via API routes — this slice only
 * stores the results. Never holds the seed phrase or private keys.
 */
export interface WalletSlice {
  // Connection state
  walletConnected: boolean;
  managerAddress: `0x${string}` | null;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // Treasury balance (ephemeral — refreshed on demand)
  treasuryBalance: string | null;
  refreshingBalance: boolean;
  refreshBalance: () => Promise<void>;

  // Payment history (persisted)
  payments: SquadPayment[];
  sendingPayment: boolean;
  sendPayment: (
    type: SquadPayment["type"],
    toAddress: `0x${string}`,
    amount: number,
    note?: string,
    playerName?: string,
  ) => Promise<SquadPayment | null>;
  addPayment: (payment: SquadPayment) => void;
  updatePaymentStatus: (
    id: string,
    status: SquadPayment["status"],
    txHash?: string,
  ) => void;
}

/** Fields from the wallet slice that should be persisted to storage. */
export const WALLET_PERSIST_FIELDS = [
  "walletConnected",
  "managerAddress",
  "payments",
] as const;

export const createWalletSlice: StateCreator<
  WalletSlice,
  [],
  [],
  WalletSlice
> = (set, get) => ({
  walletConnected: false,
  managerAddress: null,
  connecting: false,

  connectWallet: async () => {
    if (get().walletConnected || get().connecting) return;
    set({ connecting: true });
    try {
      const res = await fetch("/api/wallet/connect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to connect wallet");
      const data = await res.json();
      set({
        walletConnected: true,
        managerAddress: data.address,
        connecting: false,
      });
      // Fetch initial balance
      void get().refreshBalance();
    } catch {
      set({ connecting: false });
    }
  },

  disconnectWallet: () => {
    set({
      walletConnected: false,
      managerAddress: null,
      treasuryBalance: null,
    });
  },

  treasuryBalance: null,
  refreshingBalance: false,

  refreshBalance: async () => {
    if (!get().walletConnected) return;
    set({ refreshingBalance: true });
    try {
      const res = await fetch("/api/wallet/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      set({ treasuryBalance: data.balance, refreshingBalance: false });
    } catch {
      set({ refreshingBalance: false });
    }
  },

  payments: [],
  sendingPayment: false,

  sendPayment: async (type, toAddress, amount, note, playerName) => {
    set({ sendingPayment: true });
    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          toAddress,
          amount,
          note,
          playerName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        throw new Error(err.error ?? "Send failed");
      }
      const data = await res.json();
      const payment = data.payment as SquadPayment;
      get().addPayment(payment);
      // Refresh balance after successful send
      void get().refreshBalance();
      set({ sendingPayment: false });
      return payment;
    } catch {
      set({ sendingPayment: false });
      return null;
    }
  },

  addPayment: (payment) => {
    set({ payments: [payment, ...get().payments] });
  },

  updatePaymentStatus: (id, status, txHash) => {
    set({
      payments: get().payments.map((p) =>
        p.id === id ? { ...p, status, ...(txHash ? { txHash } : {}) } : p,
      ),
    });
  },
});
