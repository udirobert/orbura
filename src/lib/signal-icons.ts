"use client";

/**
 * Canonical icon vocabulary — one glyph per domain and per wearable source.
 *
 * Signals (HRV, sleep, memory, streak…) use SIGNAL_ICONS so the domain reads
 * before the words. Wearable sources use SOURCE_ICONS so "where the number
 * came from" is recognizable at a glance and matches the device picker.
 * Everything is lucide — no emoji in the core product surfaces.
 */

import {
  Activity,
  Apple,
  Brain,
  FileUp,
  FlaskConical,
  Flame,
  Hand,
  Heart,
  HeartPulse,
  Lock,
  Moon,
  Radio,
  Scale,
  Smartphone,
  Watch,
  type LucideIcon,
} from "lucide-react";
import type { HRVSource } from "@/lib/types";

/** Domain signals — what a line of status is *about*. */
export const SIGNAL_ICONS = {
  hrv: Activity,
  restingHr: HeartPulse,
  sleep: Moon,
  memory: Brain,
  streak: Flame,
  wearable: Watch,
  auth: Lock,
} satisfies Record<string, LucideIcon>;

/** Measurement sources — where a reading came from. */
export const SOURCE_ICONS: Record<HRVSource, LucideIcon> = {
  terra: Radio,
  healthkit: Apple,
  google_fit: Smartphone,
  garmin_export: FileUp,
  garmin_fit: FileUp,
  apple_health: Heart,
  withings: Scale,
  manual_proxy: Hand,
  demo: FlaskConical,
};
