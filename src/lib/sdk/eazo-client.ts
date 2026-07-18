// Auth.js v5 client bridge.
//
// Body-debt originally ran on the Eazo platform with a custom SDK.
// We've replaced it with NextAuth.js (Auth.js v5) — self-hosted,
// open source, no vendor lock-in. This module preserves the same
// interface (`auth`, `memory`, `share`, `notifications`, `ai`) that
// the rest of the app imports, but delegates auth to NextAuth.

import { signIn, signOut } from "next-auth/react";

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export const auth = {
  /**
   * Redirects to the NextAuth sign-in page.
   * After successful sign-in, the user is redirected back to the
   * current page (or callbackUrl if provided).
   */
  async login(callbackUrl?: string): Promise<void> {
    await signIn(undefined, { callbackUrl: callbackUrl ?? "/" });
  },

  async logout(): Promise<void> {
    await signOut({ callbackUrl: "/" });
  },

  /**
   * Returns null — the session is read via the `useSession()` hook
   * from `next-auth/react` in client components, not synchronously.
   * Kept for interface compatibility.
   */
  get user(): User | null {
    return null;
  },

  async getSessionHeader(): Promise<string | null> {
    return null;
  },
};

export const memory = {
  /**
   * Reports a user action to Supermemory Local via /api/memory.
   * The server route prefers the authenticated userId as containerTag
   * (stable across devices) and falls back to the anonymousId from
   * the Zustand store for guests.
   * Fire-and-forget — never blocks on memory failures.
   */
  async reportAction(payload: {
    content: string;
    event_type: string;
    page?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      if (typeof window === "undefined") return;
      // The server route checks auth() first, so we don't need to
      // send containerTag for authenticated users. We still send it
      // as fallback for guests.
      const raw = localStorage.getItem("body-debt-session");
      const state = raw ? JSON.parse(raw)?.state : null;
      const containerTag = state?.anonymousId;
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ...(containerTag ? { containerTag } : {}) }),
      });
    } catch {
      // Never let memory failures block core flow
    }
  },
};

export const share = {
  compose(_payload: { text: string; sourceAppId?: string; targetPath?: string }): Promise<void> {
    throw new Error("Eazo share removed — use navigator.share fallback");
  },
};

export const notifications = {
  available: false,
  isSubscribed(): Promise<{ subscribed: boolean }> {
    return Promise.resolve({ subscribed: false });
  },
  subscribe(): Promise<{ subscribed: boolean }> {
    return Promise.resolve({ subscribed: false });
  },
  unsubscribe(): Promise<{ subscribed: boolean }> {
    return Promise.resolve({ subscribed: false });
  },
};

export const ai = {
  configure(_config: { privateKey?: string; appId?: string }): void {
    // No-op — cloud AI is unreachable. The route handlers that use
    // ai.chat() expect throws so the deterministic / QVAC fallbacks fire.
  },
  chat(_payload: unknown): Promise<{ choices: Array<{ message: { content: string } }> }> {
    return Promise.reject(new Error("Cloud AI disabled in standalone build"));
  },
};
