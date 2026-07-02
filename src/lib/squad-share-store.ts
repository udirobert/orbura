/**
 * squad-share-store.ts
 *
 * Shared in-memory store for squad share snapshots.
 * Both the API route (POST /api/squad/share) and the shared page
 * (GET /squad/shared/[token]) import from this module so they share
 * the same Map.
 *
 * The cache is ephemeral (per server process). Stale entries are
 * cleaned up every 10 minutes. For production, back this with a
 * database instead.
 */

import type { SquadPlayer } from "@/lib/types";

export interface SharedSquadEntry {
  squad: Pick<SquadPlayer, "name" | "position" | "analysis">[];
  createdAt: number;
  appName?: string;
}

const sharedSquads = new Map<string, SharedSquadEntry>();
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup stale entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of sharedSquads) {
      if (now - entry.createdAt > STALE_MS) {
        sharedSquads.delete(token);
      }
    }
  }, 10 * 60 * 1000);
}

export function setSharedSquad(token: string, entry: SharedSquadEntry): void {
  sharedSquads.set(token, entry);
}

export function getSharedSquad(token: string): SharedSquadEntry | undefined {
  return sharedSquads.get(token);
}
