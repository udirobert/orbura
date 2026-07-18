import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createCareClinic, createCareClinician } from "@/lib/db/queries/care";
import { randomUUID } from "node:crypto";

export const maxDuration = 30;

/**
 * POST /api/care/clinics
 *
 * Creates a new care clinic and makes the caller the admin clinician.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { name?: string };
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const clinic = await createCareClinic(body.name);
  await createCareClinician({
    id: randomUUID(),
    userId: auth.user.id,
    clinicId: clinic.id,
    role: "admin",
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, clinic });
}
