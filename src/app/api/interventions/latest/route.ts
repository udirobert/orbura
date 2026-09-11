import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getPendingIntervention,
  getWearableTrend,
  pickInterventionAction,
} from "@/lib/db/queries";

export const maxDuration = 10;

/**
 * GET /api/interventions/latest
 *
 * Returns the most recent session whose prescribed action has no recorded
 * adherence (sessions from before today only), plus the wearable response
 * since that session — last HRV reading on/before the session date vs the
 * newest reading after it. Guests receive 401.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const session = await getPendingIntervention(auth.user.id);
  if (!session) {
    return NextResponse.json({ intervention: null, outcome: null });
  }

  const sessionDate = session.createdAt.toISOString().slice(0, 10);

  // HRV before the session vs the latest reading after it.
  const trend = await getWearableTrend(auth.user.id, 14);
  const withHrv = trend.filter((p) => p.hrv != null);
  const before = [...withHrv].reverse().find((p) => p.date <= sessionDate);
  const after = [...withHrv].reverse().find((p) => p.date > sessionDate);

  return NextResponse.json({
    intervention: {
      sessionId: Number(session.id),
      action: pickInterventionAction(session.prescription),
      date: sessionDate,
      debtScore: session.debtScore,
    },
    outcome: after
      ? { hrvBefore: before?.hrv ?? null, hrvAfter: after.hrv, hrvDate: after.date }
      : null,
  });
}
