import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../client";
import {
  wearableObservations,
  type NewWearableObservation,
} from "../schema";

export async function createWearableObservation(data: NewWearableObservation) {
  const [obs] = await db
    .insert(wearableObservations)
    .values(data)
    .returning();
  return obs;
}

export async function upsertWearableObservation(data: NewWearableObservation) {
  const [obs] = await db
    .insert(wearableObservations)
    .values(data)
    .onConflictDoUpdate({
      target: [
        wearableObservations.userId,
        wearableObservations.source,
        wearableObservations.metricType,
        wearableObservations.recordedDate,
      ],
      set: {
        value: data.value,
        unit: data.unit,
        confidence: data.confidence,
        recordedAt: data.recordedAt,
      },
    })
    .returning();
  return obs;
}

export interface PersonalBaselineOptions {
  userId: string;
  metricType: string;
  recordedAt: Date;
  windowDays?: number;
  minSamples?: number;
}

/**
 * Returns the personal rolling average for a metric using observations from
 * the prior `windowDays` calendar days (excluding the current day). Falls back
 * to null when there are fewer than `minSamples` matching rows.
 */
export async function getPersonalBaseline({
  userId,
  metricType,
  recordedAt,
  windowDays = 28,
  minSamples = 3,
}: PersonalBaselineOptions): Promise<number | null> {
  const startOfDay = new Date(
    recordedAt.getFullYear(),
    recordedAt.getMonth(),
    recordedAt.getDate()
  );
  const cutoff = new Date(startOfDay);
  cutoff.setDate(cutoff.getDate() - windowDays);

  const [row] = await db
    .select({
      avg: sql<string | null>`avg(${wearableObservations.value})`,
      count: sql<number>`count(*)`,
    })
    .from(wearableObservations)
    .where(
      and(
        eq(wearableObservations.userId, userId),
        eq(wearableObservations.metricType, metricType),
        gte(wearableObservations.recordedAt, cutoff),
        lt(wearableObservations.recordedAt, startOfDay)
      )
    );

  if (!row || row.count < minSamples) return null;
  const avg = parseFloat(row.avg ?? "0");
  return Number.isFinite(avg) ? avg : null;
}

export interface WearableTrendPoint {
  date: string;
  hrv?: number;
  restingHr?: number;
  deep?: number;
  rem?: number;
  light?: number;
}

/**
 * Returns a per-day summary of wearable observations over the last `days`
 * calendar days. If a day has multiple sources for a metric, values are
 * averaged. HRV_RMSSD and HRV_SDNN are combined under `hrv`.
 */
export async function getWearableTrend(
  userId: string,
  days = 14
): Promise<WearableTrendPoint[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      recordedDate: wearableObservations.recordedDate,
      metricType: wearableObservations.metricType,
      value: wearableObservations.value,
    })
    .from(wearableObservations)
    .where(
      and(
        eq(wearableObservations.userId, userId),
        gte(wearableObservations.recordedDate, cutoff)
      )
    )
    .orderBy(desc(wearableObservations.recordedDate));

  const bucket = new Map<string, { hrv: number[]; restingHr: number[]; deep: number[]; rem: number[]; light: number[] }>();

  for (const r of rows) {
    const d = r.recordedDate as Date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = bucket.get(key) ?? { hrv: [], restingHr: [], deep: [], rem: [], light: [] };

    if (r.metricType === "hrv_rmssd" || r.metricType === "hrv_sdnn") {
      entry.hrv.push(r.value);
    } else if (r.metricType === "resting_hr") {
      entry.restingHr.push(r.value);
    } else if (r.metricType === "sleep_deep_min") {
      entry.deep.push(r.value);
    } else if (r.metricType === "sleep_rem_min") {
      entry.rem.push(r.value);
    } else if (r.metricType === "sleep_light_min") {
      entry.light.push(r.value);
    }

    bucket.set(key, entry);
  }

  const result: WearableTrendPoint[] = [];
  for (const [date, vals] of bucket) {
    const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined);
    result.push({
      date,
      hrv: avg(vals.hrv),
      restingHr: avg(vals.restingHr),
      deep: avg(vals.deep),
      rem: avg(vals.rem),
      light: avg(vals.light),
    });
  }

  return result.sort((a, b) => (a.date > b.date ? 1 : -1));
}

function pctChange(current: number, previous: number): string {
  const delta = ((current - previous) / previous) * 100;
  return `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;
}

/**
 * Formats recent wearable observations into a short LLM-readable summary.
 * Falls back to the latest single-night HRVData if no trend rows exist.
 */
export function formatWearableTrendForPrompt(
  trend: WearableTrendPoint[],
  latestHrv?: { hrvDeltaPercent?: number; baselineHrv?: number; source?: string } | null
): string {
  if (trend.length === 0) {
    if (!latestHrv) return "";
    const current = latestHrv.baselineHrv != null && latestHrv.hrvDeltaPercent != null
      ? Math.round(latestHrv.baselineHrv * (1 + latestHrv.hrvDeltaPercent / 100))
      : latestHrv.baselineHrv ?? 65;
    return `Latest wearable reading: HRV ${current} ms${latestHrv.source ? ` (${latestHrv.source})` : ""}.`;
  }

  const latest = trend[trend.length - 1];
  const prev = trend.length > 1 ? trend[trend.length - 2] : null;
  const prevWeek = trend.length >= 8 ? trend[trend.length - 8] : null;

  const hrvs = trend.map((t) => t.hrv).filter((v): v is number => v != null);
  const hrs = trend.map((t) => t.restingHr).filter((v): v is number => v != null);
  const deeps = trend.map((t) => t.deep).filter((v): v is number => v != null);
  const rems = trend.map((t) => t.rem).filter((v): v is number => v != null);
  const lights = trend.map((t) => t.light).filter((v): v is number => v != null);

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const parts: string[] = [];
  parts.push(`Wearable trend (last ${trend.length} nights, ending ${latest.date}):`);

  if (latest.hrv != null) {
    const avgHrv = avg(hrvs);
    const hrvLine = `HRV: last night ${latest.hrv} ms${avgHrv != null ? `, ${trend.length}-night avg ${avgHrv} ms` : ""}`;
    const vsPrior = prev?.hrv != null ? ` (${pctChange(latest.hrv, prev.hrv)} vs previous night)` : "";
    const vsWeek = prevWeek?.hrv != null ? `, ${pctChange(latest.hrv, prevWeek.hrv)} vs 7 nights ago` : "";
    parts.push(`- ${hrvLine}${vsPrior}${vsWeek}.`);
  }

  if (latest.restingHr != null) {
    const avgHr = avg(hrs);
    parts.push(`- Resting HR: last night ${latest.restingHr} bpm${avgHr != null ? `, avg ${avgHr} bpm` : ""}.`);
  }

  const avgDeep = avg(deeps);
  const avgRem = avg(rems);
  const avgLight = avg(lights);
  if (avgDeep != null || avgRem != null || avgLight != null) {
    const sleepParts: string[] = [];
    if (avgDeep != null) sleepParts.push(`deep ${avgDeep}m`);
    if (avgRem != null) sleepParts.push(`REM ${avgRem}m`);
    if (avgLight != null) sleepParts.push(`light ${avgLight}m`);
    parts.push(`- Sleep stage averages: ${sleepParts.join(", ")}.`);
  }

  return parts.join("\n");
}
