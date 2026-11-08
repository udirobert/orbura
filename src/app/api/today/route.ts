import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildTodayState } from "@/lib/today/build-today";

export const maxDuration = 15;

/**
 * GET /api/today
 *
 * Returns the canonical adaptive TodayState — one headline, one primary
 * action, at most two secondary actions. Guests receive 401; the dashboard
 * falls back to its existing guest flow.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const state = await buildTodayState(auth.user.id);
    return NextResponse.json(state);
  } catch (err) {
    console.error("[api/today] failed to build state", err);
    return NextResponse.json({ error: "failed to build today state" }, { status: 500 });
  }
}
