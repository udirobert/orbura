import type { Meta, StoryObj } from "@storybook/react";
import { StressorLedgerRow } from "./StressorLedgerRow";

const meta: Meta<typeof StressorLedgerRow> = {
  title: "Primitives/StressorLedgerRow",
  component: StressorLedgerRow,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    icon: "🍺",
    label: "Alcohol",
    sublabel: "Beer, wine, spirits",
    contribution: 14,
    isSelected: false,
    hasExpansions: false,
    expanded: false,
    isCare: false,
    onToggle: () => alert("Toggled"),
    onToggleExpansion: () => alert("Expansion toggled"),
  },
};

export default meta;
type Story = StoryObj<typeof StressorLedgerRow>;

export const Unselected: Story = {
  name: "Unselected",
};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
  name: "Selected",
};

export const WithExpansion: Story = {
  args: {
    hasExpansions: true,
    children: (
      <div className="flex flex-wrap gap-1.5 pt-2">
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.5)", color: "var(--color-text-primary)" }}>
          Beer
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Red wine
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Spirits
        </span>
      </div>
    ),
  },
  name: "With sub-options (unselected)",
};

export const SelectedWithExpansion: Story = {
  args: {
    isSelected: true,
    hasExpansions: true,
    children: (
      <div className="flex flex-wrap gap-1.5 pt-2">
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.5)", color: "var(--color-text-primary)" }}>
          Beer
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Red wine
        </span>
      </div>
    ),
  },
  name: "Selected with sub-options",
};

export const SelectedAndExpanded: Story = {
  args: {
    isSelected: true,
    hasExpansions: true,
    expanded: true,
    children: (
      <div className="flex flex-wrap gap-1.5 pt-2">
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.5)", color: "var(--color-text-primary)" }}>
          Beer
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Red wine
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Spirits
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          Cocktails
        </span>
      </div>
    ),
  },
  name: "Selected with expanded options",
};

export const CareStressor: Story = {
  args: {
    icon: "👶",
    label: "Care duties",
    sublabel: "Family, dependents, pets",
    contribution: -5,
    isSelected: true,
    isCare: true,
  },
  name: "Care stressor (green accent, negative)",
};

export const HighContribution: Story = {
  args: {
    icon: "😴",
    label: "Poor sleep",
    sublabel: "Under 4 hours",
    contribution: 28,
    isSelected: true,
    hasExpansions: true,
    expanded: true,
    children: (
      <div className="flex flex-wrap gap-1.5 pt-2">
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.5)", color: "var(--color-text-primary)" }}>
          Under 4h
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--color-border-default)", color: "var(--color-text-secondary)" }}>
          4–6h
        </span>
      </div>
    ),
  },
  name: "High contribution (+28)",
};
