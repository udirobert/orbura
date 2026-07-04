import type { Meta, StoryObj } from "@storybook/react";
import { SystemIconRow } from "./SystemIconRow";
import type { SystemScore } from "@/lib/types";

const meta: Meta<typeof SystemIconRow> = {
  title: "Dashboard/SystemIconRow",
  component: SystemIconRow,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    onTap: () => alert("System tapped"),
  },
};

export default meta;
type Story = StoryObj<typeof SystemIconRow>;

const baseSystems: SystemScore[] = [
  { system: "cardiovascular", label: "Cardiovascular", icon: "🪀", score: 72, clearedAt: "", causeText: "", actionText: "", hasData: true },
  { system: "brain",          label: "Brain",          icon: "🧠", score: 15, clearedAt: "", causeText: "", actionText: "", hasData: true },
  { system: "liver",          label: "Liver",          icon: "🫁", score: 45, clearedAt: "", causeText: "", actionText: "", hasData: true },
  { system: "muscular",       label: "Muscular",       icon: "💪", score: 8,  clearedAt: "", causeText: "", actionText: "", hasData: true },
  { system: "gut",            label: "Gut",            icon: "🦠", score: 22, clearedAt: "", causeText: "", actionText: "", hasData: true },
];

export const Default: Story = {
  args: {
    systems: baseSystems,
  },
};

export const AllHigh: Story = {
  args: {
    systems: baseSystems.map((s) => ({ ...s, score: 85 })),
  },
};

export const AllLow: Story = {
  args: {
    systems: baseSystems.map((s) => ({ ...s, score: 5 })),
  },
};

export const MixedScores: Story = {
  name: "Wide Range",
  args: {
    systems: [
      { system: "cardiovascular", label: "Cardiovascular", icon: "🪀", score: 92, clearedAt: "", causeText: "", actionText: "", hasData: true },
      { system: "brain",          label: "Brain",          icon: "🧠", score: 55, clearedAt: "", causeText: "", actionText: "", hasData: true },
      { system: "liver",          label: "Liver",          icon: "🫁", score: 18, clearedAt: "", causeText: "", actionText: "", hasData: true },
      { system: "muscular",       label: "Muscular",       icon: "💪", score: 12, clearedAt: "", causeText: "", actionText: "", hasData: true },
      { system: "gut",            label: "Gut",            icon: "🦠", score: 68, clearedAt: "", causeText: "", actionText: "", hasData: true },
    ],
  },
};
