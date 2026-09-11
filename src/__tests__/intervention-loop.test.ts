import { describe, it, expect } from "vitest";
import { pickInterventionAction } from "@/lib/db/queries/debt-sessions";

describe("pickInterventionAction", () => {
  it("prefers the forward-looking 'today' line", () => {
    expect(
      pickInterventionAction({
        rightNow: "Drink a glass of water",
        thisMorning: "Ten minutes of stretching",
        today: "Walk 20 minutes before lunch",
        avoid: "Caffeine after 2pm",
      }),
    ).toBe("Walk 20 minutes before lunch");
  });

  it("falls back through the lines in order", () => {
    expect(
      pickInterventionAction({
        rightNow: "Slow breathing for two minutes",
        thisMorning: "",
        today: "",
        avoid: "Alcohol tonight",
      }),
    ).toBe("Slow breathing for two minutes");

    expect(
      pickInterventionAction({
        rightNow: "",
        thisMorning: "",
        today: "",
        avoid: "Alcohol tonight",
      }),
    ).toBe("Alcohol tonight");
  });

  it("returns null when there is no prescription", () => {
    expect(pickInterventionAction(null)).toBeNull();
    expect(
      pickInterventionAction({ rightNow: "", thisMorning: "", today: "", avoid: "" }),
    ).toBeNull();
  });
});
