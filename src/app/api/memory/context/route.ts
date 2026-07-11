import { NextRequest, NextResponse } from "next/server";
import { getMemoryContext, isMemoryEnabled } from "@/lib/supermemory";

/**
 * GET /api/memory/context?containerTag=...&q=...
 *
 * Returns the user's Supermemory profile + relevant memories.
 * Used by the UI to show "Your coach remembers:" facts.
 */
export async function GET(request: NextRequest) {
  if (!isMemoryEnabled) {
    return NextResponse.json({ enabled: false, profile: "", memories: [] });
  }

  const containerTag = request.nextUrl.searchParams.get("containerTag");
  const q = request.nextUrl.searchParams.get("q") ?? "body debt recovery";

  if (!containerTag) {
    return NextResponse.json(
      { error: "containerTag is required" },
      { status: 400 },
    );
  }

  const ctx = await getMemoryContext(containerTag, q);
  if (!ctx) {
    return NextResponse.json({ enabled: true, profile: "", memories: [] });
  }

  const memoryLines = ctx.memories.split("\n").filter(Boolean);
  return NextResponse.json({
    enabled: true,
    profile: ctx.profile,
    memories: memoryLines,
  });
}
