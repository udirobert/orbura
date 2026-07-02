import type { Meta, StoryObj } from "@storybook/react";
import { RecoveryTimeline } from "./RecoveryTimeline";

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3600000).toISOString();
}

const meta: Meta<typeof RecoveryTimeline> = {
  title: "Evidence/RecoveryTimeline",
  component: RecoveryTimeline,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof RecoveryTimeline>;

export const InDangerZone: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(4),
      partialEnds: hoursFromNow(12),
      clearedAt: hoursFromNow(24),
    },
  },
  name: "In danger zone",
};

export const Recovering: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(-2),
      partialEnds: hoursFromNow(6),
      clearedAt: hoursFromNow(18),
    },
  },
  name: "Recovering phase",
};

export const NearlyCleared: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(-8),
      partialEnds: hoursFromNow(-2),
      clearedAt: hoursFromNow(1),
    },
  },
  name: "Nearly cleared",
};

export const AllCleared: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(-24),
      partialEnds: hoursFromNow(-12),
      clearedAt: hoursFromNow(-2),
    },
  },
  name: "All cleared",
};

export const LongRecovery: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(12),
      partialEnds: hoursFromNow(48),
      clearedAt: hoursFromNow(72),
    },
  },
  name: "Long recovery (72h)",
};

export const QuickRecovery: Story = {
  args: {
    arc: {
      dangerEnds: hoursFromNow(0.5),
      partialEnds: hoursFromNow(2),
      clearedAt: hoursFromNow(4),
    },
  },
  name: "Quick recovery (4h)",
};
