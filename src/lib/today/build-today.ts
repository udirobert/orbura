import { db } from "@/lib/db/client";
import { wearableObservations } from "@/lib/db/schema";
import {
  getBaselineStats,
} from "@/lib/db/queries/wearable-observations";
import {
  getLatestDebtSession,
  getPendingIntervention,
  getUserPatterns,
  pickInterventionAction,
} from "@/lib/db/queries/debt-sessions";
import {
  getCareObservationsForPatient,
  getCarePatientByUserId,
  getOpenEscalationsForPatient,
  getPendingInterventionsForPatient,
} from "@/lib/db/queries/care";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { decideToday, type TodayInput } from "./decision-rules";
import type { TodayState } from "./types";

const CAMERA_SOURCE = "camera_vitals";

async function latestVitalSignal(
  userId: string,
  source: string | null, // null = any non-camera source
) {
  const conds = [eq(wearableObservations.userId, userId)];
  if (source === CAMERA_SOURCE) {
    conds.push(eq(wearableObservations.source, CAMERA_SOURCE));
  } else if (source === null) {
    conds.push(ne(wearableObservations.source, CAMERA_SOURCE));
  }
  const [row] = await db
    .select({
      recordedAt: sql<Date>`max(${wearableObservations.recordedAt})`,
    })
    .from(wearableObservations)
    .where(and(...conds));
  return row?.recordedAt ?? null;
}

async function latestHrvDelta(userId: string, cameraOnly: boolean) {
  const conds = [
    eq(wearableObservations.userId, userId),
    eq(wearableObservations.metricType, "hrv_rmssd"),
  ];
  if (cameraOnly) conds.push(eq(wearableObservations.source, CAMERA_SOURCE));
  else conds.push(ne(wearableObservations.source, CAMERA_SOURCE));

  const [latest] = await db
    .select({ value: wearableObservations.value, recordedAt: wearableObservations.recordedAt })
    .from(wearableObservations)
    .where(and(...conds))
    .orderBy(desc(wearableObservations.recordedAt))
    .limit(1);
  if (!latest) return null;

  // Baseline spans all sources for the metric — a personal normal, not a
  // per-device normal.
  const stats = await getBaselineStats({
    userId,
    metricType: "hrv_rmssd",
    recordedAt: latest.recordedAt,
    windowDays: 28,
  });
  if (!stats || stats.avg === 0) return { at: latest.recordedAt, deltaPct: null };
  return {
    at: latest.recordedAt,
    deltaPct: Math.round(((latest.value - stats.avg) / stats.avg) * 100),
  };
}

/**
 * Builds the canonical TodayState for a signed-in user. Gathers the minimum
 * set of queries (all indexed lookups) and defers every "what matters" choice
 * to the pure decision rules.
 */
export async function buildTodayState(userId: string): Promise<TodayState> {
  const now = new Date();

  const [patient, pendingSession, latestSession, patterns] = await Promise.all([
    getCarePatientByUserId(userId),
    getPendingIntervention(userId),
    getLatestDebtSession(userId),
    getUserPatterns(userId),
  ]);

  let careInput: Pick<
    TodayInput,
    "careStartedAt" | "openEscalation" | "pendingCareAction" | "lastCareCheckInAt"
  > = {
    careStartedAt: null,
    openEscalation: false,
    pendingCareAction: null,
    lastCareCheckInAt: null,
  };

  if (patient) {
    const [pending, escalations, observations] = await Promise.all([
      getPendingInterventionsForPatient(patient.id),
      getOpenEscalationsForPatient(patient.id),
      getCareObservationsForPatient(patient.id, 1),
    ]);
    careInput = {
      careStartedAt: patient.startedAt?.toISOString() ?? null,
      openEscalation: escalations.length > 0,
      pendingCareAction: pending[0]
        ? { id: pending[0].id, action: pending[0].action, dueAt: pending[0].dueAt.toISOString() }
        : null,
      lastCareCheckInAt: observations[0]?.checkInAt.toISOString() ?? null,
    };
  }

  const [cameraSignal, wearableSignal] = await Promise.all([
    latestHrvDelta(userId, true),
    latestHrvDelta(userId, false),
  ]);
  const [lastCameraAt, lastWearableAt] = await Promise.all([
    latestVitalSignal(userId, CAMERA_SOURCE),
    latestVitalSignal(userId, null),
  ]);

  // A camera reading is also a wearable observation? No — sources are distinct
  // rows; use whichever signal timestamp is fresher for each channel.
  const vitalsAt = cameraSignal?.at ?? lastCameraAt;
  const wearableAt = wearableSignal?.at ?? lastWearableAt;

  const pendingAction = pendingSession ? pickInterventionAction(pendingSession.prescription) : null;

  const input: TodayInput = {
    now,
    surface: patient ? "care" : "personal",
    ...careInput,
    pendingFollowThrough: pendingSession && pendingAction
      ? {
          sessionId: Number(pendingSession.id),
          action: pendingAction,
          date: pendingSession.createdAt.toISOString().slice(0, 10),
          debtScore: pendingSession.debtScore,
        }
      : null,
    lastVitalsAt: vitalsAt?.toISOString() ?? null,
    vitalsDeltaPct: cameraSignal?.deltaPct ?? null,
    lastWearableAt: wearableAt?.toISOString() ?? null,
    wearableDeltaPct: wearableSignal?.deltaPct ?? null,
    lastCheckInAt: latestSession?.createdAt.toISOString() ?? null,
    latestDebtScore: latestSession?.debtScore ?? null,
    streakDays: patterns?.streakDays ?? 0,
    patternLine: patterns?.dayOfWeekPattern
      ? `Your ${patterns.dayOfWeekPattern}.`
      : null,
  };

  return decideToday(input);
}
