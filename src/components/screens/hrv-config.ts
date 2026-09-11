import {
  Apple,
  Hand,
  HeartPulse,
  Radio,
  Scale,
  Smartphone,
  Watch,
  type LucideIcon,
} from "lucide-react";

export const SOURCE_META: Record<string, { label: string; opacity: number; color: string }> = {
  terra:         { label: "Live from your wearable",       opacity: 1.0, color: "var(--color-states-success)" },
  healthkit:     { label: "From your Apple Watch",         opacity: 1.0, color: "var(--color-states-success)" },
  google_fit:    { label: "From your Android data",        opacity: 0.95, color: "var(--color-states-success)" },
  garmin_export: { label: "From your Garmin export",       opacity: 0.90, color: "var(--color-states-warning)" },
  garmin_fit:    { label: "From your Garmin .FIT file",    opacity: 0.95, color: "var(--color-states-success)" },
  apple_health:  { label: "From your Apple Health export", opacity: 0.95, color: "var(--color-states-success)" },
  withings:      { label: "From your Withings device",     opacity: 0.95, color: "var(--color-states-success)" },
  manual_proxy:  { label: "Based on how you reported feeling", opacity: 0.80, color: "var(--color-text-secondary)" },
  demo:          { label: "Simulated Garmin data",         opacity: 1.0, color: "var(--color-states-success)" },
};

export interface DeviceOption {
  id: string;
  name: string;
  sub: string;
  Icon: LucideIcon;
  layer: "picker" | "terra" | "google_fit" | "withings" | "garmin" | "apple_health" | "manual" | "connected" | "analyzing";
  note: string | null;
}

// Icons mirror SOURCE_ICONS in src/lib/signal-icons.ts so a device reads the
// same in the picker and in the connected-source badge.
export const DEVICE_OPTIONS: DeviceOption[] = [
  { id: "apple",    name: "Apple Watch",          sub: "iPhone → Health app",                 Icon: Apple,      layer: "apple_health" as const, note: null },
  { id: "garmin",   name: "Garmin",               sub: "Forerunner, Fenix, Venu, Lily",       Icon: Watch,      layer: "garmin"       as const, note: null },
  { id: "fitbit",   name: "Fitbit / Pixel Watch", sub: "Charge, Sense, Versa, Pixel Watch",   Icon: HeartPulse, layer: "google_fit"   as const, note: null },
  { id: "android",  name: "Android / Google Fit", sub: "Samsung, OnePlus, Pixel phones",      Icon: Smartphone, layer: "google_fit"   as const, note: null },
  { id: "whoop",    name: "WHOOP / Oura",         sub: "WHOOP 4.0, Oura Gen 3+",              Icon: Radio,      layer: "terra"        as const, note: "Requires Terra credentials" },
  { id: "withings", name: "Withings",             sub: "Scale, Sleep, BPM Connect, ScanWatch", Icon: Scale,      layer: "withings"    as const, note: null },
  { id: "none",     name: "No device",            sub: "Answer a quick check-in instead",     Icon: Hand,       layer: "manual"       as const, note: null },
];
