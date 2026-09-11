import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries/wearable-observations", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/db/queries/wearable-observations")>();
  return {
    ...mod,
    getBaselineStats: vi.fn(),
    upsertWearableObservation: vi.fn().mockResolvedValue({}),
  };
});

import {
  getBaselineStats,
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
    vi.mocked(getBaselineStats).mockImplementation(async ({ metricType }) =>
      metricType === "hrv_rmssd" ? { avg: 62, count: 12 } : null
    );
    const result = await buildHRVData(baseSnapshot, "user-1");
    expect(result).not.toBeNull();
    expect(result?.baselineHrv).toBe(62);
    expect(result?.hrvDeltaPercent).toBe(Math.round(((55 - 62) / 62) * 100));
    expect(result?.baselineHr).toBe(60); // population fallback for HR
    expect(result?.baselineMaturity).toBe("established");
    expect(result?.recordedAt).toBe("2026-01-15T06:00:00.000Z");
    expect(upsertWearableObservation).toHaveBeenCalled();
  });

  it("marks sparse baselines as forming and stable ones as stable", async () => {
    vi.mocked(getBaselineStats).mockImplementation(async ({ metricType }) =>
      metricType === "hrv_rmssd" ? { avg: 62, count: 4 } : null
    );
    const forming = await buildHRVData(baseSnapshot, "user-1");
    expect(forming?.baselineMaturity).toBe("forming");

    vi.mocked(getBaselineStats).mockImplementation(async ({ metricType }) =>
      metricType === "hrv_rmssd" ? { avg: 62, count: 25 } : null
    );
    const stable = await buildHRVData(baseSnapshot, "user-1");
    expect(stable?.baselineMaturity).toBe("stable");

    vi.mocked(getBaselineStats).mockImplementation(async ({ metricType }) =>
      metricType === "hrv_rmssd" ? { avg: 62, count: 2 } : null
    );
    const sparse = await buildHRVData(baseSnapshot, "user-1");
    expect(sparse?.baselineMaturity).toBeUndefined();
    expect(sparse?.baselineHrv).toBe(65); // too few samples → population
  });

  it("falls back to the source baseline then population constants", async () => {
    vi.mocked(getBaselineStats).mockResolvedValue(null);
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
    vi.mocked(getBaselineStats).mockResolvedValue(null);
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
    vi.mocked(getBaselineStats).mockResolvedValue(null);
    await buildHRVData(baseSnapshot, "user-1");
    expect(upsertWearableObservation).toHaveBeenCalledTimes(5); // hrv, hr, deep, rem, light
  });

  it("does not persist observations for guests", async () => {
    vi.mocked(getBaselineStats).mockResolvedValue(null);
    await buildHRVData(baseSnapshot, null);
    expect(upsertWearableObservation).not.toHaveBeenCalled();
  });
});
