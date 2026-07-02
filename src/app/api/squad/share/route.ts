/**
 * POST /api/squad/share
 *
 * Accepts squad snapshot data and stores it in an in-memory cache,
 * returning a short share token. The token can be used to look up
 * the snapshot at /squad/shared/[token].
 *
 * The cache is ephemeral (per server process). For production, this
 * should be backed by a database — the in-memory cache is sufficient
 * for demo use.
 */
import { NextRequest, NextResponse } from "next/server";
import type { SquadPlayer } from "@/lib/types";
import { setSharedSquad, getSharedSquad } from "@/lib/squad-share-store";

export const maxDuration = 10;

/**
 * POST /api/squad/share
 *
 * Body:
 * {
 *   squad: SquadPlayer[],     // full squad roster
 *   appName?: string           // "Match Fit" or custom
 * }
 *
 * Returns:
 * {
 *   token: string,
 *   url: string               // full shareable URL
 * }
 */
export async function POST(request: NextRequest) {
  let body: { squad: SquadPlayer[]; appName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.squad || !Array.isArray(body.squad) || body.squad.length === 0) {
    return NextResponse.json({ error: "Squad must be a non-empty array" }, { status: 400 });
  }

  // Generate a short token (8 chars, alphanumeric)
  const token = generateToken();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  setSharedSquad(token, {
    squad: body.squad.map((p) => ({
      name: p.name,
      position: p.position,
      analysis: p.analysis ?? null,
    })),
    createdAt: Date.now(),
    appName: body.appName,
  });

  return NextResponse.json({
    token,
    url: `${baseUrl}/squad/shared/${token}`,
  });
}

/**
 * GET /api/squad/share?token=<token>
 *
 * Returns the shared squad snapshot, or 404 if not found.
 */
export async function GET(request: NextRequest) {
  // Use URL parsing instead of nextUrl.searchParams for testability
  // (nextUrl is NextRequest-only; URL is universal)
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
  }

  const entry = getSharedSquad(token);
  if (!entry) {
    return NextResponse.json({ error: "Squad snapshot not found or expired" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

// ─── Token generator ─────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
