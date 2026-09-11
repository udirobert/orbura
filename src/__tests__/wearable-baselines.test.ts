import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries/wearable-observations", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/db/queries/wearable-observations")>();
  return {
    ...mod,
    getPersonalBaseline: vi.fn(),
    upsertWearableObservation: vi.fn().mockResolvedValue({}),
  };
});

import {
  getPersonalBaseline,
  upsertWearableObservation,
} from "@/lib/db/queries/wearable-observations";
import { buildHRVData, type WearableSnapshot } from "@/lib/baselines";

const baseSnapshot: WearableSnapshot = {
  source: "garmin_fit",
  recordedAt: new Date("2026-01-15T06:00:00Z"),
  hrvValue: 55,
  hrvMetric: "hrv_rmssd",
  restingHr: 58,
  sleepStages: { deep: 45, rem: 75, light: 210 },
  confidence: "high",
};

describe("buildHRVData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a personal baseline when available", async () => {
    vi.mocked(getPersonalBaseline).mockImplementation(async ({ metricType }) =>
      metricType === "hrv_rmssd" ? 62 : null
    );
    const result = await buildHRVData(baseSnapshot, "user-1");
    expect(result).not.toBeNull();
    expect(result?.baselineHrv).toBe(62);
    expect(result?.hrvDeltaPercent).toBe(Math.round(((55 - 62) / 62) * 100));
    expect(result?.baselineHr).toBe(60); // population fallback for HR
    expect(upsertWearableObservation).toHaveBeenCalled();
  });

  it("falls back to the source baseline then population constants", async () => {
    vi.mocked(getPersonalBaseline).mockResolvedValue(null);
    const snapshot: WearableSnapshot = {
      ...baseSnapshot,
      fallbackBaselineHrv: 70,
      fallbackBaselineHr: 58,
    };
    const result = await buildHRVData(snapshot, "user-1");
    expect(result?.baselineHrv).toBe(70);
    expect(result?.baselineHr).toBe(58);
  });

  it("derives an HRV delta from resting HR when HRV is missing", async () => {
    vi.mocked(getPersonalBaseline).mockResolvedValue(null);
    const snapshot: WearableSnapshot = {
      source: "apple_health",
      recordedAt: new Date("2026-01-15T06:00:00Z"),
      restingHr: 70,
      confidence: "medium",
    };
    const result = await buildHRVData(snapshot, "user-1");
    expect(result).not.toBeNull();
    expect(result?.hrvDeltaPercent).toBeLessThan(0);
    expect(result?.baselineHrv).toBe(65); // population
    expect(result?.baselineHr).toBe(60); // population
  });

  it("returns null when neither HRV nor resting HR is present", async () => {
    const snapshot: WearableSnapshot = {
      source: "manual_proxy",
      recordedAt: new Date("2026-01-15T06:00:00Z"),
      confidence: "low",
    };
    const result = await buildHRVData(snapshot, "user-1");
    expect(result).toBeNull();
  });

  it("persists observations for an authenticated user", async () => {
    vi.mocked(getPersonalBaseline).mockResolvedValue(null);
    await buildHRVData(baseSnapshot, "user-1");
    expect(upsertWearableObservation).toHaveBeenCalledTimes(5); // hrv, hr, deep, rem, light
  });

  it("does not persist observations for guests", async () => {
    vi.mocked(getPersonalBaseline).mockResolvedValue(null);
    await buildHRVData(baseSnapshot, null);
    expect(upsertWearableObservation).not.toHaveBeenCalled();
  });
});
