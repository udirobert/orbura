import { describe, it, expect } from "vitest";
import { intakeStressors } from "@/stressors";
import { getSystemsScience } from "@/components/screens/evidence/systems-science";
import { computeScore } from "@/app/api/analyze/score/route";
import type { AnalyzeBodyRequest } from "@/lib/types";

// ─── Fan intake ordering ─────────────────────────────────────────────────────

describe("intakeStressors", () => {
  it("leads fan intake with the match stressors, then shared lifestyle ones", () => {
    const order = intakeStressors("fan").map((d) => d.type);
    expect(order.slice(0, 3)).toEqual(["result", "match_tension", "doomscroll"]);
    // Shared lifestyle stressors still present, but after the match ones.
    expect(order).toContain("alcohol");
    expect(order.indexOf("result")).toBeLessThan(order.indexOf("alcohol"));
  });

  it("does not include player-only or fan-excluded stressors in fan intake", () => {
    const types = intakeStressors("fan").map((d) => d.type);
    expect(types).not.toContain("match_minutes"); // football-only
    expect(types).not.toContain("training");      // restricted to personal/football
    expect(types).not.toContain("ill");
  });

  it("leaves non-fan modes in catalog order", () => {
    const personal = intakeStressors("personal").map((d) => d.type);
    const football = intakeStressors("football").map((d) => d.type);
    expect(personal[0]).toBe("alcohol");
    expect(football).toContain("match_minutes");
    expect(football).not.toContain("result"); // fan-only
  });
});

// ─── Mode-aware evidence science ─────────────────────────────────────────────

describe("getSystemsScience", () => {
  const cite = (list: ReturnType<typeof getSystemsScience>, system: string) =>
    list.find((s) => s.system === system)?.cite ?? "";

  it("fan mode surfaces the NEJM World Cup + stress/sleep citations", () => {
    const fan = getSystemsScience("fan");
    expect(cite(fan, "Cardiovascular")).toContain("Wilbert-Lampen");
    expect(cite(fan, "Brain / Cognition")).toContain("Åkerstedt");
  });

  it("non-fan modes keep the base (alcohol-centric) citations", () => {
    const personal = getSystemsScience("personal");
    expect(cite(personal, "Cardiovascular")).toContain("Spaak");
    expect(cite(personal, "Cardiovascular")).not.toContain("Wilbert-Lampen");
  });

  it("only overrides cardiovascular and brain, leaving other systems intact", () => {
    const fan = getSystemsScience("fan");
    const base = getSystemsScience("personal");
    expect(cite(fan, "Liver")).toBe(cite(base, "Liver"));
    expect(cite(fan, "Gut")).toBe(cite(base, "Gut"));
  });
});

// ─── Fan verdict copy ────────────────────────────────────────────────────────
//
// Regression test for a gap found while dogfooding the fan flow: the
// deterministic verdict had a `football` branch but silently fell through to
// the generic personal-mode copy for `fan`, so a knocked-out fan saw
// "Your body is in damage control" instead of anything about the match.

describe("computeScore — fan verdict", () => {
  it("returns fan-specific verdict copy, not the generic personal-mode fallback", () => {
    const body: AnalyzeBodyRequest = {
      stressors: [
        { type: "result", matchResult: "knocked_out" },
        { type: "match_tension", matchTension: "shootout" },
        { type: "doomscroll", doomscrollAmount: "hours" },
        { type: "sleep", sleepHours: "under_4" },
      ],
      mode: "fan",
    };
    const { verdict, debtScore } = computeScore(body);
    expect(debtScore).toBeGreaterThanOrEqual(61);
    expect(verdict).not.toBe("Significant debt. Your body is telling you something.");
    expect(verdict).not.toBe("Your body is in damage control. Listen to it.");
    expect(verdict.toLowerCase()).toMatch(/match|nervous system|wired|adrenaline/);
  });

  it("returns a settled verdict for a light fan session", () => {
    const body: AnalyzeBodyRequest = {
      stressors: [{ type: "result", matchResult: "won_big" }],
      mode: "fan",
    };
    const { verdict } = computeScore(body);
    expect(verdict).toMatch(/settled|didn't leave much/i);
  });
});
