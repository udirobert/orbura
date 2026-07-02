import type { Meta, StoryObj } from "@storybook/react";
import { DawnParticle } from "./dawn-particle";

const meta: Meta<typeof DawnParticle> = {
  title: "Effects/DawnParticle",
  component: DawnParticle,
  parameters: {
    backgrounds: { default: "surface" },
  },
  decorators: [
    (Story) => (
      <div className="relative w-full h-64 overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#0a0a0b", border: "1px solid rgba(245,158,11,0.1)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DawnParticle>;

export const Small: Story = {
  args: {
    delay: 0,
    x: "20%",
    size: 4,
  },
  name: "Small particle (4px, left)",
};

export const Medium: Story = {
  args: {
    delay: 0.5,
    x: "50%",
    size: 6,
  },
  name: "Medium particle (6px, center)",
};

export const Large: Story = {
  args: {
    delay: 1,
    x: "80%",
    size: 10,
  },
  name: "Large particle (10px, right)",
};

export const Scattered: Story = {
  render: () => (
    <>
      <DawnParticle delay={0} x="15%" size={3} />
      <DawnParticle delay={0.3} x="30%" size={5} />
      <DawnParticle delay={0.7} x="55%" size={4} />
      <DawnParticle delay={1.1} x="72%" size={7} />
      <DawnParticle delay={1.6} x="88%" size={3} />
    </>
  ),
  name: "Scattered particles (5)",
};

export const StaggeredRise: Story = {
  render: () => (
    <>
      <DawnParticle delay={0} x="25%" size={4} />
      <DawnParticle delay={0.4} x="35%" size={5} />
      <DawnParticle delay={0.8} x="45%" size={6} />
      <DawnParticle delay={1.2} x="55%" size={5} />
      <DawnParticle delay={1.6} x="65%" size={4} />
      <DawnParticle delay={2.0} x="75%" size={3} />
    </>
  ),
  name: "Staggered rise (6 particles)",
};
