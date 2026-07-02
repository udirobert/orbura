import type { Meta, StoryObj } from "@storybook/react";
import { ConnectedPanel } from "./connected-panel";
import type { HRVData } from "@/lib/types";

const meta: Meta<typeof ConnectedPanel> = {
  title: "Evidence/ConnectedPanel",
  component: ConnectedPanel,
  parameters: {
    backgrounds: { default: "surface" },
  },
  args: {
    onContinue: () => alert("Continue"),
  },
};

export default meta;
type Story = StoryObj<typeof ConnectedPanel>;

export const GoodHRV: Story = {
  args: {
    data: {
      hrvDeltaPercent: 5,
      restingHrDelta: -2,
      source: "manual_proxy",
      confidence: "high",
      sleepStages: { deep: 112, rem: 90, light: 210 },
    } as HRVData,
  },
  name: "Good HRV (+5%, with sleep stages)",
};

export const SlightlyBelow: Story = {
  args: {
    data: {
      hrvDeltaPercent: -12,
      restingHrDelta: 4,
      source: "terra",
      confidence: "medium",
    } as HRVData,
  },
  name: "Slightly below (−12%, no sleep)",
};

export const BadHRV: Story = {
  args: {
    data: {
      hrvDeltaPercent: -25,
      restingHrDelta: 8,
      source: "google_fit",
      confidence: "medium",
      sleepStages: { deep: 48, rem: 62, light: 180 },
    } as HRVData,
  },
  name: "Bad HRV (−25%, severe)",
};

export const GarminSource: Story = {
  args: {
    data: {
      hrvDeltaPercent: 3,
      restingHrDelta: -1,
      source: "garmin_export",
      confidence: "high",
      sleepStages: { deep: 98, rem: 78, light: 195 },
    } as HRVData,
  },
  name: "Garmin export (+3%)",
};

export const DemoMode: Story = {
  args: {
    data: {
      hrvDeltaPercent: -8,
      restingHrDelta: 3,
      source: "demo",
      confidence: "low",
    } as HRVData,
  },
  name: "Demo mode (−8%)",
};

export const ZeroDelta: Story = {
  args: {
    data: {
      hrvDeltaPercent: 0,
      restingHrDelta: 0,
      source: "healthkit",
      confidence: "high",
      sleepStages: { deep: 80, rem: 72, light: 200 },
    } as HRVData,
  },
  name: "At baseline (0%, HealthKit)",
};
