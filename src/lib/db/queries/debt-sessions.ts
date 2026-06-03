import { db } from "../client";
import { debtSessions, NewDebtSession, DebtSession } from "../schema";
import { and, desc, eq, gte } from "drizzle-orm";

export async function createDebtSession(
  data: NewDebtSession
): Promise<DebtSession> {
  const [session] = await db.insert(debtSessions).values(data).returning();
  return session;
}

export async function getDebtSessionsByUser(
  userId: string,
  limit = 10
): Promise<DebtSession[]> {
  return db
    .select()
    .from(debtSessions)
    .where(eq(debtSessions.userId, userId))
    .orderBy(desc(debtSessions.createdAt))
    .limit(limit);
}

export async function getLatestDebtSession(
  userId: string
): Promise<DebtSession | null> {
  const [session] = await db
    .select()
    .from(debtSessions)
    .where(eq(debtSessions.userId, userId))
    .orderBy(desc(debtSessions.createdAt))
    .limit(1);
  return session ?? null;
}

/** Daily-aggregated score for the heatmap — one entry per day with a score. */
export interface DailyScore {
  date: string;        // "2026-06-03"
  debtScore: number;
  sessionCount: number;
}

/**
 * Fetch the highest score for each session day in the last `days` days.
 * Used by the dashboard score heatmap.
 */
export async function getDailyScoresByUser(
  userId: string,
  days = 30,
): Promise<DailyScore[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const rows = await db
    .select({
      date: debtSessions.createdAt,
      debtScore: debtSessions.debtScore,
    })
    .from(debtSessions)
    .where(
      and(
        eq(debtSessions.userId, userId),
        gte(debtSessions.createdAt, cutoff),
      ),
    )
    .orderBy(desc(debtSessions.createdAt));

  // Group by day in memory (simpler than date-truncation per dialect)
  const map = new Map<string, { maxScore: number; count: number }>();
  for (const r of rows) {
    const day = r.date.toISOString().slice(0, 10); // "2026-06-03"
    const entry = map.get(day);
    if (entry) {
      entry.maxScore = Math.max(entry.maxScore, r.debtScore);
      entry.count++;
    } else {
      map.set(day, { maxScore: r.debtScore, count: 1 });
    }
  }

  return Array.from(map.entries())
    .map(([date, { maxScore, count }]) => ({
      date,
      debtScore: maxScore,
      sessionCount: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
