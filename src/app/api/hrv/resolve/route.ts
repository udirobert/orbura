import { NextRequest, NextResponse } from "next/server";
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
  const { searchParams } = new URL(request.url);

  // ── Demo mode ─────────────────────────────────────────────────────────────
  if (searchParams.get("demo") === "true") {
    const demoData: HRVData = {
      hrvDeltaPercent: -31,
      restingHrDelta:  14,   // 72bpm vs 58bpm baseline
      source:          "demo",
      confidence:      "high",
      sleepStages: {
        deep:  28,
        rem:   44,
        light: 248, // 5h 20m total, predominantly light
      },
    };
    return NextResponse.json({
      hrvData: demoData,
      sourceLabel: "Simulated Garmin data",
      resolvedLayer: "demo",
    });
  }

  const terraUserId = searchParams.get("terraUserId");
  const terraDev  = process.env.TERRA_DEV_ID;
  const terraKey  = process.env.TERRA_API_KEY;

  // ── Layer 1 — Terra ───────────────────────────────────────────────────────
  if (terraDev && terraKey && terraUserId) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const terraRes = await fetch(
      `https://api.tryterra.co/v2/sleep?user_id=${encodeURIComponent(terraUserId)}&start_date=${yesterday}&end_date=${today}&to_webhook=false`,
      { headers: { "dev-id": terraDev, "x-api-key": terraKey } }
    ).catch(() => null);

    if (terraRes?.ok) {
      const json = await terraRes.json();
      const entry = (json.data ?? [])[0] as Record<string, unknown> | undefined;
      if (entry) {
        const hrData    = entry.heart_rate_data   as Record<string, unknown> | undefined;
        const sleepData = entry.sleep_durations_data as Record<string, unknown> | undefined;
        const asleep    = sleepData?.asleep        as Record<string, unknown> | undefined;

        const rmssd = hrData?.avg_hrv_rmssd       as number | undefined;
        const restHr = hrData?.avg_resting_heart_rate as number | undefined;
        const deepS  = asleep?.duration_deep_sleep_state_seconds as number | undefined;
        const remS   = asleep?.duration_REM_sleep_state_seconds  as number | undefined;
        const lightS = asleep?.duration_light_sleep_state_seconds as number | undefined;

        const BASE_HRV = 65;
        const BASE_HR  = 60;
        const delta = rmssd != null
          ? Math.round(((rmssd - BASE_HRV) / BASE_HRV) * 100)
          : -20;

        const data: HRVData = {
          hrvDeltaPercent: delta,
          restingHrDelta: restHr != null ? Math.round(restHr - BASE_HR) : 5,
          source: "terra",
          confidence: "high",
          ...(deepS != null || remS != null || lightS != null ? {
            sleepStages: {
              deep:  deepS  != null ? Math.round(deepS  / 60) : 45,
              rem:   remS   != null ? Math.round(remS   / 60) : 60,
              light: lightS != null ? Math.round(lightS / 60) : 180,
            },
          } : {}),
        };

        return NextResponse.json({ hrvData: data, resolvedLayer: "terra", sourceLabel: `Live from your wearable` });
      }
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
