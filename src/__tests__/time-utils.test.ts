import { describe, it, expect } from "vitest";
import { buildTimeSlots, buildBedtimeSlots, getCircadianNote } from "@/lib/time-utils";

describe("buildTimeSlots", () => {
  it("returns wake-time slots from 4:00 AM to 12:00 PM", () => {
    const slots = buildTimeSlots();
    expect(slots[0]).toBe("4:00 AM");
    expect(slots).toContain("12:00 PM");
  });

  it("has 30-min increments", () => {
    const slots = buildTimeSlots();
    expect(slots).toContain("5:30 AM");
    expect(slots).toContain("10:30 AM");
  });

  it("returns exactly 17 slots (4-11 with :00/:30 = 16 + 12PM)", () => {
    const slots = buildTimeSlots();
    expect(slots.length).toBe(17);
  });
});

describe("buildBedtimeSlots", () => {
  it("starts at 6:00 PM", () => {
    const slots = buildBedtimeSlots();
    expect(slots[0]).toBe("6:00 PM");
  });

  it("goes through midnight correctly", () => {
    const slots = buildBedtimeSlots();
    expect(slots).toContain("12:00 AM");
    expect(slots).toContain("1:30 AM");
  });

  it("ends at 4:30 AM (exclusive) since 4:30 is filtered", () => {
    const slots = buildBedtimeSlots();
    expect(slots[slots.length - 1]).toBe("4:00 AM");
    expect(slots).not.toContain("4:30 AM");
  });

  it("has the expected total count", () => {
    // 6pm-11pm: 6 hrs * 2 = 12 slots
    // 12am-4am: 4 hrs * 2 + 1 (12:00) = 9 slots (no 4:30)
    // Total: 21
    const slots = buildBedtimeSlots();
    expect(slots.length).toBe(21);
  });
});

describe("getCircadianNote", () => {
  it("returns aligned for 9-11 PM", () => {
    const note = getCircadianNote("10:00 PM");
    expect(note.label).toContain("Aligned");
    expect(note.penalty).toBe("none");
    expect(note.color).toBe("var(--color-states-success)");
  });

  it("returns aligned for 8-8:30 PM", () => {
    const note = getCircadianNote("8:00 PM");
    expect(note.label).toContain("Slightly early");
    expect(note.penalty).toBe("none");
    expect(note.color).toBe("var(--color-states-success)");
  });

  it("returns mild penalty for 6-8 PM", () => {
    const note = getCircadianNote("6:00 PM");
    expect(note.penalty).toBe("mild");
    expect(note.color).toBe("var(--color-states-warning)");
  });

  it("returns mild penalty for midnight-1 AM", () => {
    const note = getCircadianNote("12:00 AM");
    expect(note.penalty).toBe("mild");
  });

  it("returns significant penalty for 2-4 AM", () => {
    const note = getCircadianNote("3:00 AM");
    expect(note.penalty).toBe("significant");
    expect(note.color).toBe("var(--color-states-error)");
  });

  it("handles 12 PM correctly by converting to 12 (noon)", () => {
    const note = getCircadianNote("12:00 PM");
    // 12 PM = hour 12, which doesn't match PM = 21/22 or AM = 0-4
    // so it falls through to default
    expect(note.penalty).toBe("none");
  });
});
