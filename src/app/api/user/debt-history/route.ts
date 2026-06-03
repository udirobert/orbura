import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDebtSessionsByUser } from "@/lib/db/queries";

export const maxDuration = 10;

/**
 * GET /api/user/debt-history
 *
 * Returns the authenticated user's past debt assessment sessions,
 * most recent first. Limited to the last 10 sessions.
 *
 * Returns: { sessions: DebtHistoryItem[] }
 * Each item: { id, debtScore, verdict, recoveryTime, stressorCount, hasFaceScan, hasHRV, createdAt }
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const sessions = await getDebtSessionsByUser(auth.user.id, 10);

  const items = sessions.map((s) => ({
    id: Number(s.id),
    debtScore: s.debtScore,
    verdict: s.verdict,
    recoveryTime: s.recoveryTime,
    stressorCount: (s.stressors as unknown[])?.length ?? 0,
    hasFaceScan: !!s.faceAnalysis,
    hasHRV: !!s.hrvData,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ sessions: items });
}
