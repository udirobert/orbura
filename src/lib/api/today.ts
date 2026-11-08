import { request } from "./request";
import type { TodayState } from "@/lib/today/types";

/**
 * GET /api/today — the canonical adaptive decision for the home surface.
 * Returns null for guests or on failure; callers keep their existing
 * guest-first fallback.
 */
export async function getTodayState(): Promise<TodayState | null> {
  const res = await request("/api/today");
  if (!res.ok) return null;
  return (await res.json()) as TodayState;
}
