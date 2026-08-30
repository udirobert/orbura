import { describe, it, expect } from "vitest";
import {
  computeSystemScores,
  computeLiveScore,
  computeCounterfactual,
  circadianPenaltyBrain,
} from "@/stressors/scoring";
import type { Stressor, SystemScore } from "@/lib/types";

const NOW = new Date("2026-08-30T12:00:00Z");
const SYSTEMS = ["cardiovascular", "brain", "liver", "muscular", "gut"] as const;

/** Matrix of canonical inputs spanning every modifier table row. */
const S = (s: Record<string, unknown>): Stressor[] => [s as unknown as Stressor];
const CANONICAL_MATRIX: Stressor[][] = [
  [],
  [{ type: "alcohol" }],
  S({ type: "alcohol", alcoholType: "beer" }),
  S({ type: "alcohol", alcoholType: "red_wine" }),
  S({ type: "alcohol", alcoholType: "white_wine" }),
  S({ type: "alcohol", alcoholType: "spirits" }),
  S({ type: "alcohol", alcoholType: "cocktails" }),
  S({ type: "alcohol", alcoholType: "champagne" }),
  S({ type: "alcohol", alcoholCount: "1-2" }),
  S({ type: "alcohol", alcoholCount: "3-4" }),
  S({ type: "alcohol", alcoholCount: "5+" }),
  S({ type: "alcohol", alcoholCount: "lost_count" }),
  [{ type: "training" }],
  S({ type: "training", trainingArea: "legs" }),
  S({ type: "training", trainingArea: "upper" }),
  S({ type: "training", trainingArea: "hiit" }),
  S({ type: "training", trainingArea: "cardio" }),
  S({ type: "training", trainingArea: "mobility" }),
  S({ type: "training", trainingIntensity: "easy" }),
  S({ type: "training", trainingIntensity: "hard" }),
  S({ type: "training", trainingIntensity: "destroyed" }),
  S({ type: "sleep", sleepHours: "under_4" }),
  S({ type: "sleep", sleepHours: "4-6" }),
  S({ type: "sleep", sleepHours: "6-7" }),
  [{ type: "stress" }],
  S({ type: "stress", stressCarried: "mostly_gone" }),
  [{ type: "ill" }],
  [{ type: "doomscroll" }],
  S({ type: "doomscroll", doomscrollAmount: "hours" }),
  // Combined heavy load
  [
    { type: "alcohol", alcoholType: "spirits", alcoholCount: "5+" },
    { type: "training", trainingIntensity: "destroyed" },
    { type: "sleep", sleepHours: "under_4" },
    { type: "stress", stressCarried: "yes" },
    { type: "ill" },
    { type: "doomscroll", doomscrollAmount: "hours" },
  ] as unknown as Stressor[],
];

function score(stressors: Stressor[]): Record<string, SystemScore> {
  const list = computeSystemScores(stressors, NOW);
  return Object.fromEntries(list.map((s) => [s.system, s]));
}

describe("scoring invariants", () => {
  it("every canonical input yields scores bounded to 0–100", () => {
    for (const stressors of CANONICAL_MATRIX) {
      for (const s of computeSystemScores(stressors, NOW)) {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("every canonical input yields finite scores for all five systems", () => {
    for (const stressors of CANONICAL_MATRIX) {
      const list = computeSystemScores(stressors, NOW);
      expect(list.map((s) => s.system).sort()).toEqual([...SYSTEMS].sort());
      for (const s of list) expect(Number.isFinite(s.score)).toBe(true);
    }
  });

  it("hasData contract: untouched systems are hasData=false even when others are loaded", () => {
    // Alcohol touches liver/brain/gut/cardio — never muscular.
    const list = score([
      { type: "alcohol", alcoholType: "spirits", alcoholCount: "5+" },
    ]);
    expect(list.muscular.hasData).toBe(false);
    expect(list.liver.hasData).toBe(true);
    expect(list.brain.hasData).toBe(true);
    expect(list.gut.hasData).toBe(true);
    expect(list.cardiovascular.hasData).toBe(true);
  });

  it("hasData contract: empty input → nothing is 'clear'", () => {
    for (const s of computeSystemScores([], NOW)) {
      expect(s.hasData).toBe(false);
    }
  });

  it("monotonicity: alcoholCount ordering never decreases liver load", () => {
    const order = ["1-2", "3-4", "5+", "lost_count"] as const;
    let prev = -1;
    for (const count of order) {
      const s = score([{ type: "alcohol", alcoholCount: count }]);
      expect(s.liver.score).toBeGreaterThanOrEqual(prev);
      prev = s.liver.score;
    }
  });

  it("mobility training is restorative: load never exceeds generic training", () => {
    const generic = score([{ type: "training" }]);
    const mobility = score([{ type: "training", trainingArea: "mobility" }]);
    // Negative modifiers clamp to 0, so "restorative" means ≤ generic everywhere.
    expect(mobility.brain.score).toBeLessThanOrEqual(generic.brain.score);
    expect(mobility.muscular.score).toBeLessThan(generic.muscular.score);
  });

  it("circadianPenaltyBrain: severity ordering and bounds", () => {
    const mild = circadianPenaltyBrain("01:00", "08:00");
    const sig = circadianPenaltyBrain("03:00", "08:00");
    const severe = circadianPenaltyBrain("05:00", "08:00");
    expect(mild.brainPts).toBeLessThan(sig.brainPts);
    expect(sig.brainPts).toBeLessThan(severe.brainPts);
    for (const r of [mild, sig, severe]) {
      expect(r.brainPts).toBeGreaterThanOrEqual(0);
      expect(r.cardioPts).toBeGreaterThanOrEqual(0);
    }
  });

  it("circadianPenaltyBrain: unparseable times are safe", () => {
    expect(circadianPenaltyBrain("", "08:00")).toEqual({
      brainPts: 0,
      cardioPts: 0,
      label: "unknown",
    });
    expect(circadianPenaltyBrain("nonsense", "08:00").brainPts).toBe(0);
  });

  it("computeLiveScore: bounded and monotonic in alcohol count", () => {
    expect(computeLiveScore([])).toBe(0);
    expect(
      computeLiveScore(Array.from({ length: 50 }, () => ({ type: "alcohol" })))
    ).toBe(100);
    const a = computeLiveScore([{ type: "alcohol", alcoholCount: "1-2" }]);
    const b = computeLiveScore([{ type: "alcohol", alcoholCount: "5+" }]);
    const c = computeLiveScore([{ type: "alcohol", alcoholCount: "lost_count" }]);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("computeLiveScore: unknown stressor types contribute 0", () => {
    expect(
      computeLiveScore([{ type: "nonexistent" } as unknown as Stressor])
    ).toBe(0);
  });

  it("counterfactual: proposes a positive-drop lever for a heavy session", () => {
    const stressors: Stressor[] = [
      { type: "alcohol", alcoholType: "spirits", alcoholCount: "5+" },
      { type: "training", trainingIntensity: "destroyed" },
      { type: "sleep", sleepHours: "under_4" },
    ];
    const scores = computeSystemScores(stressors, NOW);
    const cf = computeCounterfactual(stressors, scores);
    expect(cf).not.toBeNull();
    expect(cf!.drop).toBeGreaterThan(0);
    expect(cf!.toScore).toBeLessThan(cf!.fromScore);
    expect(cf!.leverLabel.length).toBeGreaterThan(0);
  });

  it("counterfactual: returns null when nothing is loaded", () => {
    expect(computeCounterfactual([], computeSystemScores([], NOW))).toBeNull();
  });
});
