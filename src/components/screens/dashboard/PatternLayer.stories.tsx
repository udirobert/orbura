import type { Meta, StoryObj } from "@storybook/react";
import { PatternLayer } from "./PatternLayer";

const meta: Meta<typeof PatternLayer> = {
  title: "Dashboard/PatternLayer",
  component: PatternLayer,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof PatternLayer>;

export const ThreeDayStreak: Story = {
  name: "3-day streak",
  args: {
    streakDays: 3,
  },
};

export const SingleDay: Story = {
  name: "1 day (singular)",
  args: {
    streakDays: 1,
  },
};

export const DoubleDigit: Story = {
  name: "10-day streak",
  args: {
    streakDays: 10,
  },
};

export const ShortStreak: Story = {
  name: "2-day streak",
  args: {
    streakDays: 2,
  },
};
