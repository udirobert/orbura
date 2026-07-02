import type { Meta, StoryObj } from "@storybook/react";
import { TimeDrum } from "./time-drum";

const meta: Meta<typeof TimeDrum> = {
  title: "Inputs/TimeDrum",
  component: TimeDrum,
  parameters: {
    backgrounds: { default: "surface" },
  },
};

export default meta;
type Story = StoryObj<typeof TimeDrum>;

const hours = Array.from({ length: 24 }, (_, i) =>
  `${(i % 12 || 12).toString().padStart(2, "0")}:00 ${i < 12 ? "AM" : "PM"}`
);

const halfHours = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${(h % 12 || 12).toString().padStart(2, "0")}:${m} ${h < 12 ? "AM" : "PM"}`;
});

const minutes = Array.from({ length: 12 }, (_, i) => `${i * 5}`);

const bedtimes = [
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM",
  "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
  "12:00 AM", "12:30 AM", "1:00 AM", "1:30 AM",
  "2:00 AM", "2:30 AM", "3:00 AM", "3:30 AM",
];

export const HourSelection: Story = {
  args: {
    slots: hours,
    selectedIdx: 22,
    onSelect: () => {},
  },
  name: "24-hour slots",
};

export const HalfHourStep: Story = {
  args: {
    slots: halfHours,
    selectedIdx: 42,
    onSelect: () => {},
  },
  name: "30-minute intervals",
};

export const MinuteSelection: Story = {
  args: {
    slots: minutes,
    selectedIdx: 0,
    onSelect: () => {},
  },
  name: "Minute slots",
};

export const BedtimePicker: Story = {
  args: {
    slots: bedtimes,
    selectedIdx: 4,
    onSelect: () => {},
  },
  name: "Bedtime selection",
};

export const ManySlots: Story = {
  args: {
    slots: hours,
    selectedIdx: 0,
    onSelect: () => {},
  },
  name: "Top of hours (idx 0)",
};
