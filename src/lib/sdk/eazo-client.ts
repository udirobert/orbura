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
  reportAction(_payload: unknown): Promise<void> {
    return Promise.resolve();
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
