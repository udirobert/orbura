import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("re-syncs scroll offset when item height changes", async () => {
    // Regression: y was initialized once against the compact item height.
    // When `roomy` flipped the drum to the default size after mount, the
    // offset stayed stale and the drum showed the wrong (faint) region.
    const { rerender } = render(
      <TimeDrum slots={SLOTS} selectedIdx={2} onSelect={vi.fn()} size="compact" />
    );
    const dragEl = () => screen.getByText(SLOTS[0]).parentElement as HTMLElement;

    // compact itemH = 44 → offset -2 * 44 = -88px
    expect(dragEl().style.transform).toContain("-88px");

    rerender(<TimeDrum slots={SLOTS} selectedIdx={2} onSelect={vi.fn()} size="default" />);

    // default itemH = 72 → offset must re-sync to -2 * 72 = -144px
    // (motion value → style updates flush on framer's frame loop)
    await waitFor(() => {
      expect(dragEl().style.transform).toContain("-144px");
    });
  });
});
