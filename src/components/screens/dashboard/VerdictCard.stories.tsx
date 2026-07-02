import type { Meta, StoryObj } from "@storybook/react";
import { VerdictCard } from "./VerdictCard";

const meta: Meta<typeof VerdictCard> = {
  title: "Dashboard/VerdictCard",
  component: VerdictCard,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof VerdictCard>;

export const HighDebt: Story = {
  name: "High debt — urgent recovery",
  args: {
    verdict: "Your body is carrying significant debt from last night's drinking and poor sleep. Prioritise hydration, rest, and avoid alcohol today to let your systems recover.",
    tagline: "Your body can bounce back — give it what it needs.",
    recoveryTime: "~30 hours",
    recoveryLabel: "Estimated recovery:",
  },
};

export const MildDebt: Story = {
  name: "Mild debt — light recovery",
  args: {
    verdict: "Your body is recovering well. A light training session and early night will keep you on track.",
    tagline: "Steady as she goes.",
    recoveryTime: "~12 hours",
    recoveryLabel: "Estimated recovery:",
  },
};

export const LowDebt: Story = {
  name: "Low debt — almost clear",
  args: {
    verdict: "You're in good shape. A normal day with standard recovery protocols will have you fully cleared by tomorrow morning.",
    tagline: "Keep doing what you're doing.",
    recoveryTime: "~4 hours",
    recoveryLabel: "Estimated recovery:",
  },
};

export const FootballContext: Story = {
  name: "Football — match recovery",
  args: {
    verdict: "Match load is significant. Your muscular and cardiovascular systems need 48 hours before next training. Prioritise protein intake and sleep extension tonight.",
    tagline: "Recover right, perform next match.",
    recoveryTime: "~48 hours",
    recoveryLabel: "Match recovery window:",
  },
};

export const LongWindow: Story = {
  name: "Extended recovery window",
  args: {
    verdict: "Multiple systems are under compounding load from alcohol, poor sleep, and high training volume. Take a full rest day and focus on nutrition.",
    tagline: "One day off now saves three later.",
    recoveryTime: "~72 hours",
    recoveryLabel: "Full recovery window:",
  },
};
