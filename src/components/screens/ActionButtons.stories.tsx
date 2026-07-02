import type { Meta, StoryObj } from "@storybook/react";
import { ActionButtons } from "./ActionButtons";

const meta: Meta<typeof ActionButtons> = {
  title: "RecoverySchedule/ActionButtons",
  component: ActionButtons,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    onCopy: () => alert("Copy"),
    onBookmark: () => alert("Bookmark"),
    isCopied: false,
    isBookmarked: false,
    accentColor: "var(--color-states-error)",
  },
};

export default meta;
type Story = StoryObj<typeof ActionButtons>;

export const Default: Story = {};

export const Copied: Story = {
  args: {
    isCopied: true,
  },
};

export const Bookmarked: Story = {
  args: {
    isBookmarked: true,
    accentColor: "var(--color-brand-primary)",
  },
};

export const CopiedAndBookmarked: Story = {
  args: {
    isCopied: true,
    isBookmarked: true,
    accentColor: "var(--color-states-success)",
  },
};

export const WarmAccent: Story = {
  args: {
    accentColor: "var(--color-states-warning)",
  },
};
