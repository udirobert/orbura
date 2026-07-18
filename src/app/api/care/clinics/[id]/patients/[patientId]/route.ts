import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAuth } from "@/lib/auth";
import {
  getCareClinician,
  getCareEscalationsForPatient,
  getCareAuditLogsForPatient,
  getCareInterventionsForPatient,
  getCareObservationsForPatient,
  getCarePatientById,
  getActiveCareAcknowledgement,
  revokeActiveCareInvitations,
  createCareInvitation,
} from "@/lib/db/queries/care";
import { createInvitationToken, hashInvitationToken, invitationExpiry } from "@/lib/care/invitations";

export const maxDuration = 30;

/** Clinician-only longitudinal record for a patient in their own clinic. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; patientId: string }> }) {
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

  const [observations, interventions, escalations, auditLogs] = await Promise.all([
    getCareObservationsForPatient(patient.id, 30),
    getCareInterventionsForPatient(patient.id, 30),
    getCareEscalationsForPatient(patient.id, 30),
    getCareAuditLogsForPatient(patient.id, 50),
  ]);
  return NextResponse.json({ ok: true, patient, observations, interventions, escalations, auditLogs });
}

/**
 * POST /api/care/clinics/[id]/patients/[patientId]
 *
 * Regenerate a secure invitation link for an enrolled patient.
 * Returns a fresh token if the patient has not yet acknowledged,
 * or null if an active acknowledgement already exists.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; patientId: string }> }) {
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

  const acknowledgement = await getActiveCareAcknowledgement(patient.id);
  if (acknowledgement) {
    return NextResponse.json({ ok: true, invitationToken: null, alreadyAcknowledged: true });
  }

  const invitationToken = createInvitationToken();
  await revokeActiveCareInvitations(patient.id);
  await createCareInvitation({
    id: randomUUID(),
    clinicId,
    patientId: patient.id,
    tokenHash: hashInvitationToken(invitationToken),
    expiresAt: invitationExpiry(),
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, invitationToken, alreadyAcknowledged: false });
}
