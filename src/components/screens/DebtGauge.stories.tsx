import type { Meta, StoryObj } from "@storybook/react";
import { DebtGauge } from "./DebtGauge";

const meta: Meta<typeof DebtGauge> = {
  title: "Evidence/DebtGauge",
  component: DebtGauge,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    animated: false,
  },
};

export default meta;
type Story = StoryObj<typeof DebtGauge>;

export const LowDebt: Story = {
  args: { score: 12 },
  name: "Low debt (12)",
};

export const MildDebt: Story = {
  args: { score: 28 },
  name: "Mild debt (28)",
};

export const ModerateDebt: Story = {
  args: { score: 52 },
  name: "Moderate debt (52)",
};

export const HighDebt: Story = {
  args: { score: 74 },
  name: "High debt (74)",
};

export const CriticalDebt: Story = {
  args: { score: 96 },
  name: "Critical debt (96)",
};

export const ZeroDebt: Story = {
  args: { score: 0 },
  name: "Zero debt (0)",
};

export const AnimatedHighDebt: Story = {
  args: { score: 78, animated: true },
  name: "Animated — high debt (78)",
};
