/**
 * Mira posture palette for Orbura.
 *
 * Each posture has a core color, edge color, glow, and relative breath
 * intensity. These are softer and more translucent than the debt-band
 * palette — Mira mode is calmer than debt mode.
 *
 * Colors are chosen to be distinct from the debt-band palette so the
 * transformation between modes is visually clear:
 *   - Debt mode: red/amber/orange (alarm, stress)
 *   - Mira mode: teal/blue/gold/green (calm, guidance)
 */

import type { MiraPosture } from "./contract";

export interface MiraPosturePalette {
  core: string;        // main orb body color
  coreSecondary: string; // gradient highlight
  glow: string;        // ambient glow (with alpha)
  ringColor: string;   // ring border (with alpha)
  breathMs: number;    // breath loop duration
  turbulence: "calm" | "gentle" | "active";
  label: string;       // telemetry label (uppercase)
}

export const MIRA_POSTURE_PALETTE: Record<MiraPosture, MiraPosturePalette> = {
  steady: {
    core: "#5B7A99",
    coreSecondary: "#8BAAC9",
    glow: "rgba(91,122,153,0.18)",
    ringColor: "rgba(91,122,153,0.15)",
    breathMs: 6000,
    turbulence: "calm",
    label: "STEADY",
  },
  offering: {
    core: "#C9A24B",
    coreSecondary: "#E8C97A",
    glow: "rgba(201,162,75,0.22)",
    ringColor: "rgba(201,162,75,0.2)",
    breathMs: 4000,
    turbulence: "gentle",
    label: "OFFERING",
  },
  holding: {
    core: "#4A8B8B",
    coreSecondary: "#7AB8B8",
    glow: "rgba(74,139,139,0.18)",
    ringColor: "rgba(74,139,139,0.15)",
    breathMs: 7000,
    turbulence: "calm",
    label: "HOLDING",
  },
  watching: {
    core: "#6B8FAE",
    coreSecondary: "#9BBFDE",
    glow: "rgba(107,143,174,0.2)",
    ringColor: "rgba(107,143,174,0.18)",
    breathMs: 5000,
    turbulence: "gentle",
    label: "WATCHING",
  },
  completed: {
    core: "#6B9B6E",
    coreSecondary: "#9BCB9E",
    glow: "rgba(107,155,110,0.2)",
    ringColor: "rgba(107,155,110,0.18)",
    breathMs: 4500,
    turbulence: "calm",
    label: "COMPLETE",
  },
  inquiry: {
    core: "#7B8FB5",
    coreSecondary: "#ABBFDE",
    glow: "rgba(123,143,181,0.2)",
    ringColor: "rgba(123,143,181,0.18)",
    breathMs: 3500,
    turbulence: "active",
    label: "PROCESSING",
  },
  gathering: {
    core: "#8B7BAE",
    coreSecondary: "#BBABDE",
    glow: "rgba(139,123,174,0.2)",
    ringColor: "rgba(139,123,174,0.18)",
    breathMs: 3800,
    turbulence: "gentle",
    label: "GATHERING",
  },
  resolving: {
    core: "#AE8B7B",
    coreSecondary: "#DEBBAB",
    glow: "rgba(174,139,123,0.2)",
    ringColor: "rgba(174,139,123,0.18)",
    breathMs: 4200,
    turbulence: "gentle",
    label: "RESOLVING",
  },
  adapting: {
    core: "#7BAE9B",
    coreSecondary: "#ABDECB",
    glow: "rgba(123,174,155,0.2)",
    ringColor: "rgba(123,174,155,0.18)",
    breathMs: 4800,
    turbulence: "gentle",
    label: "ADAPTING",
  },
};
