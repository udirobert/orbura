import { describe, it, expect } from "vitest";
import { formatWearableTrendForPrompt, type WearableTrendPoint } from "@/lib/db/queries/wearable-observations";

const baseTrend: WearableTrendPoint[] = [
  { date: "2026-01-13", hrv: 50, restingHr: 62, deep: 40, rem: 70, light: 200 },
  { date: "2026-01-14", hrv: 48, restingHr: 63, deep: 42, rem: 72, light: 205 },
  { date: "2026-01-15", hrv: 45, restingHr: 64, deep: 38, rem: 68, light: 198 },
];

describe("formatWearableTrendForPrompt", () => {
  it("summarizes the latest night and 3-night averages", () => {
    const summary = formatWearableTrendForPrompt(baseTrend);
    expect(summary).toContain("last 3 nights");
    expect(summary).toContain("HRV: last night 45 ms");
    expect(summary).toContain("3-night avg 48 ms");
    expect(summary).toContain("-6% vs previous night");
    expect(summary).toContain("Resting HR: last night 64 bpm");
    expect(summary).toContain("avg 63 bpm");
    expect(summary).toContain("Sleep stage averages");
  });

  it("compares to 7 nights ago when enough data exists", () => {
    const extended: WearableTrendPoint[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        date: `2026-01-0${i + 1}`,
        hrv: 55 + i,
        restingHr: 60,
        deep: 40,
        rem: 70,
        light: 200,
      })),
      ...baseTrend,
    ];
    const summary = formatWearableTrendForPrompt(extended);
    expect(summary).toContain("8 nights");
    expect(summary).toContain("vs 7 nights ago");
  });

  it("falls back to a single-night summary when no trend", () => {
    const summary = formatWearableTrendForPrompt([], {
      hrvDeltaPercent: -10,
      baselineHrv: 50,
      source: "garmin_fit",
    });
    expect(summary).toContain("Latest wearable reading");
    expect(summary).toContain("45 ms");
    expect(summary).toContain("garmin_fit");
  });
});
