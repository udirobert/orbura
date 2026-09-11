import { db } from "../client";
import { debtSessions, NewDebtSession, DebtSession } from "../schema";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";

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

// ─── Intervention loop ───────────────────────────────────────────────────────

/** Picks the one actionable line from a prescription. */
export function pickInterventionAction(
  prescription: DebtSession["prescription"] | null,
): string | null {
  if (!prescription) return null;
  return (
    prescription.today ||
    prescription.thisMorning ||
    prescription.rightNow ||
    prescription.avoid ||
    null
  );
}

/**
 * The most recent session with an unanswered follow-through. Only sessions
 * from before today qualify — a session never asks about itself.
 */
export async function getPendingIntervention(
  userId: string,
): Promise<DebtSession | null> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const sessions = await db
    .select()
    .from(debtSessions)
    .where(
      and(
        eq(debtSessions.userId, userId),
        isNull(debtSessions.adherence),
        lt(debtSessions.createdAt, startOfToday),
      ),
    )
    .orderBy(desc(debtSessions.createdAt))
    .limit(5);

  return sessions.find((s) => pickInterventionAction(s.prescription)) ?? null;
}

/** Records whether the user followed a session's action. First answer wins. */
export async function setSessionAdherence(
  sessionId: number,
  userId: string,
  adherence: "did" | "skipped",
): Promise<boolean> {
  const rows = await db
    .update(debtSessions)
    .set({ adherence, adherenceRespondedAt: new Date() })
    .where(
      and(
        eq(debtSessions.id, BigInt(sessionId)),
        eq(debtSessions.userId, userId),
        isNull(debtSessions.adherence),
      ),
    )
    .returning({ id: debtSessions.id });
  return rows.length > 0;
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

// ─── Historical patterns for agent prompt enrichment ───────────────────────

export interface UserPatterns {
  totalSessions: number;
  avgScore: number;
  trendDirection: "improving" | "worsening" | "stable";
  trendDelta: number;          // avg of last 3 minus avg of previous 3
  bestSystem: string | null;   // system with lowest avg debt
  worstSystem: string | null;  // system with highest avg debt
  dayOfWeekPattern: string | null;  // e.g. "scores tend to be higher on Monday"
  lastSessionDate: string | null;
  streakDays: number;          // consecutive days with score <= 20
}

/**
 * Analyzes a user's debt session history to derive patterns that can
 * enrich the AI agent prompt. Returns null if there's not enough data.
 */
export async function getUserPatterns(userId: string): Promise<UserPatterns | null> {
  const sessions = await getDebtSessionsByUser(userId, 30);
  if (sessions.length < 2) return null;

  const scores = sessions.map(s => s.debtScore);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Trend: compare last 3 vs previous 3
  const recent = scores.slice(0, 3);
  const older = scores.slice(3, 6);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0
    ? older.reduce((a, b) => a + b, 0) / older.length
    : recentAvg;
  const trendDelta = Math.round(recentAvg - olderAvg);
  const trendDirection: UserPatterns["trendDirection"] =
    trendDelta < -3 ? "improving" : trendDelta > 3 ? "worsening" : "stable";

  // System-level analysis from stressorBreakdown
  const systemTotals = new Map<string, { sum: number; count: number }>();
  for (const s of sessions) {
    const breakdown = s.stressorBreakdown as Record<string, number> | null;
    if (breakdown) {
      for (const [system, debt] of Object.entries(breakdown)) {
        const entry = systemTotals.get(system);
        if (entry) {
          entry.sum += debt;
          entry.count++;
        } else {
          systemTotals.set(system, { sum: debt, count: 1 });
        }
      }
    }
  }
  let bestSystem: string | null = null;
  let worstSystem: string | null = null;
  let bestAvg = Infinity;
  let worstAvg = -Infinity;
  for (const [system, { sum, count }] of systemTotals) {
    const avg = sum / count;
    if (avg < bestAvg) { bestAvg = avg; bestSystem = system; }
    if (avg > worstAvg) { worstAvg = avg; worstSystem = system; }
  }

  // Day-of-week pattern
  const dayScores = new Map<number, { sum: number; count: number }>();
  for (const s of sessions) {
    const dow = new Date(s.createdAt).getDay();
    const entry = dayScores.get(dow);
    if (entry) { entry.sum += s.debtScore; entry.count++; }
    else dayScores.set(dow, { sum: s.debtScore, count: 1 });
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let worstDay: { name: string; avg: number } | null = null;
  for (const [dow, { sum, count }] of dayScores) {
    if (count < 2) continue;  // need at least 2 sessions on that day
    const avg = sum / count;
    if (!worstDay || avg > worstDay.avg) {
      worstDay = { name: dayNames[dow], avg: Math.round(avg) };
    }
  }
  const dayOfWeekPattern = worstDay
    ? `scores tend to be higher on ${worstDay.name} (avg ${worstDay.avg})`
    : null;

  // Streak: consecutive days with score <= 20, counting back from today
  const dailyBest = new Map<string, number>();
  for (const s of sessions) {
    const day = new Date(s.createdAt).toDateString();
    const prev = dailyBest.get(day);
    if (prev === undefined || s.debtScore < prev) dailyBest.set(day, s.debtScore);
  }
  let streakDays = 0;
  const cursor = new Date();
  while (dailyBest.get(cursor.toDateString()) !== undefined && dailyBest.get(cursor.toDateString())! <= 20) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalSessions: sessions.length,
    avgScore,
    trendDirection,
    trendDelta,
    bestSystem,
    worstSystem,
    dayOfWeekPattern,
    lastSessionDate: sessions[0]?.createdAt.toISOString() ?? null,
    streakDays,
  };
}

/**
 * Formats user patterns into a string suitable for inclusion in the
 * AI agent prompt. Returns null if patterns are not available.
 */
export function formatPatternsForPrompt(p: UserPatterns): string {
  const lines: string[] = [
    `Historical patterns (${p.totalSessions} sessions, avg score ${p.avgScore}):`,
    `  Trend: ${p.trendDirection} (${p.trendDelta > 0 ? "+" : ""}${p.trendDelta} vs previous)`,
  ];
  if (p.bestSystem) lines.push(`  Best system: ${p.bestSystem}`);
  if (p.worstSystem) lines.push(`  Worst system: ${p.worstSystem}`);
  if (p.dayOfWeekPattern) lines.push(`  Pattern: ${p.dayOfWeekPattern}`);
  if (p.streakDays > 0) lines.push(`  Current streak: ${p.streakDays} days with low debt`);
  return lines.join("\n");
}
