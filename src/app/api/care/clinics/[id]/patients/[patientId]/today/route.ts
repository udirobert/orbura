import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCareClinician, getCarePatientById } from "@/lib/db/queries/care";
import { buildTodayState } from "@/lib/today/build-today";

export const maxDuration = 15;

/**
 * GET /api/care/clinics/[id]/patients/[patientId]/today
 *
 * The patient's canonical TodayState for the clinician density — same
 * deterministic decision the patient sees, plus rule + provenance.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; patientId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: clinicId, patientId } = await params;
  const [clinician, patient] = await Promise.all([
    getCareClinician(auth.user.id, clinicId),
    getCarePatientById(patientId),
  ]);
  if (!clinician || !patient || patient.clinicId !== clinicId) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const today = await buildTodayState(patient.userId);
  return NextResponse.json({ ok: true, today });
}
