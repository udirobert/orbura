import type { RecoveryMode, StressorType } from "@/lib/types";
import { STRESSORS } from "./catalog";
import type { StressorDef } from "./types";

// ─── Public surface ──────────────────────────────────────────────────────────

export { STRESSORS, ACK_COPY, CONFIDENCE_CONFIG } from "./catalog";
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
