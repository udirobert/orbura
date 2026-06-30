export const SOURCE_META: Record<string, { label: string; opacity: number; color: string }> = {
  terra:         { label: "Live from your wearable",       opacity: 1.0, color: "var(--color-states-success)" },
  healthkit:     { label: "From your Apple Watch",         opacity: 1.0, color: "var(--color-states-success)" },
  google_fit:    { label: "From your Android data",        opacity: 0.95, color: "var(--color-states-success)" },
  garmin_export: { label: "From your Garmin export",       opacity: 0.90, color: "var(--color-states-warning)" },
  manual_proxy:  { label: "Based on how you reported feeling", opacity: 0.80, color: "var(--color-text-secondary)" },
  demo:          { label: "Simulated Garmin data",         opacity: 1.0, color: "var(--color-states-success)" },
};

export interface DeviceOption {
  id: string;
  name: string;
  sub: string;
  icon: string;
  layer: "picker" | "terra" | "google_fit" | "garmin" | "manual" | "connected" | "analyzing";
  note: string | null;
}

export const DEVICE_OPTIONS: DeviceOption[] = [
  { id: "apple",   name: "Apple Watch",          sub: "iPhone → Health app",                icon: "🍎", layer: "manual"     as const, note: "HealthKit web access coming soon" },
  { id: "garmin",  name: "Garmin",               sub: "Forerunner, Fenix, Venu, Lily",      icon: "⌚", layer: "garmin"     as const, note: null },
  { id: "fitbit",  name: "Fitbit / Pixel Watch", sub: "Charge, Sense, Versa, Pixel Watch",  icon: "💚", layer: "google_fit" as const, note: null },
  { id: "android", name: "Android / Google Fit", sub: "Samsung, OnePlus, Pixel phones",     icon: "🤖", layer: "google_fit" as const, note: null },
  { id: "whoop",   name: "WHOOP / Oura",         sub: "WHOOP 4.0, Oura Gen 3+",             icon: "🔴", layer: "terra"      as const, note: "Requires Terra credentials" },
  { id: "none",    name: "No device",            sub: "Answer a quick check-in instead",   icon: "🖐", layer: "manual"     as const, note: null },
];
