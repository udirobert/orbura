// Stub @eazo/sdk client. Body-debt originally ran as a template on the Eazo
// platform. We've removed the Eazo dependency for the QVAC hackathon
// submission so the live URL renders as a standalone web app instead of
// getting wrapped in the Eazo mobile shell.
//
// All functions here are no-ops or throw to fall through to web alternatives.

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export const auth = {
  async getSessionHeader(): Promise<string | null> {
    return null;
  },
  async login(): Promise<never> {
    throw new Error("Eazo auth removed in standalone build");
  },
  async logout(): Promise<void> {},
  get user(): User | null {
    return null;
  },
};

export const memory = {
  /**
   * Reports a user action to Supermemory Local via /api/memory.
   * Reads the anonymous user ID from the persisted Zustand store
   * in localStorage to use as the Supermemory containerTag.
   * Fire-and-forget — never blocks on memory failures.
   */
  async reportAction(payload: {
    content: string;
    event_type: string;
  }): Promise<void> {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem("body-debt-session");
      if (!raw) return;
      const state = JSON.parse(raw)?.state;
      const containerTag = state?.anonymousId;
      if (!containerTag) return;
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, containerTag }),
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
