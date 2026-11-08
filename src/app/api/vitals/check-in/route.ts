import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  upsertWearableObservation,
  getBaselineStats,
} from "@/lib/db/queries/wearable-observations";
import { verifyLinkToken } from "@/lib/vitals/link-token";

export const maxDuration = 15;

/**
 * POST /api/vitals/check-in
 *
 * Accepts a camera-based vitals check-in (SmartSpectra / Orbura companion)
 * and stores each metric as a daily wearable observation under source
 * `camera_vitals`. Authenticated users write under their user id; guests
 * write under `device:<client-generated id>` so a companion device can
 * accumulate a personal baseline before sign-in.
 *
 * Payload (all optional, at least one required):
 *   { deviceId?, breathingRate?, pulseBpm?, hrvRmssdMs?, hrvSdnnMs?, capturedAt? }
 *
 * Response includes per-metric deltas vs the 28-day personal baseline and a
 * deterministic wellness insight + one action. Wellness framing only — no
 * diagnosis, no clinical claims.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(res: NextResponse) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

interface VitalsBody {
  deviceId?: unknown;
  linkToken?: unknown;
  breathingRate?: unknown;
  pulseBpm?: unknown;
  hrvRmssdMs?: unknown;
  hrvSdnnMs?: unknown;
  capturedAt?: unknown;
}

const METRICS = [
  { key: "breathingRate", metricType: "breathing_rate", unit: "br/min", min: 4, max: 60 },
  { key: "pulseBpm", metricType: "pulse_bpm", unit: "bpm", min: 30, max: 220 },
  { key: "hrvRmssdMs", metricType: "hrv_rmssd", unit: "ms", min: 1, max: 500 },
  { key: "hrvSdnnMs", metricType: "hrv_sdnn", unit: "ms", min: 1, max: 500 },
] as const;

function inRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

export async function POST(request: NextRequest) {
  let body: VitalsBody | null = null;
  try {
    body = (await request.json()) as VitalsBody;
  } catch {
    return withCors(NextResponse.json({ error: "invalid JSON body" }, { status: 400 }));
  }
  if (!body || typeof body !== "object") {
    return withCors(NextResponse.json({ error: "invalid JSON body" }, { status: 400 }));
  }

  const present = METRICS.filter((m) => body![m.key] !== undefined && body![m.key] !== null);
  if (present.length === 0) {
    return withCors(NextResponse.json({ error: "at least one metric is required" }, { status: 400 }));
  }
  for (const m of present) {
    if (!inRange(body[m.key], m.min, m.max)) {
      return withCors(
        NextResponse.json({ error: `${m.key} out of range (${m.min}–${m.max})` }, { status: 400 })
      );
    }
  }

  const auth = await requireAuth(request);
  let userId: string | null = null;
  if (auth.ok) {
    userId = auth.user.id;
  } else {
    // Companion path: a valid link token attributes the check-in to the
    // account that generated it; otherwise fall back to the device id.
    const linkedUserId = verifyLinkToken(body.linkToken);
    if (linkedUserId) {
      userId = linkedUserId;
    } else {
      const deviceId = body.deviceId;
      if (typeof deviceId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(deviceId)) {
        return withCors(
          NextResponse.json({ error: "deviceId or linkToken required for unauthenticated check-ins" }, { status: 400 })
        );
      }
      userId = `device:${deviceId}`;
    }
  }

  const capturedAt =
    typeof body.capturedAt === "string" && !Number.isNaN(Date.parse(body.capturedAt))
      ? new Date(body.capturedAt)
      : new Date();
  if (capturedAt.getTime() > Date.now() + 60_000) {
    return withCors(NextResponse.json({ error: "capturedAt is in the future" }, { status: 400 }));
  }

  // Persist each metric as a daily aggregate observation.
  const recorded: string[] = [];
  for (const m of present) {
    const value = body[m.key] as number;
    await upsertWearableObservation({
      userId,
      source: "camera_vitals",
      metricType: m.metricType,
      recordedAt: capturedAt,
      recordedDate: new Date(capturedAt.getFullYear(), capturedAt.getMonth(), capturedAt.getDate()),
      value,
      unit: m.unit,
      confidence: "medium",
    });
    recorded.push(m.metricType);
  }

  // Deltas vs the 28-day personal baseline (same window the wearable trend uses).
  const deltas: Record<string, { value: number; baseline: number; deltaPct: number } | null> = {};
  for (const m of present) {
    const value = body[m.key] as number;
    const stats = await getBaselineStats({
      userId,
      metricType: m.metricType,
      recordedAt: capturedAt,
      windowDays: 28,
    });
    deltas[m.metricType] = stats
      ? { value, baseline: Math.round(stats.avg * 10) / 10, deltaPct: Math.round(((value - stats.avg) / stats.avg) * 100) }
      : null;
  }

  // Deterministic wellness insight — largest deviation wins the narrative.
  const entries = Object.entries(deltas).filter(([, d]) => d !== null) as [
    string,
    { value: number; baseline: number; deltaPct: number },
  ][];
  let insight = "First camera check-in on record — your baseline starts forming with each session.";
  let action = "Keep checking in daily; your personal baseline firms up after about a week of readings.";

  if (entries.length > 0) {
    const [metric, d] = entries.reduce((a, b) => (Math.abs(b[1].deltaPct) > Math.abs(a[1].deltaPct) ? b : a));
    const label =
      metric === "breathing_rate" ? "breathing rate"
      : metric === "pulse_bpm" ? "pulse"
      : metric === "hrv_rmssd" ? "heart-rate variability"
      : "heart-rate variability (SDNN)";
    if (d.deltaPct > 15) {
      insight = `Your ${label} is running ${d.deltaPct}% above your usual — your body may be carrying more load than normal today.`;
      action = metric.startsWith("hrv")
        ? "Protect recovery tonight: earlier wind-down, no late caffeine, and a few minutes of slow breathing before bed."
        : "Try ten slow breaths — in through the nose, out through the mouth — and notice whether the number settles.";
    } else if (d.deltaPct < -15) {
      insight = `Your ${label} is ${Math.abs(d.deltaPct)}% below your usual — a quieter signal than your baseline.`;
      action = "Log how today felt alongside the number; patterns across days are more useful than any single reading.";
    } else {
      insight = `Your ${label} is close to your usual range — steady ground today.`;
      action = "One safe action: a two-minute walk. Movement is the cheapest recovery signal there is.";
    }
  }

  return withCors(NextResponse.json({ ok: true, recorded, deltas, insight, action }));
}
