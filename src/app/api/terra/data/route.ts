import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchTerraHRV } from "@/lib/wearables/terra";

export const maxDuration = 20;

/**
 * GET /api/terra/data?terraUserId=...
 *
 * Polls Terra's REST API for today's sleep + HRV data on behalf of a
 * connected user. Called by the HRV screen after successful OAuth.
 *
 * Returns an HRVData object in Orbura's schema, or an error.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  const userId = auth.ok ? auth.user.id : null;

  const { searchParams } = new URL(request.url);
  const terraUserId = searchParams.get("terraUserId");

  if (!terraUserId) {
    return NextResponse.json({ error: "terraUserId required" }, { status: 400 });
  }

  const result = await fetchTerraHRV(terraUserId, userId);

  if (!result) {
    return NextResponse.json(
      { error: "NO_SLEEP_DATA", message: "No sleep data found for last night." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    hrvData: result.hrvData,
    provider: result.provider,
    rawHrvRmssd: result.rawHrvRmssd,
    rawRestingHr: result.rawRestingHr,
  });
}
