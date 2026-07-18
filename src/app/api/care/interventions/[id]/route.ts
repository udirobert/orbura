import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCarePatientByUserId, getCareInterventionById, updateCareInterventionStatus, getActiveCareAcknowledgement } from "@/lib/db/queries/care";

export const maxDuration = 30;

/**
 * PATCH /api/care/interventions/[id]
 *
 * Patients can mark their own interventions as completed or skipped.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string; outcomeCode?: string; outcomeNote?: string };
  if (body.status !== "completed" && body.status !== "skipped") {
    return NextResponse.json({ error: "status must be completed or skipped" }, { status: 400 });
  }
  const allowedOutcomeCodes = ["helped", "too_hard", "side_effect", "no_time"];
  if (!body.outcomeCode || !allowedOutcomeCodes.includes(body.outcomeCode)) {
    return NextResponse.json({ error: "choose an outcome" }, { status: 400 });
  }
  if (body.outcomeNote && body.outcomeNote.length > 500) {
    return NextResponse.json({ error: "outcome note must be 500 characters or fewer" }, { status: 400 });
  }

  const patient = await getCarePatientByUserId(auth.user.id);
  if (!patient) {
    return NextResponse.json({ error: "patient not found" }, { status: 404 });
  }

  const acknowledgement = await getActiveCareAcknowledgement(patient.id);
  if (!acknowledgement) {
    return NextResponse.json({ error: "Care sharing is not active" }, { status: 403 });
  }

  const intervention = await getCareInterventionById(id);
  if (!intervention) {
    return NextResponse.json({ error: "intervention not found" }, { status: 404 });
  }
  if (intervention.patientId !== patient.id) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const updated = await updateCareInterventionStatus(id, body.status, {
    code: body.outcomeCode,
    note: body.outcomeNote?.trim() || null,
  });
  return NextResponse.json({ ok: true, intervention: updated });
}
