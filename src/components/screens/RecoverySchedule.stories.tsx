import type { Meta, StoryObj } from "@storybook/react";
import { RecoverySchedule } from "./RecoverySchedule";
import type { Prescription } from "@/lib/types";

// ─── Sample prescriptions ─────────────────────────────────────────────────────

const highDebtPrescription: Prescription = {
  rightNow: "Drink 500ml of water with electrolytes. Your cells are dehydrated.",
  thisMorning: "No caffeine until 10am — it'll spike cortisol on an already stressed system.",
  today: "Your one real focus window is 11am–1pm. Protect it.",
  avoid: "Intense training. You'll create more debt, not fitness.",
};

const mildDebtPrescription: Prescription = {
  rightNow: "Take 5 deep breaths before moving. Your HRV suggests a slow start.",
  thisMorning: "Light walk or mobility work. Keep it under 20 minutes.",
  today: "You have a solid 4-hour window. Use it wisely.",
  avoid: "Alcohol today. Your liver markers are still elevated.",
};

const footballMatchPrescription: Prescription = {
  rightNow: "Hydrate with electrolytes and have a recovery shake within 30 minutes.",
  thisMorning: "Active recovery — light cycling or swimming. No impact.",
  today: "Nutrition focus: 1.5g protein per kg of bodyweight across 4 meals.",
  avoid: "Full training or match play. Risk of re-injury is 3× higher within 48h of match.",
};

const emptyPrescription: Prescription = {
  rightNow: "Log your stressors to get a personalized prescription.",
  thisMorning: "Take a few minutes to check in with yourself.",
  today: "Start fresh — your body is ready.",
  avoid: "Skipping your next check-in.",
};

const meta: Meta<typeof RecoverySchedule> = {
  title: "RecoverySchedule/RecoverySchedule",
  component: RecoverySchedule,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof RecoverySchedule>;

export const HighDebt: Story = {
  name: "High debt",
  args: {
    prescription: highDebtPrescription,
  },
};

export const MildDebt: Story = {
  name: "Mild debt",
  args: {
    prescription: mildDebtPrescription,
  },
};

export const MatchDaySchedule: Story = {
  name: "Match day",
  args: {
    prescription: footballMatchPrescription,
    scheduleLabel: "Match-Day Recovery",
  },
};

export const EmptyState: Story = {
  name: "Empty / no data",
  args: {
    prescription: emptyPrescription,
  },
};

export const CustomLabel: Story = {
  name: "Custom label",
  args: {
    prescription: highDebtPrescription,
    scheduleLabel: "Personalized Plan",
  },
};
