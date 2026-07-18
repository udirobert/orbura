import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCareClinician,
  getUserByEmail,
  createUser,
  getCarePatientByUserId,
  createCarePatient,
  updateCarePatient,
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
  const body = (await request.json()) as { email?: string; name?: string; medication?: string; currentDose?: string; startedAt?: string };
  if (!body.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const startedAt = body.startedAt ? new Date(`${body.startedAt}T00:00:00.000Z`) : undefined;
  if (body.startedAt && (Number.isNaN(startedAt?.getTime()) || startedAt! > new Date())) {
    return NextResponse.json({ error: "treatment start date must be a valid past date" }, { status: 400 });
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
    const needsUpdate =
      patient.clinicId !== clinicId ||
      (body.medication && patient.medication !== body.medication) ||
      (body.currentDose && patient.currentDose !== body.currentDose) ||
      (!!startedAt && patient.startedAt?.getTime() !== startedAt.getTime());
    if (needsUpdate) {
      patient = await updateCarePatient(patient.id, {
        clinicId,
        medication: body.medication ?? patient.medication,
        currentDose: body.currentDose ?? patient.currentDose,
        startedAt: startedAt ?? patient.startedAt,
      });
    }
    return NextResponse.json({ ok: true, patient });
  }

  const now = new Date();
  patient = await createCarePatient({
    id: randomUUID(),
    userId: user.id,
    clinicId,
    medication: body.medication ?? null,
    currentDose: body.currentDose ?? null,
    startedAt: startedAt ?? null,
    enrolledAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, patient });
}
