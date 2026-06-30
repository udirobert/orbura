"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getContextConfig } from "./index";
import type { RecoveryContextConfig } from "./types";

const RecoveryContext = createContext<RecoveryContextConfig | null>(null);

/**
 * RecoveryContextProvider
 *
 * Reads the current `mode` from the Zustand store and resolves the matching
 * `RecoveryContextConfig` via `getContextConfig()`. Provides it through React
 * context so any descendant component can access vocabulary, themes, agent
 * prompt fragments, and feature flags (e.g. `supportsSquad`) without reaching
 * for the store or calling `getContextConfig` directly.
 */
export function RecoveryContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const mode = useBodyDebtStore((s) => s.mode);
  const config = getContextConfig(mode);

  return (
    <RecoveryContext.Provider value={config}>
      {children}
    </RecoveryContext.Provider>
  );
}

/**
 * useRecoveryContext
 *
 * Returns the current `RecoveryContextConfig`. Must be called from within a
 * <RecoveryContextProvider>.
 *
 * Convenience accessors for the most-accessed fields:
 *
 *   const { vocabulary, supportsSquad, theme } = useRecoveryContext();
 *   const appName = useRecoveryContext().vocabulary.appName;
 */
export function useRecoveryContext(): RecoveryContextConfig {
  const ctx = useContext(RecoveryContext);
  if (!ctx) {
    throw new Error(
      "useRecoveryContext must be used within a <RecoveryContextProvider>"
    );
  }
  return ctx;
}
