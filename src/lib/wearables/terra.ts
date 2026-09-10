import { buildHRVData, type WearableSnapshot } from "@/lib/baselines";
import type { HRVData } from "@/lib/types";

const TERRA_API_BASE = "https://api.tryterra.co/v2";

export interface TerraHrvResult {
  hrvData: HRVData;
  provider: string;
  rawHrvRmssd: number | null;
  rawRestingHr: number | null;
}

/**
 * Fetches the most recent sleep/HRV data from Terra and returns an HRVData
 * object computed against the user's personal baseline when a userId is given.
 */
export async function fetchTerraHRV(
  terraUserId: string,
  userId: string | null
): Promise<TerraHrvResult | null> {
  const devId = process.env.TERRA_DEV_ID;
  const apiKey = process.env.TERRA_API_KEY;

  if (!devId || !apiKey) {
    return null;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const terraRes = await fetch(
    `${TERRA_API_BASE}/sleep?user_id=${encodeURIComponent(terraUserId)}&start_date=${yesterday}&end_date=${today}&to_webhook=false`,
    { headers: { "dev-id": devId, "x-api-key": apiKey } }
  ).catch(() => null);

  if (!terraRes?.ok) return null;

  const json = await terraRes.json();
  const entry = (json.data ?? [])[0] as Record<string, unknown> | undefined;
  if (!entry) return null;

  const hrData = entry.heart_rate_data as Record<string, unknown> | undefined;
  const sleepData = entry.sleep_durations_data as Record<string, unknown> | undefined;
  const asleep = sleepData?.asleep as Record<string, unknown> | undefined;

  const avgHrvRmssd = (hrData?.avg_hrv_rmssd as number | undefined) ?? null;
  const avgRestingHr = (hrData?.avg_resting_heart_rate as number | undefined) ?? null;
  const deepSecs = (asleep?.duration_deep_sleep_state_seconds as number | undefined) ?? null;
  const remSecs = (asleep?.duration_REM_sleep_state_seconds as number | undefined) ?? null;
  const lightSecs = (asleep?.duration_light_sleep_state_seconds as number | undefined) ?? null;

  if (avgHrvRmssd == null && avgRestingHr == null) return null;

  const sleepStages =
    deepSecs != null || remSecs != null || lightSecs != null
      ? {
          deep: deepSecs != null ? Math.round(deepSecs / 60) : 45,
          rem: remSecs != null ? Math.round(remSecs / 60) : 60,
          light: lightSecs != null ? Math.round(lightSecs / 60) : 180,
        }
      : undefined;

  const snapshot: WearableSnapshot = {
    source: "terra",
    recordedAt: new Date(),
    hrvValue: avgHrvRmssd ?? undefined,
    hrvMetric: "hrv_rmssd",
    restingHr: avgRestingHr ?? undefined,
    sleepStages,
    confidence: avgHrvRmssd != null ? "high" : "medium",
  };

  const hrvData = await buildHRVData(snapshot, userId);
  if (!hrvData) return null;

  return {
    hrvData,
    provider: (entry.provider as string) ?? "wearable",
    rawHrvRmssd: avgHrvRmssd,
    rawRestingHr: avgRestingHr,
  };
}
