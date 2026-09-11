import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCombinedWearableBaseline, getWearableTrend } from "@/lib/db/queries";

export const maxDuration = 10;

/**
 * GET /api/wearables/trend?days=14
 *
 * Returns the authenticated user's per-day wearable summary for the last N
 * calendar days, plus the true 28-day rolling baselines (weighted across
 * hrv_rmssd + hrv_sdnn) used by scoring. Guest users receive 401.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const days = daysParam ? Math.min(90, Math.max(1, parseInt(daysParam, 10))) : 14;

  const [trend, baseline] = await Promise.all([
    getWearableTrend(auth.user.id, days),
    getCombinedWearableBaseline(auth.user.id),
  ]);
  return NextResponse.json({ trend, days, baseline });
}
