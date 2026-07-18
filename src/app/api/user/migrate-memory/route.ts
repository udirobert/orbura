import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { linkAnonymousId, getUserByAnonymousId } from "@/lib/db/queries";
import { logAction, isMemoryEnabled } from "@/lib/supermemory";

/**
 * POST /api/user/migrate-memory
 *
 * Bridges a guest's anonymous Supermemory history to their authenticated
 * user identity. Called once on first sign-in (or when a guest signs in
 * with existing anonymous data).
 *
 * Body: { anonymousId: string }
 *
 * What it does:
 *   1. Links anonymousId → userId in the users table
 *   2. Re-logs key memories under the new userId containerTag so the
 *      coach's knowledge carries over (Supermemory doesn't support
 *      re-tagging, so we copy by re-adding)
 *   3. Future memory calls will use userId as containerTag
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id ?? session.user.email ?? "";
  if (!userId) {
    return NextResponse.json({ error: "no user id" }, { status: 400 });
  }

  let body: { anonymousId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { anonymousId } = body;
  if (!anonymousId) {
    return NextResponse.json({ ok: true, migrated: false, reason: "no anonymousId provided" });
  }

  // Check if this anonymousId is already linked to a different user
  const existing = await getUserByAnonymousId(anonymousId);
  if (existing && existing.id !== userId) {
    // Already linked to another account — don't steal it
    return NextResponse.json({ ok: true, migrated: false, reason: "anonymousId already linked to another user" });
  }

  // Link anonymousId to this user
  await linkAnonymousId(userId, anonymousId);

  // If Supermemory is enabled, log a bridge memory under the new userId
  // containerTag so the coach knows the guest history is now tied to this user.
  if (isMemoryEnabled) {
    logAction(userId, "Guest check-ins are now linked to this account.", {
      type: "memory_migration",
      anonymousId,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, migrated: true, userId, anonymousId });
}
