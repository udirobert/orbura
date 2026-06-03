import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDailyScoresByUser } from "@/lib/db/queries";

export const maxDuration = 10;

/**
 * GET /api/user/heatmap
 *
 * Returns daily-aggregated debt scores for the last 30 days.
 * Days without sessions are omitted from the array.
 *
 * Response: { days: Array<{ date: string; debtScore: number; sessionCount: number }> }
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const days = await getDailyScoresByUser(auth.user.id, 30);

  return NextResponse.json({ days });
}
