import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createLinkToken } from "@/lib/vitals/link-token";

export const maxDuration = 10;

/**
 * POST /api/vitals/link-token
 *
 * Issues a short-lived bearer token the Orbura desktop companion can use to
 * attribute camera vitals check-ins to this account. The companion has no
 * browser session, so the user copies the code into the app.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { token, expiresAt } = createLinkToken(auth.user.id);
  return NextResponse.json({ token, expiresAt, ttlSeconds: 1800 });
}
