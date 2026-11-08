import { createHmac, timingSafeEqual } from "crypto";

/**
 * Companion link tokens — let the Orbura desktop companion (which has no
 * browser session) attribute vitals check-ins to a signed-in account.
 *
 * Format: `orb1.<expUnix>.<b64url(userId)>.<b64url(hmac)>`
 * Signed with AUTH_SECRET. Tokens are bearer credentials: anyone holding one
 * can post vitals as that user until it expires, so TTL is short (30 min)
 * and the web UI regenerates per linking session.
 */

const TTL_SECONDS = 30 * 60;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured");
  return s;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createLinkToken(userId: string): { token: string; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const body = `orb1.${exp}.${b64url(userId)}`;
  const token = `${body}.${sign(body)}`;
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/** Returns the userId when the token is valid and unexpired, else null. */
export function verifyLinkToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "orb1") return null;
  const [prefix, expStr, userB64, sig] = parts;
  const body = `${prefix}.${expStr}.${userB64}`;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  try {
    return Buffer.from(userB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
