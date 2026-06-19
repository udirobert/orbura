import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Stub requireAuth. Always returns `ok: false` so the route handlers
 * proceed as a guest. This matches the guest-first design of body-debt:
 * no auth gate is enforced for analyze, face-scan, or notifications.
 */
export function requireAuth(_request: NextRequest): AuthResult {
  return {
    ok: false,
    response: NextResponse.json({ error: "auth removed in standalone build" }, { status: 401 }),
  };
}

export class EazoNotificationPublishError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = "EazoNotificationPublishError";
  }
}

export const notifications = {
  publish(_payload: { title: string; body: string; data?: Record<string, unknown>; audience?: string }): Promise<{ delivered: number; failed: number }> {
    return Promise.resolve({ delivered: 0, failed: 0 });
  },
};
