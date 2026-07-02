import type { Meta, StoryObj } from "@storybook/react";
import { HeaderActions } from "./HeaderActions";

const meta: Meta<typeof HeaderActions> = {
  title: "RecoverySchedule/HeaderActions",
  component: HeaderActions,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    scheduleLabel: "Recovery Schedule",
    bookmarkCount: 0,
    copiedAll: false,
    copiedBookmarked: false,
    onCopyAll: () => alert("Copy all"),
    onCopyBookmarked: () => alert("Copy bookmarked"),
    onClearBookmarks: () => alert("Clear bookmarks"),
  },
};

export default meta;
type Story = StoryObj<typeof HeaderActions>;

export const Default: Story = {};

export const WithBookmarks: Story = {
  args: {
    bookmarkCount: 2,
  },
};

export const CopiedAll: Story = {
  args: {
    copiedAll: true,
  },
};

export const CopiedBookmarked: Story = {
  args: {
    bookmarkCount: 3,
    copiedBookmarked: true,
  },
};

export const FullHeader: Story = {
  args: {
    bookmarkCount: 4,
    copiedAll: false,
  },
};
