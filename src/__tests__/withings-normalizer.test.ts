import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getWithingsToken: vi.fn(),
  saveWithingsToken: vi.fn(),
}));

import { fetchWithingsHRV } from "@/lib/wearables/withings";
import { getWithingsToken } from "@/lib/db/queries";

const validToken = {
  userId: "u1",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  withingsUserId: "12345",
  scope: null,
  expiresAt: new Date(Date.now() + 3600 * 1000),
};

function sleepSummaryResponse(series: unknown[]) {
  return {
    json: () =>
      Promise.resolve({
        status: 0,
        body: { series },
      }),
  } as unknown as Response;
}

function measureResponse(measuregrps: unknown[]) {
  return {
    json: () =>
      Promise.resolve({
        status: 0,
        body: { measuregrps },
      }),
  } as unknown as Response;
}

/** Routes mocked fetch by URL — sleep summary vs measure endpoint. */
function mockWithingsFetch(series: unknown[], measuregrps: unknown[] = []) {
  globalThis.fetch = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("/measure")) {
      return Promise.resolve(measureResponse(measuregrps));
    }
    return Promise.resolve(sleepSummaryResponse(series));
  });
}

describe("fetchWithingsHRV", () => {
  beforeEach(() => {
    vi.mocked(getWithingsToken).mockResolvedValue(validToken);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the latest night and averages start/end RMSSD", async () => {
    mockWithingsFetch([
      {
        date: "2026-01-14",
        startdate: 1736822400,
        enddate: 1736851200,
        data: {
          hr_average: 62,
          rmssd_start_avg: 48,
          rmssd_end_avg: 52,
          deepsleepduration: 2700,
          remsleepduration: 4500,
          lightsleepduration: 12600,
        },
      },
      {
        date: "2026-01-15",
        startdate: 1736908800,
        enddate: 1736937600,
        data: {
          hr_average: 60,
          rmssd_start_avg: 50,
          rmssd_end_avg: 54,
          deepsleepduration: 3000,
          remsleepduration: 4800,
          lightsleepduration: 13200,
        },
      },
    ]);

    const snapshot = await fetchWithingsHRV("u1");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.source).toBe("withings");
    expect(snapshot?.hrvValue).toBe(52); // avg(50, 54)
    expect(snapshot?.restingHr).toBe(60);
    expect(snapshot?.sleepStages).toEqual({ deep: 50, rem: 80, light: 220 });
    expect(snapshot?.confidence).toBe("high");
    expect(snapshot?.hrvMetric).toBe("hrv_rmssd");
  });

  it("falls back to medium confidence when only HR is available", async () => {
    mockWithingsFetch([
      {
        date: "2026-01-15",
        startdate: 1736908800,
        enddate: 1736937600,
        data: {
          hr_average: 64,
          deepsleepduration: 3000,
          remsleepduration: 4800,
          lightsleepduration: 13200,
        },
      },
    ]);

    const snapshot = await fetchWithingsHRV("u1");
    expect(snapshot?.hrvValue).toBeUndefined();
    expect(snapshot?.restingHr).toBe(64);
    expect(snapshot?.confidence).toBe("medium");
  });

  it("attaches weight and BP from the latest measure group", async () => {
    mockWithingsFetch(
      [
        {
          date: "2026-01-15",
          startdate: 1736908800,
          enddate: 1736937600,
          data: { hr_average: 60, rmssd_start_avg: 50, rmssd_end_avg: 54 },
        },
      ],
      [
        {
          grpid: 1,
          date: 1736900000,
          measures: [{ type: 1, value: 800, unit: -1 }],
        },
        {
          grpid: 2,
          date: 1736950000,
          measures: [
            { type: 1, value: 824, unit: -1 },   // 82.4 kg
            { type: 9, value: 800, unit: -1 },   // 80.0 mmHg diastolic
            { type: 10, value: 1200, unit: -1 }, // 120.0 mmHg systolic
          ],
        },
      ],
    );

    const snapshot = await fetchWithingsHRV("u1");
    expect(snapshot?.measures).toEqual({
      weightKg: 82.4,
      bpSystolic: 120,
      bpDiastolic: 80,
      recordedAt: new Date(1736950000 * 1000),
    });
  });

  it("omits measures when the measure endpoint returns nothing", async () => {
    mockWithingsFetch(
      [
        {
          date: "2026-01-15",
          startdate: 1736908800,
          enddate: 1736937600,
          data: { hr_average: 60, rmssd_start_avg: 50, rmssd_end_avg: 54 },
        },
      ],
      [],
    );

    const snapshot = await fetchWithingsHRV("u1");
    expect(snapshot?.measures).toBeUndefined();
  });

  it("returns null when no token exists", async () => {
    vi.mocked(getWithingsToken).mockResolvedValue(null);
    const snapshot = await fetchWithingsHRV("u1");
    expect(snapshot).toBeNull();
  });
});
