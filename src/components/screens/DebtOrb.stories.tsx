import type { Meta, StoryObj } from "@storybook/react";
import { DebtOrb } from "./DebtOrb";

const meta: Meta<typeof DebtOrb> = {
  title: "Evidence/DebtOrb",
  component: DebtOrb,
  parameters: {
    backgrounds: { default: "surface" },
  },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DebtOrb>;

export const LowDebt: Story = {
  args: { score: 8 },
  name: "Low debt (8)",
};

export const MildDebt: Story = {
  args: { score: 32 },
  name: "Mild debt (32)",
};

export const ModerateDebt: Story = {
  args: { score: 55 },
  name: "Moderate debt (55)",
};

export const HighDebt: Story = {
  args: { score: 76 },
  name: "High debt (76)",
};

export const CriticalDebt: Story = {
  args: { score: 92 },
  name: "Critical debt (92)",
};
