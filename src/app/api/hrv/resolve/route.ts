import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchTerraHRV } from "@/lib/wearables/terra";
import type { HRVData } from "@/lib/types";

export const maxDuration = 20;

/**
 * GET /api/hrv/resolve?userId=...&terraUserId=...
 *
 * Unified HRV resolution endpoint. Walks the fallback chain:
 *   1. Terra (if TERRA_DEV_ID + TERRA_API_KEY present + terraUserId provided)
 *   2. (HealthKit is client-side only — handled in the browser, not here)
 *   3. Google Fit (if GOOGLE_FIT_CLIENT_ID present — separate OAuth flow)
 *   4. Falls through with null → client falls back to manual proxy
 *
 * Also handles ?demo=true — returns a hardcoded realistic dataset.
 * REMOVE or gate the demo param before public launch.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  const userId = auth.ok ? auth.user.id : null;

  const { searchParams } = new URL(request.url);

  // ── Demo mode ─────────────────────────────────────────────────────────────
  if (searchParams.get("demo") === "true") {
    const demoData: HRVData = {
      hrvDeltaPercent: -31,
      restingHrDelta: 14,   // 72bpm vs 58bpm baseline
      source: "demo",
      confidence: "high",
      sleepStages: {
        deep: 28,
        rem: 44,
        light: 248, // 5h 20m total, predominantly light
      },
      baselineHrv: 65,
      baselineHr: 60,
    };
    return NextResponse.json({
      hrvData: demoData,
      sourceLabel: "Simulated Garmin data",
      resolvedLayer: "demo",
    });
  }

  const terraUserId = searchParams.get("terraUserId");

  // ── Layer 1 — Terra ───────────────────────────────────────────────────────
  if (terraUserId) {
    const result = await fetchTerraHRV(terraUserId, userId);
    if (result) {
      return NextResponse.json({
        hrvData: result.hrvData,
        resolvedLayer: "terra",
        sourceLabel: "Live from your wearable",
      });
    }
  }

  // ── Layer 2 — HealthKit is handled client-side, not here ──────────────────
  // If the client obtained HealthKit data, it calls /api/analyze directly.
  // This endpoint returns null here and the UI renders the manual proxy path.

  // ── Layer 3 — Google Fit handled via separate OAuth + /api/google-fit/data ─
  // Same pattern: client drives the OAuth popup and calls /api/google-fit/data.

  // ── No server-side source resolved ───────────────────────────────────────
  return NextResponse.json({ hrvData: null, resolvedLayer: "none" });
}
