"use client";

import type { ReactNode } from "react";

/**
 * Stub EazoProvider. Body-debt removed the Eazo mobile shell so judges
 * can hit the live URL from a regular browser without seeing the
 * "Get the full Eazo experience" interstitial. The provider now just
 * renders its children.
 */
export function EazoProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Stub useEazo. Components that read auth state get null/false values,
 * which triggers the guest-mode branches (e.g. "Sign in" button hidden
 * or replaced with the share / share-card path).
 */
export function useEazo<T>(selector: (state: EazoState) => T): T {
  return selector(STUB_STATE);
}

type EazoState = {
  auth: {
    user: null;
    authenticated: false;
    loading: false;
  };
  device: {
    platform: string;
  };
};

const STUB_STATE: EazoState = {
  auth: {
    user: null,
    authenticated: false,
    loading: false,
  },
  device: {
    platform: "web",
  },
};
