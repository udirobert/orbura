import type {
  TodayAction,
  TodayContext,
  TodayHeadline,
  TodayState,
} from "./types";

/**
 * Inputs gathered server-side for the adaptive Today decision.
 * All timestamps are ISO strings or null; `now` is injected for tests.
 */
export interface TodayInput {
  now: Date;
  surface: TodayState["surface"];

  // Care domain (null when the user is not an enrolled patient)
  careStartedAt: string | null;
  openEscalation: boolean;
  pendingCareAction: { id: string; action: string; dueAt: string } | null;
  lastCareCheckInAt: string | null;

  // Recovery domain
  pendingFollowThrough: {
    sessionId: number;
    action: string;
    date: string;
    debtScore: number;
  } | null;

  // Signals
  lastVitalsAt: string | null;      // freshest camera_vitals observation
  vitalsDeltaPct: number | null;    // HRV vs 28d baseline, percent
  lastWearableAt: string | null;
  wearableDeltaPct: number | null;
  lastCheckInAt: string | null;     // freshest debt session / analysis
  latestDebtScore: number | null;

  // Patterns / streaks (from getUserPatterns)
  streakDays: number;
  patternLine: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TITRATION_WEEKS = 4;

function hoursSince(iso: string | null, now: Date): number {
  if (!iso) return Infinity;
  return (now.getTime() - new Date(iso).getTime()) / (60 * 60 * 1000);
}

function treatmentWeek(startedAt: string | null, now: Date): number | null {
  if (!startedAt) return null;
  return Math.floor((now.getTime() - new Date(startedAt).getTime()) / (7 * DAY_MS)) + 1;
}

function buildHeadline(input: TodayInput): TodayHeadline {
  // Prefer the freshest signal that has a baseline delta.
  const candidates: { at: string; source: TodayHeadline["source"]; delta: number | null }[] = [];
  if (input.lastVitalsAt) {
    candidates.push({ at: input.lastVitalsAt, source: "camera", delta: input.vitalsDeltaPct });
  }
  if (input.lastWearableAt) {
    candidates.push({ at: input.lastWearableAt, source: "wearable", delta: input.wearableDeltaPct });
  }
  if (input.lastCheckInAt) {
    candidates.push({ at: input.lastCheckInAt, source: "check-in", delta: null });
  }
  candidates.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const best = candidates[0];

  if (!best) {
    return { stateWord: "No data yet", deltaPct: null, source: null, asOf: null, freshness: "none" };
  }

  const age = hoursSince(best.at, input.now);
  const freshness = age <= 24 ? "fresh" : age <= 72 ? "stale" : "none";
  const delta = best.delta;

  let stateWord = "Steady";
  if (delta != null) {
    if (delta <= -10) stateWord = "Below baseline";
    else if (delta <= -3) stateWord = "Slightly below baseline";
    else if (delta >= 10) stateWord = "Above baseline";
    else if (delta >= 3) stateWord = "Slightly above baseline";
  } else if (input.latestDebtScore != null) {
    stateWord = input.latestDebtScore <= 20 ? "Low load" : input.latestDebtScore <= 50 ? "Moderate load" : "High load";
  }

  return { stateWord, deltaPct: delta, source: best.source, asOf: best.at, freshness };
}

/**
 * Deterministic priority order. First match wins the primary action;
 * everything else becomes secondary (capped at two).
 */
export function decideToday(input: TodayInput): TodayState {
  const week = treatmentWeek(input.careStartedAt, input.now);
  const isTitration = week != null && week <= TITRATION_WEEKS;

  const headline = buildHeadline(input);
  const provenance = {
    surface: input.surface,
    careStartedAt: input.careStartedAt,
    openEscalation: input.openEscalation,
    pendingCareActionId: input.pendingCareAction?.id ?? null,
    pendingFollowThroughSessionId: input.pendingFollowThrough?.sessionId ?? null,
    lastVitalsAt: input.lastVitalsAt,
    lastWearableAt: input.lastWearableAt,
    lastCheckInAt: input.lastCheckInAt,
    latestDebtScore: input.latestDebtScore,
    vitalsDeltaPct: input.vitalsDeltaPct,
    wearableDeltaPct: input.wearableDeltaPct,
    streakDays: input.streakDays,
  };
  const context: TodayContext = {
    treatmentWeek: week,
    openEscalation: input.openEscalation,
    patternLine: input.patternLine,
    streakDays: input.streakDays,
    pendingFollowThroughDate: input.pendingFollowThrough?.date ?? null,
  };

  const secondary: TodayAction[] = [];

  // 1. Open escalation — surface it calmly; the action is still the check-in.
  if (input.openEscalation) {
    return {
      surface: input.surface,
      rule: "escalation",
      provenance,
      headline: { ...headline, stateWord: "Care team reviewing" },
      primaryAction: {
        id: "escalation-check-in",
        kind: "check-in",
        label: "Complete today's check-in",
        detail: "Your clinic can see it right away",
        href: "/care",
      },
      secondaryActions: secondary.slice(0, 2),
      context,
    };
  }

  // 2. Care patient: clinic action > stale check-in > titration focus.
  if (input.surface === "care") {
    const checkIn: TodayAction = {
      id: "care-check-in",
      kind: "check-in",
      label: "Today's check-in",
      detail: "Symptoms, dose, weight — about a minute",
      href: "/care",
    };
    const primary = input.pendingCareAction
      ? {
          id: `care-${input.pendingCareAction.id}`,
          kind: "care-action" as const,
          label: input.pendingCareAction.action,
          detail: "Recommended by your care plan",
          href: "/care",
        }
      : checkIn;
    if (input.pendingCareAction) secondary.push(checkIn);
    return {
      surface: "care",
      rule: "care-action",
      provenance,
      headline,
      primaryAction: {
        ...primary,
        detail: isTitration
          ? `${primary.detail ?? ""} · week ${week} of treatment`.trim()
          : primary.detail,
      },
      secondaryActions: secondary.slice(0, 2),
      context,
    };
  }

  // 3. Unanswered follow-through from a previous session — ask first.
  if (input.pendingFollowThrough) {
    return {
      surface: input.surface,
      rule: "follow-through",
      provenance,
      headline,
      primaryAction: {
        id: `follow-${input.pendingFollowThrough.sessionId}`,
        kind: "follow-through",
        label: `Did it happen? ${input.pendingFollowThrough.action}`,
        detail: `From ${input.pendingFollowThrough.date}`,
        sessionId: input.pendingFollowThrough.sessionId,
      },
      secondaryActions: [
        {
          id: "scan-now",
          kind: "scan",
          label: "Camera check-in",
          detail: "45 seconds, nothing recorded",
          href: "/hrv-pull",
        },
      ],
      context,
    };
  }

  // 4. No data at all — the honest empty state is the onboarding CTA.
  if (headline.freshness === "none" && input.latestDebtScore == null) {
    return {
      surface: input.surface,
      rule: "empty-state",
      provenance,
      headline,
      primaryAction: {
        id: "first-check-in",
        kind: "check-in",
        label: "Start your first check-in",
        detail: "One minute — the orb learns what you can sustain",
        href: "/dashboard",
      },
      secondaryActions: [
        {
          id: "first-scan",
          kind: "scan",
          label: "Or try a camera check-in",
          detail: "Vitals from your webcam, verified on-chain",
          href: "/hrv-pull",
        },
      ],
      context,
    };
  }

  // 5. Fresh camera vitals — show the delta, offer a re-scan as secondary.
  if (input.lastVitalsAt && hoursSince(input.lastVitalsAt, input.now) <= 24) {
    secondary.push({
      id: "rescan",
      kind: "scan",
      label: "Re-scan vitals",
      detail: "45 seconds",
      href: "/hrv-pull",
    });
  }

  // 6. Stale signals — nudge a check-in; keep an action budget of one.
  const anythingFresh =
    (input.lastVitalsAt && hoursSince(input.lastVitalsAt, input.now) <= 72) ||
    (input.lastWearableAt && hoursSince(input.lastWearableAt, input.now) <= 72) ||
    (input.lastCheckInAt && hoursSince(input.lastCheckInAt, input.now) <= 72);

  if (!anythingFresh) {
    return {
      surface: input.surface,
      rule: "stale-signals",
      provenance,
      headline: { ...headline, freshness: "stale" },
      primaryAction: {
        id: "stale-check-in",
        kind: "check-in",
        label: "It's been a few days — check in",
        detail: "Keeps your baseline honest",
        href: "/dashboard",
      },
      secondaryActions: [
        {
          id: "stale-scan",
          kind: "scan",
          label: "Camera check-in",
          href: "/hrv-pull",
        },
      ],
      context,
    };
  }

  // 7. Healthy steady state — small sustaining action + optional scan.
  return {
    surface: input.surface,
    rule: "steady",
      provenance,
    headline,
    primaryAction: {
      id: "steady-check-in",
      kind: "check-in",
      label: "Log today's check-in",
      detail: input.streakDays > 1 ? `${input.streakDays}-day streak — keep it alive` : undefined,
      href: "/dashboard",
    },
    secondaryActions: secondary.slice(0, 2),
    context,
  };
}
