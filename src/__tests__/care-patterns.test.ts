import { describe, expect, it } from "vitest";
import { buildCarePatternLines } from "@/lib/today/care-patterns";

const NOW = new Date("2026-11-08T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

function obs(
  days: number,
  symptoms: string[],
  symptomSeverity: "mild" | "moderate" | "severe" = "moderate",
  adherence: "taken_as_prescribed" | "missed_one_dose" | "missed_multiple" | "stopped" | "not_started" = "taken_as_prescribed",
) {
  return { checkInAt: daysAgo(days), symptoms, symptomSeverity, adherence } as never;
}

describe("buildCarePatternLines", () => {
  it("returns [] with fewer than 3 observations", () => {
    expect(buildCarePatternLines([obs(1, ["nausea"]), obs(2, ["nausea"])], NOW)).toEqual([]);
  });

  it("returns [] when observations are outside the 90-day window", () => {
    const old = [obs(100, ["nausea"]), obs(110, ["nausea"]), obs(120, ["nausea"])];
    expect(buildCarePatternLines(old, NOW)).toEqual([]);
  });

  it("names the most frequent symptom when it clears the threshold", () => {
    const lines = buildCarePatternLines(
      [
        obs(30, ["nausea"]), obs(20, ["nausea"]), obs(10, ["fatigue"]),
        obs(5, ["nausea", "dizziness"]), obs(2, ["nausea"]),
      ],
      NOW,
    );
    expect(lines.some((l) => l.includes("nausea is your most frequent check-in symptom"))).toBe(true);
  });

  it("does not name a symptom reported in only one check-in", () => {
    const lines = buildCarePatternLines(
      [obs(30, ["nausea"]), obs(20, ["fatigue"]), obs(10, ["headache"])],
      NOW,
    );
    expect(lines.some((l) => l.includes("most frequent"))).toBe(false);
  });

  it("reports easing severity when the recent half is milder", () => {
    const lines = buildCarePatternLines(
      [
        obs(60, ["nausea"], "severe"), obs(50, ["nausea"], "severe"),
        obs(40, ["nausea"], "moderate"), obs(30, ["nausea"], "moderate"),
        obs(20, ["nausea"], "mild"), obs(10, ["nausea"], "mild"),
      ],
      NOW,
    );
    expect(lines.some((l) => l.includes("severity has eased"))).toBe(true);
  });

  it("reports rising severity when the recent half is worse", () => {
    const lines = buildCarePatternLines(
      [
        obs(60, ["nausea"], "mild"), obs(50, ["nausea"], "mild"),
        obs(40, ["nausea"], "moderate"), obs(30, ["nausea"], "moderate"),
        obs(20, ["nausea"], "severe"), obs(10, ["nausea"], "severe"),
      ],
      NOW,
    );
    expect(lines.some((l) => l.includes("severity has risen"))).toBe(true);
  });

  it("flags repeated missed or stopped treatment", () => {
    const lines = buildCarePatternLines(
      [
        obs(30, ["nausea"], "moderate", "missed_one_dose"),
        obs(20, ["nausea"], "moderate", "taken_as_prescribed"),
        obs(10, ["nausea"], "moderate", "missed_multiple"),
        obs(5, ["nausea"], "mild", "stopped"),
      ],
      NOW,
    );
    expect(lines.some((l) => l.includes("missed or stopped treatment in 3"))).toBe(true);
  });

  it("does not flag a single missed dose", () => {
    const lines = buildCarePatternLines(
      [
        obs(30, ["nausea"], "moderate", "missed_one_dose"),
        obs(20, ["nausea"], "moderate", "taken_as_prescribed"),
        obs(10, ["nausea"], "moderate", "taken_as_prescribed"),
      ],
      NOW,
    );
    expect(lines.some((l) => l.includes("missed or stopped"))).toBe(false);
  });
});
