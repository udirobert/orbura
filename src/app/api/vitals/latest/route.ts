import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { wearableObservations } from "@/lib/db/schema";
import {
  getBaselineStats,
} from "@/lib/db/queries/wearable-observations";
import { and, desc, eq, gte } from "drizzle-orm";

export const maxDuration = 10;

/**
 * GET /api/vitals/latest
 *
 * Returns the most recent camera_vitals check-in for the signed-in user,
 * shaped for the HRV pull flow: latest values plus 28-day baseline deltas.
 * 401 when signed out — the camera source requires an account so readings
 * accumulate under a durable identity.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const rows = await db
    .select({
      metricType: wearableObservations.metricType,
      value: wearableObservations.value,
      recordedAt: wearableObservations.recordedAt,
    })
    .from(wearableObservations)
    .where(
      and(
        eq(wearableObservations.userId, userId),
        eq(wearableObservations.source, "camera_vitals"),
        gte(wearableObservations.recordedAt, cutoff)
      )
    )
    .orderBy(desc(wearableObservations.recordedAt));

  // Latest value per metric type.
  const latest = new Map<string, { value: number; recordedAt: Date }>();
  for (const r of rows) {
    if (!latest.has(r.metricType)) {
      latest.set(r.metricType, { value: r.value, recordedAt: r.recordedAt });
    }
  }
  if (latest.size === 0) {
    return NextResponse.json({ vitals: null });
  }

  const get = (t: string) => latest.get(t) ?? null;
  const statsFor = (t: string) =>
    getBaselineStats({ userId, metricType: t, recordedAt: new Date(), windowDays: 28 });

  const breathing = get("breathing_rate");
  const pulse = get("pulse_bpm");
  const hrv = get("hrv_rmssd");

  const [hrvStats, pulseStats] = await Promise.all([
    hrv ? statsFor("hrv_rmssd") : null,
    pulse ? statsFor("pulse_bpm") : null,
  ]);

  // HRVData-shaped payload for the connected panel. hrvDeltaPercent is a
  // percent vs baseline; restingHrDelta is absolute bpm vs baseline (matches
  // the wearable sources' convention).
  const hrvData =
    hrv || pulse
      ? {
          hrvDeltaPercent:
            hrv && hrvStats ? Math.round(((hrv.value - hrvStats.avg) / hrvStats.avg) * 100) : 0,
          restingHrDelta:
            pulse && pulseStats ? Math.round((pulse.value - pulseStats.avg) * 10) / 10 : 0,
          source: "camera_vitals" as const,
          confidence: "medium" as const,
          baselineHrv: hrvStats?.avg,
          baselineHr: pulseStats?.avg,
          breathingRate: breathing?.value,
          recordedAt: (hrv ?? pulse)!.recordedAt.toISOString(),
        }
      : null;

  return NextResponse.json({
    vitals: {
      breathingRate: breathing?.value ?? null,
      pulseBpm: pulse?.value ?? null,
      hrvRmssdMs: hrv?.value ?? null,
      recordedAt: [...latest.values()].map((v) => v.recordedAt.toISOString()).sort().pop(),
      hrvData,
    },
  });
}
