"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DebtAnalysis } from "@/lib/types";

import {
  createProfileSlice,
  PROFILE_PERSIST_FIELDS,
  type ProfileSlice,
} from "./slices/profile-slice";
import {
  createSessionSlice,
  SESSION_PERSIST_FIELDS,
  shouldExpireSession,
  type SessionSlice,
} from "./slices/session-slice";
import {
  createStreamSlice,
  type StreamSlice,
  type AgentEventState,
} from "./slices/stream-slice";
import {
  createWalletSlice,
  WALLET_PERSIST_FIELDS,
  type WalletSlice,
} from "./slices/wallet-slice";

/**
 * Combined store type — flat API for backward compatibility with all
 * existing consumers. Internally organised into three slices:
 *
 *   profile  — long-lived user state (mode, squad, streak, locale, etc.)
 *   session  — per-assessment state, expires at midnight
 *   stream   — ephemeral runtime state (zkProof, agent events, progress)
 *   wallet   — WDK squad payment state (manager address, payments, balance)
 *
 * See `src/stores/slices/` for the individual slice definitions.
 */
export type BodyDebtState = ProfileSlice & SessionSlice & StreamSlice & WalletSlice & {
  /** Reset session + stream, keep profile + wallet. */
  reset: () => void;
};

// Re-export slice types and the agent event type for consumers.
export type { ProfileSlice, SessionSlice, StreamSlice, WalletSlice, AgentEventState };

export const useBodyDebtStore = create<BodyDebtState>()(
  persist(
    (set, get, store) => ({
      ...createProfileSlice(set as never, get as never, store as never),
      ...createSessionSlice(set as never, get as never, store as never),
      ...createStreamSlice(set as never, get as never, store as never),
      ...createWalletSlice(set as never, get as never, store as never),

      /**
       * Reset session + stream, keep profile (mode, squad, streak, etc.).
       * The original `reset` in the monolithic store cleared session fields
       * and ephemeral fields but preserved profile fields — this preserves
       * that contract.
       */
      reset: () => {
        get().resetSession();
        get().resetStream();
      },

      /**
       * Override `setAnalysis` to also update the streak in the profile
       * slice — the session slice's own `setAnalysis` only sets the analysis
       * and session timestamp; the cross-slice streak update lives here.
       */
      setAnalysis: (analysis: DebtAnalysis | null) => {
        set({ analysis });
        if (analysis) {
          set({ sessionStartedAt: new Date().toISOString() });
          get().updateStreak(analysis.debtScore);
        }
      },
    }),
    {
      name: "body-debt-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      // Persist profile + session + wallet fields, never stream fields.
      partialize: (state) => {
        const persisted: Record<string, unknown> = {};
        for (const key of PROFILE_PERSIST_FIELDS) {
          persisted[key] = state[key];
        }
        for (const key of SESSION_PERSIST_FIELDS) {
          persisted[key] = state[key];
        }
        for (const key of WALLET_PERSIST_FIELDS) {
          persisted[key] = state[key];
        }
        return persisted;
      },
      // Midnight expiry — only the session slice should be reset.
      onRehydrateStorage: () => (state) => {
        if (state && shouldExpireSession(state.sessionStartedAt)) {
          // Preserve profile fields, clear session fields.
          state.resetSession();
        }
      },
    }
  )
);
