import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchWithingsHRV } from "@/lib/wearables/withings";
import { buildHRVData } from "@/lib/baselines";

export const maxDuration = 20;

/**
 * GET /api/withings/data
 *
 * Fetches the authenticated user's most recent Withings sleep summary,
 * normalizes it, and returns HRVData with personal baselines applied.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const snapshot = await fetchWithingsHRV(auth.user.id);
  if (!snapshot) {
    return NextResponse.json(
      { error: "NO_SLEEP_DATA", message: "No recent Withings sleep data found." },
      { status: 404 }
    );
  }

  const hrvData = await buildHRVData(snapshot, auth.user.id);
  if (!hrvData) {
    return NextResponse.json(
      { error: "NO_HRV_DATA", message: "Could not derive HRV from Withings data." },
      { status: 404 }
    );
  }

  return NextResponse.json({ hrvData });
}
