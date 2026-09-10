import { getPersonalBaseline, upsertWearableObservation } from "@/lib/db/queries/wearable-observations";
import type { HRVConfidence, HRVData, HRVSource } from "@/lib/types";

export type HrvMetric = "hrv_rmssd" | "hrv_sdnn";

export interface WearableSnapshot {
  source: HRVSource;
  recordedAt: Date;
  hrvValue?: number;
  hrvMetric?: HrvMetric;
  fallbackBaselineHrv?: number;
  restingHr?: number;
  fallbackBaselineHr?: number;
  sleepStages?: { deep: number; rem: number; light: number };
  confidence: HRVConfidence;
}

const POPULATION_BASELINE_HRV = 65;
const POPULATION_BASELINE_HR = 60;

/**
 * Builds an HRVData result from a wearable snapshot. When a userId is supplied,
 * it looks up their personal rolling baseline and writes the snapshot to the
 * canonical observation store for future baselines.
 *
 * Falls back to the provided source-level baselines or population constants
 * when no personal baseline exists yet.
 */
export async function buildHRVData(
  snapshot: WearableSnapshot,
  userId?: string | null
): Promise<HRVData | null> {
  if (snapshot.hrvValue == null && snapshot.restingHr == null) {
    return null;
  }

  const personalHrv =
    userId && snapshot.hrvMetric
      ? await getPersonalBaseline({
          userId,
          metricType: snapshot.hrvMetric,
          recordedAt: snapshot.recordedAt,
        })
      : null;
  const personalHr =
    userId && snapshot.restingHr != null
      ? await getPersonalBaseline({
          userId,
          metricType: "resting_hr",
          recordedAt: snapshot.recordedAt,
        })
      : null;

  const baselineHrv =
    personalHrv ??
    snapshot.fallbackBaselineHrv ??
    POPULATION_BASELINE_HRV;
  const baselineHr =
    personalHr ??
    snapshot.fallbackBaselineHr ??
    POPULATION_BASELINE_HR;

  let hrvDeltaPercent: number;
  if (snapshot.hrvValue != null) {
    hrvDeltaPercent = Math.round(
      ((snapshot.hrvValue - baselineHrv) / baselineHrv) * 100
    );
  } else {
    const hrDelta = (snapshot.restingHr ?? baselineHr) - baselineHr;
    hrvDeltaPercent = Math.max(
      -60,
      Math.min(20, Math.round(-hrDelta * 1.5))
    );
  }

  const result: HRVData = {
    hrvDeltaPercent: Math.max(-80, Math.min(30, hrvDeltaPercent)),
    restingHrDelta:
      snapshot.restingHr != null ? Math.round(snapshot.restingHr - baselineHr) : 0,
    source: snapshot.source,
    confidence: snapshot.confidence,
    baselineHrv,
    baselineHr,
  };

  if (snapshot.sleepStages) {
    result.sleepStages = snapshot.sleepStages;
  }

  if (userId) {
    await writeWearableSnapshot(userId, snapshot).catch(() => {});
  }

  return result;
}

async function writeWearableSnapshot(
  userId: string,
  snapshot: WearableSnapshot
) {
  const recordedDate = new Date(
    snapshot.recordedAt.getFullYear(),
    snapshot.recordedAt.getMonth(),
    snapshot.recordedAt.getDate()
  );

  const base = {
    userId,
    source: snapshot.source,
    recordedAt: snapshot.recordedAt,
    recordedDate,
    confidence: snapshot.confidence,
  };

  const ops: Promise<unknown>[] = [];

  if (snapshot.hrvValue != null && snapshot.hrvMetric) {
    ops.push(
      upsertWearableObservation({
        ...base,
        metricType: snapshot.hrvMetric,
        value: snapshot.hrvValue,
        unit: "ms",
      })
    );
  }

  if (snapshot.restingHr != null) {
    ops.push(
      upsertWearableObservation({
        ...base,
        metricType: "resting_hr",
        value: snapshot.restingHr,
        unit: "bpm",
      })
    );
  }

  if (snapshot.sleepStages) {
    ops.push(
      upsertWearableObservation({
        ...base,
        metricType: "sleep_deep_min",
        value: snapshot.sleepStages.deep,
        unit: "min",
      }),
      upsertWearableObservation({
        ...base,
        metricType: "sleep_rem_min",
        value: snapshot.sleepStages.rem,
        unit: "min",
      }),
      upsertWearableObservation({
        ...base,
        metricType: "sleep_light_min",
        value: snapshot.sleepStages.light,
        unit: "min",
      })
    );
  }

  await Promise.all(ops);
}
