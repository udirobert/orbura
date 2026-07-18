import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCarePatientByUserId,
  getCareObservationsForPatient,
  getPendingInterventionsForPatient,
  getRecentInterventionOutcomesForPatient,
  getOpenEscalationsForPatient,
  getCareClinicById,
} from "@/lib/db/queries/care";

export const maxDuration = 30;

/**
 * GET /api/care/patient/summary
 *
 * Patient-facing summary of recent check-ins, open escalations, and
 * pending interventions for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const patient = await getCarePatientByUserId(auth.user.id);
  if (!patient?.clinicId) {
    return NextResponse.json({ error: "Care access has not been set up by your clinic" }, { status: 403 });
  }

  const [observations, pendingInterventions, recentOutcomes, openEscalations] = await Promise.all([
    getCareObservationsForPatient(patient.id, 10),
    getPendingInterventionsForPatient(patient.id),
    getRecentInterventionOutcomesForPatient(patient.id),
    getOpenEscalationsForPatient(patient.id),
  ]);
  const clinic = patient.clinicId ? await getCareClinicById(patient.clinicId) : undefined;

  return NextResponse.json({
    ok: true,
    patient,
    clinic: clinic ? { id: clinic.id, name: clinic.name } : null,
    observations,
    pendingInterventions,
    recentOutcomes,
    openEscalations,
  });
}
