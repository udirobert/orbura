import type { Meta, StoryObj } from "@storybook/react";
import { HRVDeltaBar } from "./hrv-delta-bar";

const meta: Meta<typeof HRVDeltaBar> = {
  title: "Evidence/HRVDeltaBar",
  component: HRVDeltaBar,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof HRVDeltaBar>;

export const PositiveDelta: Story = {
  args: { pct: 12 },
  name: "Positive (+12%)",
};

export const MildNegativeDelta: Story = {
  args: { pct: -8 },
  name: "Mild negative (−8%)",
};

export const ModerateNegativeDelta: Story = {
  args: { pct: -15 },
  name: "Moderate negative (−15%)",
};

export const SevereNegativeDelta: Story = {
  args: { pct: -28 },
  name: "Severe negative (−28%)",
};

export const ZeroDelta: Story = {
  args: { pct: 0 },
  name: "No change (0%)",
};

export const LargePositiveDelta: Story = {
  args: { pct: 34 },
  name: "Large positive (+34%)",
};
