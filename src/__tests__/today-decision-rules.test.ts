import { describe, expect, it } from "vitest";
import { decideToday, type TodayInput } from "@/lib/today/decision-rules";

const NOW = new Date("2026-06-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function base(overrides: Partial<TodayInput> = {}): TodayInput {
  return {
    now: NOW,
    surface: "personal",
    careStartedAt: null,
    openEscalation: false,
    pendingCareAction: null,
    lastCareCheckInAt: null,
    pendingFollowThrough: null,
    lastVitalsAt: null,
    vitalsDeltaPct: null,
    lastWearableAt: null,
    wearableDeltaPct: null,
    lastCheckInAt: null,
    latestDebtScore: null,
    streakDays: 0,
    patternLine: null,
    ...overrides,
  };
}

describe("decideToday", () => {
  it("empty state: no data produces first check-in CTA, never fabricated insight", () => {
    const s = decideToday(base());
    expect(s.headline.freshness).toBe("none");
    expect(s.headline.stateWord).toBe("No data yet");
    expect(s.primaryAction.id).toBe("first-check-in");
    expect(s.secondaryActions[0]?.kind).toBe("scan");
  });

  it("open escalation wins over everything else", () => {
    const s = decideToday(base({
      surface: "care",
      openEscalation: true,
      pendingFollowThrough: { sessionId: 1, action: "walk", date: "2026-06-09", debtScore: 30 },
    }));
    expect(s.headline.stateWord).toBe("Care team reviewing");
    expect(s.primaryAction.kind).toBe("check-in");
    expect(s.context.openEscalation).toBe(true);
  });

  it("care patient gets clinic action when one is pending", () => {
    const s = decideToday(base({
      surface: "care",
      pendingCareAction: { id: "i1", action: "Drink 500ml water", dueAt: "2026-06-10T18:00:00Z" },
      lastCareCheckInAt: new Date(NOW.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      careStartedAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
    }));
    expect(s.primaryAction.kind).toBe("care-action");
    expect(s.primaryAction.label).toBe("Drink 500ml water");
    expect(s.context.treatmentWeek).toBe(2);
    expect(s.primaryAction.detail).toContain("week 2");
  });

  it("care patient without pending action still gets a check-in", () => {
    const s = decideToday(base({ surface: "care", careStartedAt: null }));
    expect(s.primaryAction.id).toBe("care-check-in");
    expect(s.headline.stateWord).toBe("No data yet");
  });

  it("unanswered follow-through outranks fresh vitals", () => {
    const s = decideToday(base({
      pendingFollowThrough: { sessionId: 7, action: "10-min walk", date: "2026-06-09", debtScore: 40 },
      lastVitalsAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      vitalsDeltaPct: -12,
    }));
    expect(s.primaryAction.kind).toBe("follow-through");
    expect(s.primaryAction.sessionId).toBe(7);
    expect(s.headline.stateWord).toBe("Below baseline");
  });

  it("fresh camera vitals produce delta headline + rescan secondary", () => {
    const s = decideToday(base({
      lastVitalsAt: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      vitalsDeltaPct: -8,
    }));
    expect(s.headline.stateWord).toBe("Slightly below baseline");
    expect(s.headline.deltaPct).toBe(-8);
    expect(s.headline.freshness).toBe("fresh");
    expect(s.primaryAction.id).toBe("steady-check-in");
    expect(s.secondaryActions.some((a) => a.id === "rescan")).toBe(true);
  });

  it("stale everything nudges a check-in", () => {
    const s = decideToday(base({
      lastVitalsAt: new Date(NOW.getTime() - 5 * DAY).toISOString(),
      vitalsDeltaPct: 5,
      lastCheckInAt: new Date(NOW.getTime() - 4 * DAY).toISOString(),
      latestDebtScore: 30,
    }));
    expect(s.headline.freshness).toBe("stale");
    expect(s.primaryAction.id).toBe("stale-check-in");
  });

  it("steady state keeps the action budget small", () => {
    const s = decideToday(base({
      lastVitalsAt: new Date(NOW.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      vitalsDeltaPct: 2,
      streakDays: 5,
      patternLine: "Your scores tend to be higher on Monday (avg 34).",
    }));
    expect(s.primaryAction.id).toBe("steady-check-in");
    expect(s.primaryAction.detail).toContain("5-day streak");
    expect(s.secondaryActions.length).toBeLessThanOrEqual(2);
    expect(s.context.patternLine).toContain("Monday");
  });

  it("no secondary actions exceed two", () => {
    const s = decideToday(base({
      lastVitalsAt: new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(),
      vitalsDeltaPct: 0,
      lastWearableAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    }));
    expect(s.secondaryActions.length).toBeLessThanOrEqual(2);
  });
});
