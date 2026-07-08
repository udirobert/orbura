import { describe, it, expect } from "vitest";
import { intakeStressors } from "@/stressors";
import { getSystemsScience } from "@/components/screens/evidence/systems-science";

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
