import type { Meta, StoryObj } from "@storybook/react";
import { MetricCard } from "./MetricCard";

const meta: Meta<typeof MetricCard> = {
  title: "Evidence/MetricCard",
  component: MetricCard,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const ScoreSuccess: Story = {
  name: "Score — low (green)",
  args: {
    label: "Current debt",
    value: "22",
    sub: "Improved 8 points since yesterday",
  },
};

export const ScoreWarning: Story = {
  name: "Score — moderate (warning)",
  args: {
    label: "Current debt",
    value: "48",
    sub: "Monitor training load today",
    color: "var(--color-states-warning)",
  },
};

export const ScoreError: Story = {
  name: "Score — high (error)",
  args: {
    label: "Current debt",
    value: "79",
    sub: "Take a full rest day",
    color: "var(--color-states-error)",
  },
};

export const Percentage: Story = {
  name: "Percentage metric",
  args: {
    label: "HRV recovery",
    value: "83%",
    sub: "Above baseline — good autonomic balance",
    color: "var(--color-states-success)",
  },
};

export const Duration: Story = {
  name: "Duration metric",
  args: {
    label: "Sleep duration",
    value: "7h 22m",
    sub: "Within optimal range for recovery",
    color: "var(--color-brand-primary)",
  },
};

export const WithoutSub: Story = {
  name: "No subtitle",
  args: {
    label: "Stress score",
    value: "14",
  },
};

export const CustomColor: Story = {
  name: "Custom accent color",
  args: {
    label: "Edge inference",
    value: "21.5s",
    sub: "On-device QVAC pipeline",
    color: "#A78BFA",
  },
};
