import { decideToday, type TodayInput } from "./decision-rules";
import type { TodayState } from "./types";

/**
 * Deterministic fixtures for the /preview/adaptive role-density demo.
 * `now` is fixed so screenshots and tests are stable.
 */

export const FIXTURE_NOW = new Date("2026-06-10T08:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function input(overrides: Partial<TodayInput>): TodayInput {
  return {
    now: FIXTURE_NOW,
    surface: "personal",
    careStartedAt: null,
    openEscalation: false,
    pendingCareAction: null,
    lastCareCheckInAt: null,
    pendingFollowThrough: null,
    lastVitalsAt: null,
    vitalsDeltaPct: null,
    lastWearableAt: null,
    wearableDeltaPct: null,
    lastCheckInAt: null,
    latestDebtScore: null,
    streakDays: 0,
    patternLines: [],
    ...overrides,
  };
}

export interface AdaptiveScenario {
  id: string;
  label: string;
  blurb: string;
  state: TodayState;
  /** Clinician-density longitudinal context (not part of TodayState). */
  clinician: {
    patientLabel: string;
    medication: string | null;
    pendingActions: { action: string; dueAt: string }[];
    recentOutcomes: { action: string; status: string; date: string }[];
    openEscalationReason: string | null;
  };
  /** Auditor-density proof metadata, when the decision touched ZK. */
  proof: {
    modelId: string;
    score: number;
    healthy: boolean;
    inputDigest: string;
    chain: "skale" | "starknet";
    txRef: string;
  } | null;
}

export const ADAPTIVE_SCENARIOS: AdaptiveScenario[] = [
  {
    id: "steady",
    label: "Steady week",
    blurb: "Personal user, fresh camera vitals, 5-day streak.",
    state: (() => {
      const s = decideToday(input({
        lastVitalsAt: new Date(FIXTURE_NOW.getTime() - 3 * HOUR).toISOString(),
        vitalsDeltaPct: 4,
        lastCheckInAt: new Date(FIXTURE_NOW.getTime() - 26 * HOUR).toISOString(),
        latestDebtScore: 18,
        streakDays: 5,
        patternLines: ["Your scores tend to be higher on Monday (avg 34)."],
      }));
      s.latestCredential = {
        modelId: "ORBU-stress-mlp-v1",
        score: 0.18,
        healthy: true,
        prover: "risc0",
        chain: "starknet",
        txHash: "0x04267e499ef5ad8d640101afa15b2f525358f854fcc8e7ab2aefe07c1abf4afe",
        verifiedAt: "2026-06-10T06:12:00Z",
        inputDigest: "sha256:9f2c…a41d",
      };
      return s;
    })(),
    clinician: {
      patientLabel: "Not a care patient",
      medication: null,
      pendingActions: [],
      recentOutcomes: [],
      openEscalationReason: null,
    },
    proof: {
      modelId: "ORBU-stress-mlp-v1",
      score: 0.18,
      healthy: true,
      inputDigest: "sha256:9f2c…a41d",
      chain: "starknet",
      txRef: "0x04267e499ef5ad8d640101afa15b2f525358f854fcc8e7ab2aefe07c1abf4afe",
    },
  },
  {
    id: "titration",
    label: "GLP-1 titration",
    blurb: "Care patient, week 2 of treatment, clinic action pending.",
    state: decideToday(input({
      surface: "care",
      careStartedAt: new Date(FIXTURE_NOW.getTime() - 9 * DAY).toISOString(),
      pendingCareAction: { id: "ci-1042", action: "Log any nausea before your evening dose", dueAt: new Date(FIXTURE_NOW.getTime() + 10 * HOUR).toISOString() },
      lastCareCheckInAt: new Date(FIXTURE_NOW.getTime() - 30 * HOUR).toISOString(),
    })),
    clinician: {
      patientLabel: "Patient · enrolled Jun 1",
      medication: "semaglutide 0.25mg weekly",
      pendingActions: [
        { action: "Log any nausea before your evening dose", dueAt: "2026-06-10T18:00Z" },
      ],
      recentOutcomes: [
        { action: "Take dose with food", status: "completed", date: "2026-06-09" },
        { action: "Small frequent meals", status: "completed", date: "2026-06-08" },
      ],
      openEscalationReason: null,
    },
    proof: null,
  },
  {
    id: "escalation",
    label: "Escalation open",
    blurb: "Moderate symptoms flagged; clinic reviewing.",
    state: decideToday(input({
      surface: "care",
      careStartedAt: new Date(FIXTURE_NOW.getTime() - 16 * DAY).toISOString(),
      openEscalation: true,
      lastCareCheckInAt: new Date(FIXTURE_NOW.getTime() - 5 * HOUR).toISOString(),
    })),
    clinician: {
      patientLabel: "Patient · enrolled May 25",
      medication: "semaglutide 0.5mg weekly",
      pendingActions: [],
      recentOutcomes: [
        { action: "Bland diet today", status: "skipped", date: "2026-06-09" },
      ],
      openEscalationReason: "moderate nausea + vomiting, 2 consecutive check-ins",
    },
    proof: null,
  },
  {
    id: "follow-through",
    label: "Follow-through pending",
    blurb: "Yesterday's prescribed action is unanswered.",
    state: decideToday(input({
      pendingFollowThrough: { sessionId: 412, action: "10-minute walk before lunch", date: "2026-06-09", debtScore: 42 },
      lastCheckInAt: new Date(FIXTURE_NOW.getTime() - 20 * HOUR).toISOString(),
      latestDebtScore: 42,
    })),
    clinician: {
      patientLabel: "Not a care patient",
      medication: null,
      pendingActions: [],
      recentOutcomes: [],
      openEscalationReason: null,
    },
    proof: null,
  },
  {
    id: "empty",
    label: "No data yet",
    blurb: "New user — honest empty state, onboarding CTA.",
    state: decideToday(input({})),
    clinician: {
      patientLabel: "Not a care patient",
      medication: null,
      pendingActions: [],
      recentOutcomes: [],
      openEscalationReason: null,
    },
    proof: null,
  },
];
