import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StressorCard } from "@/components/screens/stressor-card";
import type { StressorDef } from "@/stressors";

const alcoholDef: StressorDef = {
  type: "alcohol",
  label: "Drank",
  sublabel: "Any amount, any type",
  icon: "🍺",
  basePoints: 32,
  expansions: [
    {
      field: "alcoholType",
      question: "What?",
      options: [
        { key: "beer", label: "Beer" },
        { key: "spirits", label: "Spirits" },
      ],
    },
    {
      field: "alcoholCount",
      question: "How many?",
      options: [
        { key: "1-2", label: "1-2" },
        { key: "lost_count", label: "Lost count" },
      ],
    },
  ],
};

const careDef: StressorDef = {
  type: "care",
  label: "Took care of myself",
  sublabel: "Good sleep, no drinks, low stress",
  icon: "✦",
  basePoints: -10,
};

describe("StressorCard", () => {
  it("renders the label and sublabel", () => {
    render(
      <StressorCard
        def={alcoholDef}
        stressor={undefined}
        onToggle={vi.fn()}
        onSubOption={vi.fn()}
      />
    );
    expect(screen.getByText("Drank")).toBeDefined();
    expect(screen.getByText("Any amount, any type")).toBeDefined();
  });

  it("shows expansion chevron when def has expansions", () => {
    render(
      <StressorCard
        def={alcoholDef}
        stressor={undefined}
        onToggle={vi.fn()}
        onSubOption={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Add detail")).toBeDefined();
  });

  it("does NOT show chevron for care (no expansions)", () => {
    render(
      <StressorCard
        def={careDef}
        stressor={undefined}
        onToggle={vi.fn()}
        onSubOption={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Add detail")).toBeNull();
  });

  it("calls onToggle when the main button is clicked", () => {
    const onToggle = vi.fn();
    render(
      <StressorCard
        def={careDef}
        stressor={undefined}
        onToggle={onToggle}
        onSubOption={vi.fn()}
      />
    );
    const btn = screen.getByText("Took care of myself");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders expansion options when expanded", () => {
    render(
      <StressorCard
        def={alcoholDef}
        stressor={{ type: "alcohol" }}
        onToggle={vi.fn()}
        onSubOption={vi.fn()}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByLabelText("Add detail"));
    expect(screen.getByText("Beer")).toBeDefined();
    expect(screen.getByText("Spirits")).toBeDefined();
    expect(screen.getByText("1-2")).toBeDefined();
  });

  it("calls onSubOption when an option is clicked", () => {
    const onSubOption = vi.fn();
    render(
      <StressorCard
        def={alcoholDef}
        stressor={{ type: "alcohol" }}
        onToggle={vi.fn()}
        onSubOption={onSubOption}
      />
    );
    // Expand then click an option
    fireEvent.click(screen.getByLabelText("Add detail"));
    fireEvent.click(screen.getByText("Beer"));
    expect(onSubOption).toHaveBeenCalledWith("alcoholType", "beer");
  });
});
