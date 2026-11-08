import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { verifyLinkToken } from "@/lib/vitals/link-token";
import { getLatestZkCredential } from "@/lib/db/queries/zk-credentials";

export const maxDuration = 10;

/**
 * GET /api/credentials/latest
 *
 * The caller's most recent verified credential — or null. Accepts the
 * Companion link token for read-only access, same as /api/today.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  let userId: string;

  if (auth.ok) {
    userId = auth.user.id;
  } else {
    let linkUserId: string | null = null;
    try {
      linkUserId = verifyLinkToken(request.headers.get("x-orbura-link-token"));
    } catch {
      linkUserId = null;
    }
    if (!linkUserId) return auth.response;
    userId = linkUserId;
  }

  const credential = await getLatestZkCredential(userId);
  return NextResponse.json({ credential: credential ?? null });
}
