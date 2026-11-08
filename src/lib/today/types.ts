/**
 * Canonical adaptive-"Today" contract.
 *
 * `buildTodayState` (server) gathers inputs; `decideToday` (pure) turns them
 * into the single `TodayState` every surface renders. See
 * docs/adaptive-ux-plan.md Phase A — deterministic rules only, never LLM.
 */

export type TodayActionKind =
  | "follow-through"   // answer "did yesterday's action happen?"
  | "care-action"      // clinic-prescribed care intervention
  | "check-in"         // log vitals / symptoms / stressor check-in
  | "scan"             // camera vitals or face scan
  | "review";          // look at something (pattern, outcome)

export interface TodayAction {
  id: string;
  kind: TodayActionKind;
  label: string;
  detail?: string;
  href?: string;
  /** Set for follow-through so the UI can POST /api/interventions/respond. */
  sessionId?: number;
}

export type TodayHeadlineSource = "camera" | "wearable" | "check-in" | "care";

export interface TodayHeadline {
  /** Plain-language state word, e.g. "Steady", "Below baseline", "No data yet". */
  stateWord: string;
  /** Signed percent vs personal baseline when a comparable signal exists. */
  deltaPct: number | null;
  source: TodayHeadlineSource | null;
  /** ISO timestamp of the freshest underlying signal. */
  asOf: string | null;
  freshness: "fresh" | "stale" | "none";
}

export interface TodayContext {
  /** GLP-1 patients: weeks since medication start, when known. */
  treatmentWeek: number | null;
  /** Open escalation the patient should know is being handled. */
  openEscalation: boolean;
  /** Observation-style pattern line, never a causal claim. */
  patternLine: string | null;
  streakDays: number;
  pendingFollowThroughDate: string | null;
}

export interface TodayState {
  /** "care" when the user is an enrolled care patient, else their recovery mode. */
  surface: "care" | "personal" | "football" | "fan";
  headline: TodayHeadline;
  primaryAction: TodayAction;
  /** At most two — the action budget stays small by design. */
  secondaryActions: TodayAction[];
  context: TodayContext;
}
