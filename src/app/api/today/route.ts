import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { verifyLinkToken } from "@/lib/vitals/link-token";
import { buildTodayState } from "@/lib/today/build-today";

export const maxDuration = 15;

/**
 * GET /api/today
 *
 * Returns the canonical adaptive TodayState — one headline, one primary
 * action, at most two secondary actions. Guests receive 401; the dashboard
 * falls back to its existing guest flow.
 *
 * The Orbura Companion has no browser session, so it may authenticate with
 * `x-orbura-link-token` (the same short-lived bearer token used for vitals
 * check-ins). Read-only: the token can only fetch this decision.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  let userId: string;

  if (auth.ok) {
    userId = auth.user.id;
  } else {
    let linkUserId: string | null = null;
    try {
      linkUserId = verifyLinkToken(request.headers.get("x-orbura-link-token"));
    } catch {
      linkUserId = null;
    }
    if (!linkUserId) return auth.response;
    userId = linkUserId;
  }

  try {
    const state = await buildTodayState(userId);
    return NextResponse.json(state);
  } catch (err) {
    console.error("[api/today] failed to build state", err);
    return NextResponse.json({ error: "failed to build today state" }, { status: 500 });
  }
}
