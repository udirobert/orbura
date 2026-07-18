import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSquadByCoach,
  createSquadPlayer,
  deleteSquadByCoach,
} from "@/lib/db/queries";
import type { SquadPlayer } from "@/lib/types";

/**
 * GET /api/squad
 * Returns the coach's persisted squad roster.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const coachId = (session.user as { id?: string }).id ?? session.user.email ?? "";
  const rows = await getSquadByCoach(coachId);

  const squad: SquadPlayer[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    position: r.position ?? "",
    jerseyNumber: r.jerseyNumber ?? undefined,
    analysis: r.analysis ?? null,
  }));

  return NextResponse.json({ ok: true, squad });
}

/**
 * POST /api/squad
 * Replaces the entire squad roster (sync from Zustand to DB).
 * Body: { squad: SquadPlayer[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const coachId = (session.user as { id?: string }).id ?? session.user.email ?? "";

  let body: { squad?: SquadPlayer[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.squad) {
    return NextResponse.json({ error: "squad is required" }, { status: 400 });
  }

  // Replace strategy: wipe and recreate (simpler than diffing)
  await deleteSquadByCoach(coachId);

  for (const player of body.squad) {
    await createSquadPlayer({
      id: player.id,
      coachId,
      name: player.name,
      position: player.position ?? null,
      jerseyNumber: player.jerseyNumber ?? null,
      analysis: player.analysis ?? null,
    });
  }

  return NextResponse.json({ ok: true, count: body.squad.length });
}
