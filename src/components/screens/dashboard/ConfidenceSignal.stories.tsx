import type { Meta, StoryObj } from "@storybook/react";
import { ConfidenceSignal } from "./ConfidenceSignal";

const meta: Meta<typeof ConfidenceSignal> = {
  title: "Dashboard/ConfidenceSignal",
  component: ConfidenceSignal,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof ConfidenceSignal>;

export const Estimated: Story = {
  name: "Estimated (no biometrics)",
  args: {
    tier: "estimated",
  },
};

export const Partial: Story = {
  name: "Partial picture",
  args: {
    tier: "partial",
  },
};

export const Good: Story = {
  name: "Good read",
  args: {
    tier: "good",
  },
};

export const Accurate: Story = {
  name: "Accurate (face scan)",
  args: {
    tier: "accurate",
  },
};

export const Precise: Story = {
  name: "Precise (face + HRV)",
  args: {
    tier: "precise",
  },
};

export const Undefined: Story = {
  name: "No tier (falls back to estimated)",
  args: {},
};
