import { NextRequest, NextResponse } from "next/server";
import type { HRVData } from "@/lib/types";

export const maxDuration = 20;

const POPULATION_BASELINE_HR = 60; // resting HR reference

/**
 * POST /api/google-fit/data
 *
 * Body: { accessToken: string }
 *
 * Pulls yesterday's sleep and resting heart rate from Google Fit REST API.
 * Free, no per-user cost. Maps to HRVData schema.
 *
 * Note: Google Fit REST API does not expose RMSSD HRV — only heart rate
 * time series. We derive an HRV proxy from resting HR deviation.
 * Labelled as confidence: "medium" to reflect this limitation.
 */
export async function POST(request: NextRequest) {
  let body: { accessToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { accessToken } = body;
  if (!accessToken) {
    return NextResponse.json({ error: "accessToken required" }, { status: 400 });
  }

  // Time range: yesterday noon → now (captures last night's sleep session)
  const nowMs = Date.now();
  const startMs = nowMs - 36 * 3600 * 1000; // 36hrs ago

  const authHeader = `Bearer ${accessToken}`;

  // ── Heart Rate ────────────────────────────────────────────────────────────
  // Aggregate resting HR for the period
  const hrBody = {
    aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
    bucketByTime: { durationMillis: String(nowMs - startMs) },
    startTimeMillis: String(startMs),
    endTimeMillis: String(nowMs),
  };

  const hrRes = await fetch(
    "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
    {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(hrBody),
    }
  );

  let avgRestingHr: number | null = null;
  if (hrRes.ok) {
    const hrJson = await hrRes.json();
    const buckets = hrJson.bucket ?? [];
    const points: number[] = [];
    for (const bucket of buckets) {
      for (const ds of bucket.dataset ?? []) {
        for (const pt of ds.point ?? []) {
          const val = pt.value?.[0]?.fpVal;
          if (val != null) points.push(val);
        }
      }
    }
    if (points.length > 0) {
      // Use the 10th percentile as resting HR proxy (lower bound = resting)
      const sorted = [...points].sort((a, b) => a - b);
      avgRestingHr = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0];
    }
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const sleepRes = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(nowMs).toISOString()}&activityType=72`,
    { headers: { Authorization: authHeader } }
  );

  let deepMins = 0;
  let remMins = 0;
  let lightMins = 0;

  if (sleepRes.ok) {
    const sleepJson = await sleepRes.json();
    for (const session of sleepJson.session ?? []) {
      const durationMs = Number(session.endTimeMillis) - Number(session.startTimeMillis);
      const durationMins = Math.round(durationMs / 60000);
      // Google Fit sleep activity types: 110=light, 111=deep, 112=REM
      const actType = session.activityType;
      if (actType === 111) deepMins += durationMins;
      else if (actType === 112) remMins += durationMins;
      else if (actType === 110) lightMins += durationMins;
    }
  }

  // ── Derive HRV proxy from resting HR ─────────────────────────────────────
  // Google Fit has no RMSSD endpoint — higher resting HR → lower HRV proxy
  const restingHrDelta = avgRestingHr !== null
    ? Math.round(avgRestingHr - POPULATION_BASELINE_HR)
    : 5;

  // Each +1 bpm above baseline ≈ -1.5% HRV (rough empirical correlation)
  const hrvDeltaPercent = Math.max(-60, Math.min(20, Math.round(-restingHrDelta * 1.5)));

  const hrvData: HRVData = {
    hrvDeltaPercent,
    restingHrDelta,
    source: "google_fit",
    confidence: "medium", // no RMSSD available — derived proxy
    ...(deepMins > 0 || remMins > 0 || lightMins > 0
      ? { sleepStages: { deep: deepMins, rem: remMins, light: lightMins } }
      : {}),
  };

  return NextResponse.json({ hrvData });
}
