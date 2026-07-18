// Server-side SDK shim.
//
// requireAuth and auth types are now backed by NextAuth.js (Auth.js v5)
// in @/lib/auth. This file re-exports them for backward compatibility
// with imports from @/lib/sdk/eazo-server.

export { requireAuth } from "@/lib/auth";
export type { AuthUser as User, AuthResult } from "@/lib/auth";

export class EazoNotificationPublishError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = "EazoNotificationPublishError";
  }
}

export const notifications = {
  available: false,
  publish(_payload: { title: string; body: string; data?: Record<string, unknown>; audience?: string }): Promise<{ delivered: number; failed: number }> {
    return Promise.reject(new EazoNotificationPublishError("Notification delivery is not configured", 501));
  },
};
