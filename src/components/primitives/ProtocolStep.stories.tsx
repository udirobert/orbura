import type { Meta, StoryObj } from "@storybook/react";
import { ProtocolStep } from "./ProtocolStep";

const meta: Meta<typeof ProtocolStep> = {
  title: "Primitives/ProtocolStep",
  component: ProtocolStep,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    action: "Hydrate with electrolytes and eat a recovery meal within 30 minutes.",
    isLast: false,
  },
};

export default meta;
type Story = StoryObj<typeof ProtocolStep>;

export const RightNow: Story = {
  args: {
    index: 1,
    window: "RIGHT NOW",
    accentColor: "var(--color-states-error)",
  },
  name: "Right now (red)",
};

export const ThisMorning: Story = {
  args: {
    index: 2,
    window: "THIS MORNING",
    accentColor: "var(--color-brand-primary)",
    action: "Light mobility work and a short walk to assess muscle readiness.",
  },
  name: "This morning (orange)",
};

export const Today: Story = {
  args: {
    index: 3,
    window: "TODAY",
    accentColor: "var(--color-states-warning)",
    action: "Prioritize sleep window: lights out by 10pm. Avoid screens 30min before bed.",
    isLast: true,
  },
  name: "Today (amber, last)",
};

export const Avoid: Story = {
  args: {
    index: 4,
    window: "AVOID",
    accentColor: "var(--color-states-error)",
    action: "High-intensity leg training. Alcohol consumption.",
  },
  name: "Avoid (red)",
};

export const FullProtocol: Story = {
  render: () => (
    <div>
      <ProtocolStep index={1} window="RIGHT NOW" action="Hydrate with electrolytes." accentColor="var(--color-states-error)" />
      <ProtocolStep index={2} window="THIS MORNING" action="Light mobility work." accentColor="var(--color-brand-primary)" />
      <ProtocolStep index={3} window="TODAY" action="Sleep by 10pm." accentColor="var(--color-states-warning)" />
      <ProtocolStep index={4} window="AVOID" action="Alcohol. High-intensity training." accentColor="var(--color-states-error)" isLast />
    </div>
  ),
  name: "Full 4-step protocol",
};

export const ScientificTone: Story = {
  args: {
    index: 1,
    window: "IMMEDIATE",
    accentColor: "#22D3EE",
    action: "Begin rehydration protocol: 500ml electrolyte solution over 20 minutes. Parasympathetic recovery window is now open.",
  },
  name: "Scientific tone (cyan)",
};
