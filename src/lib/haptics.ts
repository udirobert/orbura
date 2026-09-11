"use client";

/**
 * Tiny haptic helper wrapping the Vibration API.
 *
 * Android Chrome supports it; iOS Safari ignores `navigator.vibrate`
 * entirely — calls are safe no-ops there.
 */

export type HapticPattern = "light" | "medium" | "success";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 15,
  success: [10, 50, 30],
};

export function haptic(pattern: HapticPattern = "light") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Never let haptics break an interaction
  }
}
