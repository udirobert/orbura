import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimeDrum } from "@/components/screens/time-drum";

const SLOTS = ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"];

describe("TimeDrum", () => {
  it("renders all slots", () => {
    render(
      <TimeDrum
        slots={SLOTS}
        selectedIdx={2}
        onSelect={vi.fn()}
      />
    );
    SLOTS.forEach((slot) => {
      expect(screen.getByText(slot)).toBeDefined();
    });
  });

  it("renders without crashing with single slot", () => {
    render(
      <TimeDrum
        slots={["12:00 AM"]}
        selectedIdx={0}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("12:00 AM")).toBeDefined();
  });
});
