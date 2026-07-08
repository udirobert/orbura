import { describe, it, expect, vi, afterEach } from "vitest";
import {
  computeSystemScores,
  circadianPenaltyBrain,
  formatClearanceTime,
} from "@/stressors";
import type { Stressor } from "@/lib/types";

// Pin dates for deterministic tests
const NOW = new Date("2026-06-03T10:00:00Z"); // Wednesday 10:00 AM UTC

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScoreGetter(now: Date, wakeTime?: string | null, bedTime?: string | null) {
  return (stressors: Stressor[]) => {
    const scores = computeSystemScores(stressors, now, wakeTime, bedTime);
    const bySystem = Object.fromEntries(scores.map((s) => [s.system, s]));
    return { scores, bySystem };
  };
}

const T = makeScoreGetter(NOW);

// ─── computeSystemScores ─────────────────────────────────────────────────────

describe("computeSystemScores", () => {
  it("returns all zero scores for empty stressors", () => {
    const { scores, bySystem } = T([]);
    expect(scores).toHaveLength(5);
    expect(bySystem.liver.score).toBe(0);
    expect(bySystem.brain.score).toBe(0);
    expect(bySystem.cardiovascular.score).toBe(0);
    expect(bySystem.muscular.score).toBe(0);
    expect(bySystem.gut.score).toBe(0);
  });

  it("returns metadata for each system", () => {
    const { scores } = T([]);
    expect(scores.map((s) => s.system).sort()).toEqual([
      "brain", "cardiovascular", "gut", "liver", "muscular",
    ]);
    expect(scores[0]).toHaveProperty("label");
    expect(scores[0]).toHaveProperty("icon");
    expect(scores[0]).toHaveProperty("clearedAt");
    expect(scores[0]).toHaveProperty("causeText");
    expect(scores[0]).toHaveProperty("actionText");
    expect(scores[0]).toHaveProperty("scienceFact");
    expect(scores[0]).toHaveProperty("scienceCite");
  });

  describe("alcohol", () => {
    it("adds liver, brain, gut, and cardio debt", () => {
      const { bySystem } = T([{ type: "alcohol" }]);
      expect(bySystem.liver.score).toBeGreaterThan(0);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.gut.score).toBeGreaterThan(0);
      expect(bySystem.cardiovascular.score).toBeGreaterThan(0);
      expect(bySystem.muscular.score).toBe(0);
    });

    it("produces sensible causeText for alcohol", () => {
      const { bySystem } = T([{ type: "alcohol", alcoholType: "red_wine", alcoholCount: "3-4" }]);
      expect(bySystem.liver.causeText.toLowerCase()).toContain("red wine");
      expect(bySystem.gut.causeText.toLowerCase()).not.toContain("no significant");
    });

    it("spirits produce more liver/brain load than beer", () => {
      const beer = T([{ type: "alcohol", alcoholType: "beer", alcoholCount: "3-4" }]);
      const spirits = T([{ type: "alcohol", alcoholType: "spirits", alcoholCount: "3-4" }]);
      expect(spirits.bySystem.liver.score).toBeGreaterThan(beer.bySystem.liver.score);
      expect(spirits.bySystem.brain.score).toBeGreaterThan(beer.bySystem.brain.score);
    });

    it("lost_count produces more debt than 1-2 drinks", () => {
      const light = T([{ type: "alcohol", alcoholCount: "1-2" }]);
      const lost = T([{ type: "alcohol", alcoholCount: "lost_count" }]);
      expect(lost.bySystem.liver.score).toBeGreaterThan(light.bySystem.liver.score);
    });

    it("champagne has lower liver load than spirits", () => {
      const champagne = T([{ type: "alcohol", alcoholType: "champagne", alcoholCount: "3-4" }]);
      const spirits = T([{ type: "alcohol", alcoholType: "spirits", alcoholCount: "3-4" }]);
      expect(champagne.bySystem.liver.score).toBeLessThan(spirits.bySystem.liver.score);
    });
  });

  describe("training", () => {
    it("adds muscular and cardio debt", () => {
      const { bySystem } = T([{ type: "training" }]);
      expect(bySystem.muscular.score).toBeGreaterThan(0);
      expect(bySystem.cardiovascular.score).toBeGreaterThan(0);
    });

    it("produces sensible causeText for training", () => {
      const { bySystem } = T([{ type: "training", trainingArea: "legs", trainingIntensity: "destroyed" }]);
      expect(bySystem.muscular.causeText.toLowerCase()).toContain("legs");
      expect(bySystem.muscular.causeText.toLowerCase()).toContain("destroyed");
    });

    it("mobility training reduces debt (negative modifiers clamped to 0)", () => {
      const { bySystem } = T([{ type: "training", trainingArea: "mobility" }]);
      expect(bySystem.muscular.score).toBe(0);
    });

    it("destroyed intensity produces more debt than easy", () => {
      const easy = T([{ type: "training", trainingArea: "legs", trainingIntensity: "easy" }]);
      const destroyed = T([{ type: "training", trainingArea: "legs", trainingIntensity: "destroyed" }]);
      expect(destroyed.bySystem.muscular.score).toBeGreaterThan(easy.bySystem.muscular.score);
    });

    it("hiit produces more cardio debt than upper body", () => {
      const hiit = T([{ type: "training", trainingArea: "hiit" }]);
      const upper = T([{ type: "training", trainingArea: "upper" }]);
      expect(hiit.bySystem.cardiovascular.score).toBeGreaterThan(upper.bySystem.cardiovascular.score);
    });
  });

  describe("sleep", () => {
    it("adds brain and gut debt", () => {
      const { bySystem } = T([{ type: "sleep" }]);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.gut.score).toBeGreaterThan(0);
    });

    it("produces sensible causeText for poor sleep", () => {
      const { bySystem } = T([{ type: "sleep", sleepHours: "under_4" }]);
      expect(bySystem.brain.causeText.toLowerCase()).toContain("cognitive recovery");
    });

    it("under_4 hours produces more brain debt than 6-7 hours", () => {
      const bad = T([{ type: "sleep", sleepHours: "under_4" }]);
      const ok = T([{ type: "sleep", sleepHours: "6-7" }]);
      expect(bad.bySystem.brain.score).toBeGreaterThan(ok.bySystem.brain.score);
      expect(bad.bySystem.gut.score).toBeGreaterThan(ok.bySystem.gut.score);
    });
  });

  describe("stress", () => {
    it("adds brain and cardio debt", () => {
      const { bySystem } = T([{ type: "stress" }]);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.cardiovascular.score).toBeGreaterThan(0);
    });

    it("mostly_gone stress produces less debt than carried stress", () => {
      const carried = T([{ type: "stress" }]);
      const gone = T([{ type: "stress", stressCarried: "mostly_gone" }]);
      expect(carried.bySystem.brain.score).toBeGreaterThan(gone.bySystem.brain.score);
      expect(carried.bySystem.cardiovascular.score).toBeGreaterThan(gone.bySystem.cardiovascular.score);
    });
  });

  describe("ill", () => {
    it("adds gut, brain, muscular, and cardio debt", () => {
      const { bySystem } = T([{ type: "ill" }]);
      expect(bySystem.gut.score).toBeGreaterThan(0);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.muscular.score).toBeGreaterThan(0);
      expect(bySystem.cardiovascular.score).toBeGreaterThan(0);
    });

    it("floored severity produces more debt than mild", () => {
      const mild = T([{ type: "ill", illSeverity: "mild" }]);
      const floored = T([{ type: "ill", illSeverity: "floored" }]);
      expect(floored.bySystem.gut.score).toBeGreaterThan(mild.bySystem.gut.score);
      expect(floored.bySystem.brain.score).toBeGreaterThan(mild.bySystem.brain.score);
    });
  });

  describe("care", () => {
    it("reduces scores across all systems", () => {
      const alcoholOnly = T([{ type: "alcohol", alcoholCount: "3-4" }]);
      const alcoholPlusCare = T([{ type: "alcohol", alcoholCount: "3-4" }, { type: "care" }]);
      expect(alcoholPlusCare.bySystem.brain.score).toBeLessThan(alcoholOnly.bySystem.brain.score);
      expect(alcoholPlusCare.bySystem.cardiovascular.score).toBeLessThan(alcoholOnly.bySystem.cardiovascular.score);
      expect(alcoholPlusCare.bySystem.liver.score).toBeLessThan(alcoholOnly.bySystem.liver.score);
    });
  });

  describe("fan stressors (emotional / mental debt)", () => {
    it("result adds brain, cardio, and gut debt", () => {
      const { bySystem } = T([{ type: "result", matchResult: "lost" }]);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.cardiovascular.score).toBeGreaterThan(0);
      expect(bySystem.gut.score).toBeGreaterThan(0);
      expect(bySystem.liver.score).toBe(0);
    });

    it("a knockout hurts more than a comfortable win", () => {
      const out = T([{ type: "result", matchResult: "knocked_out" }]);
      const win = T([{ type: "result", matchResult: "won_big" }]);
      expect(out.bySystem.brain.score).toBeGreaterThan(win.bySystem.brain.score);
      expect(out.bySystem.cardiovascular.score).toBeGreaterThan(win.bySystem.cardiovascular.score);
    });

    it("a shootout drives more cardiovascular load than a comfortable watch", () => {
      const shootout = T([{ type: "match_tension", matchTension: "shootout" }]);
      const comfy = T([{ type: "match_tension", matchTension: "comfortable" }]);
      expect(shootout.bySystem.cardiovascular.score).toBeGreaterThan(comfy.bySystem.cardiovascular.score);
    });

    it("doomscrolling loads the brain and mentions screens/rumination in causeText", () => {
      const { bySystem } = T([{ type: "doomscroll", doomscrollAmount: "hours" }]);
      expect(bySystem.brain.score).toBeGreaterThan(0);
      expect(bySystem.brain.causeText.toLowerCase()).toMatch(/scroll|blue light|takes/);
    });

    it("a loss produces emotional causeText and a 'walk' recovery action", () => {
      const { bySystem } = T([{ type: "result", matchResult: "lost" }]);
      expect(bySystem.brain.causeText.toLowerCase()).toContain("lost");
      expect(bySystem.brain.actionText.toLowerCase()).toContain("walk");
    });

    it("surfaces fan-specific science (NEJM World Cup finding) in fan mode only", () => {
      const fan = computeSystemScores([{ type: "match_tension", matchTension: "shootout" }], NOW, null, null, "fan");
      const personal = computeSystemScores([{ type: "match_tension", matchTension: "shootout" }], NOW, null, null, "personal");
      const fanCardio = fan.find((s) => s.system === "cardiovascular");
      const personalCardio = personal.find((s) => s.system === "cardiovascular");
      expect(fanCardio?.scienceCite).toContain("Wilbert-Lampen");
      expect(personalCardio?.scienceCite).not.toContain("Wilbert-Lampen");
    });
  });

  describe("scores are clamped 0-100", () => {
    it("never exceeds 100 or goes below 0", () => {
      const many: Stressor[] = [
        { type: "alcohol", alcoholType: "spirits", alcoholCount: "lost_count" },
        { type: "alcohol", alcoholType: "spirits", alcoholCount: "lost_count" },
        { type: "alcohol", alcoholType: "spirits", alcoholCount: "lost_count" },
        { type: "alcohol", alcoholType: "spirits", alcoholCount: "lost_count" },
        { type: "training", trainingArea: "legs", trainingIntensity: "destroyed" },
        { type: "training", trainingArea: "legs", trainingIntensity: "destroyed" },
        { type: "sleep", sleepHours: "under_4" },
        { type: "ill", illSeverity: "floored" },
      ];
      const { scores } = T(many);
      scores.forEach((s) => {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("circadian penalty is applied", () => {
    it("adds brain and cardio points with late bedtime", () => {
      const wBed = makeScoreGetter(NOW, "7:00 AM", "2:30 AM");
      const noBed = makeScoreGetter(NOW);
      const stressors: Stressor[] = [{ type: "sleep", sleepHours: "6-7" }];
      const withPenalty = wBed(stressors);
      const withoutPenalty = noBed(stressors);
      expect(withPenalty.bySystem.brain.score).toBeGreaterThan(withoutPenalty.bySystem.brain.score);
      expect(withPenalty.bySystem.cardiovascular.score).toBeGreaterThan(withoutPenalty.bySystem.cardiovascular.score);
    });

    it("does not add penalty when bed/wake are aligned (before midnight)", () => {
      const aligned = makeScoreGetter(NOW, "7:00 AM", "10:30 PM");
      const noTiming = makeScoreGetter(NOW);
      const stressors: Stressor[] = [{ type: "sleep", sleepHours: "6-7" }];
      const withAligned = aligned(stressors);
      const without = noTiming(stressors);
      expect(withAligned.bySystem.brain.score).toBe(without.bySystem.brain.score);
    });
  });
});

// ─── circadianPenaltyBrain ───────────────────────────────────────────────────

describe("circadianPenaltyBrain", () => {
  it("returns aligned (0 pts) for bedtime before midnight", () => {
    const result = circadianPenaltyBrain("10:30 PM", "7:00 AM");
    expect(result.brainPts).toBe(0);
    expect(result.cardioPts).toBe(0);
    expect(result.label).toBe("aligned");
  });

  it("returns mild misalignment for 12am-2am bedtime", () => {
    const result = circadianPenaltyBrain("1:00 AM", "8:00 AM");
    expect(result.brainPts).toBe(10);
    expect(result.cardioPts).toBe(5);
    expect(result.label).toBe("mild misalignment");
  });

  it("returns significant misalignment for 2am-4am bedtime", () => {
    const result = circadianPenaltyBrain("3:00 AM", "9:00 AM");
    expect(result.brainPts).toBe(22);
    expect(result.cardioPts).toBe(10);
  });

  it("returns severe misalignment for 4am-6am bedtime with sufficient wake time", () => {
    const result = circadianPenaltyBrain("5:00 AM", "2:00 PM");
    expect(result.brainPts).toBe(32);
    expect(result.cardioPts).toBe(16);
  });

  it("stacks short sleep penalty when sleep < 6hrs with late bedtime", () => {
    const result = circadianPenaltyBrain("2:00 AM", "6:00 AM");
    expect(result.brainPts).toBe(30); // 22 + 8
    expect(result.cardioPts).toBe(10);
  });

  it("handles wrapped sleep (bed > wake) correctly", () => {
    const result = circadianPenaltyBrain("11:00 PM", "6:00 AM");
    expect(result.brainPts).toBe(0);
  });

  it("returns 0 for invalid time strings", () => {
    const result = circadianPenaltyBrain("invalid", "7:00 AM");
    expect(result.brainPts).toBe(0);
    expect(result.cardioPts).toBe(0);
    expect(result.label).toBe("unknown");
  });

  it("returns 0 when both times are invalid", () => {
    const result = circadianPenaltyBrain("", "");
    expect(result.brainPts).toBe(0);
    expect(result.cardioPts).toBe(0);
  });

  it("short sleep penalty applies even with aligned bedtime", () => {
    const result = circadianPenaltyBrain("10:30 PM", "3:00 AM");
    expect(result.brainPts).toBeGreaterThan(0);
  });
});

// ─── formatClearanceTime ─────────────────────────────────────────────────────

describe("formatClearanceTime", () => {
  it('returns "Cleared now" for past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const past = new Date(NOW.getTime() - 3600000).toISOString();
    expect(formatClearanceTime(past)).toBe("Cleared now");
  });

  it("returns today time for times later today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const later = new Date(NOW.getTime() + 4 * 3600000);
    const result = formatClearanceTime(later.toISOString());
    expect(result).toMatch(/today/);
  });

  it("returns tomorrow time for tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const tomorrow = new Date(NOW.getTime() + 30 * 3600000);
    const result = formatClearanceTime(tomorrow.toISOString());
    expect(result).toMatch(/tomorrow/);
  });

  it("returns day count for far future (2+ days)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const far = new Date(NOW.getTime() + 72 * 3600000); // 3 days
    const result = formatClearanceTime(far.toISOString());
    expect(result).toMatch(/in \d+ days?/);
  });

  it("uses plural 'days' for 2+ days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const twoDaysAway = new Date(NOW.getTime() + 54 * 3600000); // ~2.25 days
    const result = formatClearanceTime(twoDaysAway.toISOString());
    expect(result).toContain("days");
  });
});
