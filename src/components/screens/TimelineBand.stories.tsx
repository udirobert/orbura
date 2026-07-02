import type { Meta, StoryObj } from "@storybook/react";
import { Timer, Ban } from "lucide-react";
import { TimelineBand } from "./TimelineBand";

const defaultBand = {
  key: "rightNow" as const,
  label: "RIGHT NOW",
  icon: <Timer className="w-4 h-4" />,
  accentColor: "var(--color-states-error)",
  timeLabel: "Immediate",
};

const avoidBand = {
  key: "avoid" as const,
  label: "AVOID",
  icon: <Ban className="w-4 h-4" />,
  accentColor: "var(--color-states-error)",
  timeLabel: "All day",
  isAvoid: true,
};

const meta: Meta<typeof TimelineBand> = {
  title: "RecoverySchedule/TimelineBand",
  component: TimelineBand,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    text: "Drink 500ml of water with electrolytes. Your cells are dehydrated.",
    isSelected: false,
    isBookmarked: false,
    isCopied: false,
    onSelect: () => alert("Select"),
    onCopy: () => alert("Copy"),
    onBookmark: () => alert("Bookmark"),
  },
};

export default meta;
type Story = StoryObj<typeof TimelineBand>;

export const Default: Story = {
  args: {
    band: defaultBand,
  },
};

export const Selected: Story = {
  args: {
    band: defaultBand,
    isSelected: true,
  },
};

export const Bookmarked: Story = {
  args: {
    band: defaultBand,
    isBookmarked: true,
  },
};

export const SelectedAndBookmarked: Story = {
  args: {
    band: defaultBand,
    isSelected: true,
    isBookmarked: true,
  },
};

export const Copied: Story = {
  args: {
    band: defaultBand,
    isSelected: true,
    isCopied: true,
  },
};

export const AvoidBand: Story = {
  args: {
    band: avoidBand,
    text: "Intense training. You'll create more debt, not fitness.",
  },
};

export const AvoidBandSelected: Story = {
  args: {
    band: avoidBand,
    text: "Intense training. You'll create more debt, not fitness.",
    isSelected: true,
  },
};
