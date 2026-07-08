import type { RecoveryMode, StressorType } from "@/lib/types";
import { STRESSORS, ACK_COPY } from "./catalog";
import type { StressorDef } from "./types";

// ─── Public surface ──────────────────────────────────────────────────────────

export { STRESSORS, CONFIDENCE_CONFIG } from "./catalog";
export { ACK_COPY };
export {
  computeSystemScores,
  computeCounterfactual,
  computeLiveScore,
  circadianPenaltyBrain,
  formatClearanceTime,
} from "./scoring";
export type { StressorDef, SubOption, CounterfactualResult } from "./types";

// ─── Selectors ───────────────────────────────────────────────────────────────

/**
 * Stressors that should appear in the intake catalog for the given mode.
 * A def with no `modes` field is shown in every mode.
 */
export function byMode(
  mode: RecoveryMode,
  catalog: StressorDef[] = STRESSORS,
): StressorDef[] {
  return catalog.filter((s) => !s.modes || s.modes.includes(mode));
}

/**
 * Stressors for the intake screen, in display order for the mode.
 * Fan mode leads with the match-specific stressors (result, tension, scroll)
 * before the shared lifestyle ones; other modes keep catalog order.
 * Stable sort preserves each group's relative order.
 */
export function intakeStressors(
  mode: RecoveryMode,
  catalog: StressorDef[] = STRESSORS,
): StressorDef[] {
  const defs = byMode(mode, catalog);
  if (mode !== "fan") return defs;
  return [...defs].sort(
    (a, b) => Number(!a.modes?.includes("fan")) - Number(!b.modes?.includes("fan")),
  );
}

/** Acknowledgement copy for an option key (drink type, intensity, etc.) */
export function ackFor(key: string): string {
  return ACK_COPY[key] ?? "";
}

/** Lookup a single stressor definition by type. */
export function findEntry(type: StressorType): StressorDef | undefined {
  return STRESSORS.find((d) => d.type === type);
}

/**
 * Backwards-compatible alias. Prefer `byMode` going forward.
 * @deprecated use `byMode` instead
 */
export const filterStressorsByMode = byMode;
