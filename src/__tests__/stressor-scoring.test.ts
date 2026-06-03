import { describe, it, expect } from "vitest";
import { computeLiveScore } from "@/lib/stressor-scoring";
import type { Stressor } from "@/lib/types";

describe("computeLiveScore", () => {
  it("returns 0 for empty stressors", () => {
    expect(computeLiveScore([])).toBe(0);
  });

  it("clamps score to 0–100", () => {
    const many: Stressor[] = Array.from({ length: 20 }, () => ({ type: "alcohol" }));
    expect(computeLiveScore(many)).toBeLessThanOrEqual(100);
    expect(computeLiveScore(many)).toBeGreaterThanOrEqual(0);
  });

  it("scores alcohol as positive debt", () => {
    const score = computeLiveScore([{ type: "alcohol" }]);
    expect(score).toBeGreaterThan(0);
  });

  it("scores care as negative (reducing) debt", () => {
    const alcohol: Stressor[] = [{ type: "alcohol" }];
    const alcoholPlusCare: Stressor[] = [{ type: "alcohol" }, { type: "care" }];
    expect(computeLiveScore(alcoholPlusCare)).toBeLessThan(
      computeLiveScore(alcohol)
    );
  });

  it("applies mobility discount", () => {
    const training: Stressor = {
      type: "training",
      trainingArea: "mobility",
    };
    const genericTraining: Stressor = { type: "training" };
    expect(computeLiveScore([training])).toBeLessThan(
      computeLiveScore([genericTraining])
    );
  });

  it("applies destroyed intensity penalty", () => {
    const normal: Stressor = { type: "training", trainingIntensity: "easy" };
    const destroyed: Stressor = {
      type: "training",
      trainingIntensity: "destroyed",
    };
    expect(computeLiveScore([destroyed])).toBeGreaterThan(
      computeLiveScore([normal])
    );
  });

  it("applies lost_count alcohol penalty", () => {
    const normal: Stressor = { type: "alcohol", alcoholCount: "1-2" };
    const lost: Stressor = { type: "alcohol", alcoholCount: "lost_count" };
    expect(computeLiveScore([lost])).toBeGreaterThan(
      computeLiveScore([normal])
    );
  });

  it("handles multiple stressors cumulatively", () => {
    const single = computeLiveScore([{ type: "alcohol" }]);
    const multi = computeLiveScore([
      { type: "alcohol" },
      { type: "sleep" },
      { type: "stress" },
    ]);
    expect(multi).toBeGreaterThan(single);
  });
});
