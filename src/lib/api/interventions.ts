import { request } from "./request";

// ─── Intervention follow-through ────────────────────────────────────────────

export interface PendingIntervention {
  sessionId: number;
  action: string;
  date: string;
  debtScore: number;
}

export interface InterventionOutcome {
  hrvBefore: number | null;
  hrvAfter: number;
  hrvDate: string;
}

export interface LatestInterventionResponse {
  intervention: PendingIntervention | null;
  outcome: InterventionOutcome | null;
}

/**
 * The most recent unanswered "did you do it" — a session from before today
 * whose prescription line has no recorded adherence. GET /api/interventions/latest
 */
export async function getLatestIntervention(): Promise<LatestInterventionResponse> {
  const res = await request("/api/interventions/latest");
  if (!res.ok) {
    return { intervention: null, outcome: null };
  }
  return (await res.json()) as LatestInterventionResponse;
}

/**
 * Records whether the user followed a session's action.
 * POST /api/interventions/respond
 */
export async function respondToIntervention(
  sessionId: number,
  adherence: "did" | "skipped",
): Promise<boolean> {
  const res = await request("/api/interventions/respond", {
    method: "POST",
    body: JSON.stringify({ sessionId, adherence }),
  });
  return res.ok;
}
