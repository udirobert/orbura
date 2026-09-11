import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { setSessionAdherence } from "@/lib/db/queries";

export const maxDuration = 10;

/**
 * POST /api/interventions/respond
 * Body: { sessionId: number, adherence: "did" | "skipped" }
 *
 * Records whether the user followed a session's prescribed action.
 * First answer wins — already-answered sessions return 404.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = Number((body as { sessionId?: unknown })?.sessionId);
  const adherence = (body as { adherence?: unknown })?.adherence;

  if (!Number.isFinite(sessionId) || (adherence !== "did" && adherence !== "skipped")) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const ok = await setSessionAdherence(sessionId, auth.user.id, adherence);
  if (!ok) {
    return NextResponse.json(
      { message: "Session not found or already answered" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
