import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildWithingsAuthUrl, generateWithingsState } from "@/lib/wearables/withings";

export const maxDuration = 10;

const COOKIE_MAX_AGE = 10 * 60; // 10 minutes

/**
 * POST /api/withings/auth
 *
 * Returns the Withings OAuth consent URL for an authenticated user.
 * Sets short-lived httpOnly cookies to bind the OAuth state to the session.
 * Guests receive 401.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const state = generateWithingsState();
  const url = buildWithingsAuthUrl(state);

  const response = NextResponse.json({ url, state });
  response.cookies.set("withings_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set("withings_oauth_uid", auth.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
