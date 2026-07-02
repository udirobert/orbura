import type { Meta, StoryObj } from "@storybook/react";
import { AgentSchedule } from "./AgentSchedule";
import type { ScheduleBlock } from "@/lib/types";

const meta: Meta<typeof AgentSchedule> = {
  title: "Dashboard/AgentSchedule",
  component: AgentSchedule,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof AgentSchedule>;

const fullSchedule: ScheduleBlock[] = [
  { time: "Now",         action: "Hydrate with electrolytes and rest in a dark room",            system: "brain" },
  { time: "+30m",        action: "Light walk or mobility flow to promote lymphatic clearance",   system: "cardiovascular" },
  { time: "+2h",         action: "High-protein meal with complex carbs to replenish glycogen",   system: "muscular" },
  { time: "+4h",         action: "Avoid caffeine and screen time to support circadian recovery", system: "gut" },
];

export const FullSchedule: Story = {
  args: {
    schedule: fullSchedule,
  },
};

export const SingleItem: Story = {
  args: {
    schedule: [
      { time: "Now", action: "Hydrate with electrolytes", system: "brain" },
    ],
  },
};

export const EmptySchedule: Story = {
  args: {
    schedule: [],
  },
};

export const AllSystems: Story = {
  name: "All 5 systems",
  args: {
    schedule: [
      { time: "Now",  action: "Rest and rehydrate — vagal tone recovery",                       system: "Cardiovascular" },
      { time: "+1h",  action: "Low-stimulation cognitive rest (no screens)",                     system: "Brain" },
      { time: "+2h",  action: "Light meal — avoid heavy fats to reduce hepatic load",           system: "Liver" },
      { time: "+3h",  action: "Gentle stretching or mobility work (no resistance training)",     system: "Muscular" },
      { time: "+4h",  action: "Probiotics and fermented foods to support microbiome",            system: "Gut" },
    ],
  },
};

export const UnknownSystem: Story = {
  name: "Unknown system (bullet fallback)",
  args: {
    schedule: [
      { time: "Now", action: "Unknown system test — should show bullet fallback", system: "unknown_system" },
    ],
  },
};
