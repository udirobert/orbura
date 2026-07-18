import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCareClinician,
  getUserByEmail,
  createUser,
  getCarePatientByUserId,
  createCarePatient,
  updateCarePatientClinic,
} from "@/lib/db/queries/care";
import { randomUUID } from "node:crypto";

export const maxDuration = 30;

/**
 * POST /api/care/clinics/[id]/patients
 *
 * Enroll a patient in a clinic. The caller must be a clinician for the clinic.
 * If the user does not exist, a placeholder user is created and they can sign
 * in via the existing magic-link flow.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id: clinicId } = await params;
  const body = (await request.json()) as { email?: string; name?: string; medication?: string };
  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const clinician = await getCareClinician(auth.user.id, clinicId);
  if (!clinician) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  let user = await getUserByEmail(body.email);
  if (!user) {
    user = await createUser({ email: body.email, name: body.name ?? null });
  }

  let patient = await getCarePatientByUserId(user.id);
  if (patient) {
    if (patient.clinicId !== clinicId) {
      patient = await updateCarePatientClinic(patient.id, clinicId);
    }
    return NextResponse.json({ ok: true, patient });
  }

  const now = new Date();
  patient = await createCarePatient({
    id: randomUUID(),
    userId: user.id,
    clinicId,
    medication: body.medication ?? null,
    enrolledAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, patient });
}
