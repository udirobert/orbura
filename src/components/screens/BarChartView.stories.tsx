import type { Meta, StoryObj } from "@storybook/react";
import { BarChartView } from "./StressorBreakdownChart";
import type { BreakdownItem } from "./StressorBreakdownChart";

const sampleItems: BreakdownItem[] = [
  { stressor: "Alcohol (3 beers)", points: 28, insight: "Liver recovery takes ~5 hours per drink.", icon: "🍺" },
  { stressor: "Poor sleep (4h)", points: 22, insight: "Brain glymphatic clearance reduced by 60%.", icon: "😴" },
  { stressor: "HIIT training", points: 18, insight: "Muscle microtears elevate base recovery need.", icon: "🏋️" },
  { stressor: "Work stress", points: 14, insight: "Cortisol prolongs cardiovascular recovery.", icon: "🧠" },
  { stressor: "Care duties", points: 8, insight: "Low-grade sympathetic activation persists.", icon: "👶" },
];

const singleItem: BreakdownItem[] = [
  { stressor: "Sleep debt (5h)", points: 42, insight: "Single largest driver of total debt.", icon: "😴" },
];

const twoItems: BreakdownItem[] = [
  { stressor: "Alcohol (4 drinks)", points: 36, insight: "Liver metabolizes ~1 drink/hour.", icon: "🍺" },
  { stressor: "Poor sleep (3h)", points: 30, insight: "Sleep under 6h adds +4/hr to all systems.", icon: "😴" },
];

const meta: Meta<typeof BarChartView> = {
  title: "Evidence/BarChartView",
  component: BarChartView,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof BarChartView>;

export const FiveStressors: Story = {
  args: { items: sampleItems },
  name: "5 stressors",
};

export const TwoStressors: Story = {
  args: { items: twoItems },
  name: "2 stressors",
};

export const SingleStressor: Story = {
  args: { items: singleItem },
  name: "Single stressor",
};

export const Empty: Story = {
  args: { items: [] },
  name: "Empty (hidden)",
};
