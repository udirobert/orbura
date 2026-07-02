import type { Meta, StoryObj } from "@storybook/react";
import { SystemMeter } from "./SystemMeter";
import type { RecoverySystem } from "@/lib/types";

const meta: Meta<typeof SystemMeter> = {
  title: "Primitives/SystemMeter",
  component: SystemMeter,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    label: "Recovery System",
    score: 45,
    clearedAt: new Date().toISOString(),
    countdown: "5h 20m",
    clearTime: "Cleared 8pm today",
    isPrimary: false,
    isCleared: false,
  },
};

export default meta;
type Story = StoryObj<typeof SystemMeter>;

export const Cardiovascular: Story = {
  args: {
    system: "cardiovascular" as RecoverySystem,
    label: "Cardiovascular",
    score: 72,
    countdown: "12h 30m",
    clearTime: "Cleared 8am tomorrow",
    isPrimary: true,
  },
};

export const Brain: Story = {
  args: {
    system: "brain" as RecoverySystem,
    label: "Brain",
    score: 58,
    countdown: "8h 15m",
    clearTime: "Cleared 4am tomorrow",
  },
};

export const Liver: Story = {
  args: {
    system: "liver" as RecoverySystem,
    label: "Liver",
    score: 34,
    countdown: "3h 45m",
    clearTime: "Cleared 11pm tonight",
  },
};

export const Muscular: Story = {
  args: {
    system: "muscular" as RecoverySystem,
    label: "Muscular",
    score: 81,
    countdown: "18h 0m",
    clearTime: "Cleared 2pm tomorrow",
    isPrimary: true,
  },
};

export const Gut: Story = {
  args: {
    system: "gut" as RecoverySystem,
    label: "Gut",
    score: 22,
    countdown: "1h 10m",
    clearTime: "Cleared 9pm tonight",
  },
};

export const Cleared: Story = {
  args: {
    system: "brain" as RecoverySystem,
    label: "Brain",
    score: 0,
    countdown: "Cleared",
    clearTime: "Cleared 2 hours ago",
    isCleared: true,
  },
};

export const CustomGlyph: Story = {
  args: {
    system: "liver" as RecoverySystem,
    label: "Liver",
    score: 45,
    glyph: "Lv",
    countdown: "4h 20m",
    clearTime: "Cleared midnight tonight",
  },
};
