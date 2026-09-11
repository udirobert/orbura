import {
  bigserial,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Debt session records — one row per scan/assessment
 */
export const debtSessions = pgTable("debt_sessions", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),

  // Input signals
  stressors: json("stressors").$type<
    Array<{
      type: string; // "alcohol" | "sleep" | "training" | "stress" | "ill" | "care"
      context?: string; // e.g. "3-4 drinks", "5hrs", "Destroyed me"
    }>
  >(),
  faceAnalysis: json("face_analysis").$type<{
    periorbitalPuffiness: "none" | "mild" | "moderate" | "severe" | "unmeasured";
    skinPerfusion: "good" | "low" | "very_low";
    eyeClarity: "clear" | "fatigued" | "very_fatigued";
    inflammation: "none" | "mild" | "moderate" | "severe" | "unmeasured";
    debtContribution: number; // 0-30 points from face
  }>(),
  hrvData: json("hrv_data").$type<{
    hrvDeltaPercent: number; // % below baseline
    restingHrDelta: number; // bpm above baseline
    baselineHrv?: number;
    baselineHr?: number;
    baselineMaturity?: "forming" | "established" | "stable";
    recordedAt?: string;
    sleepStages?: {
      deep: number;
      rem: number;
      light: number;
    };
  }>(),

  // AI-computed outputs
  debtScore: integer("debt_score").notNull(), // 0-100
  verdict: text("verdict").notNull(), // one-line body state
  recoveryTime: text("recovery_time"), // e.g. "6pm tonight"
  prescription: json("prescription").$type<{
    rightNow: string;
    thisMorning: string;
    today: string;
    avoid: string;
  }>(),
  stressorBreakdown: json("stressor_breakdown").$type<
    Array<{
      stressor: string;
      points: number;
      insight: string;
    }>
  >(),

  // Intervention loop — whether the user followed yesterday's action.
  // NULL until they answer the follow-through prompt on a later visit.
  adherence: varchar("adherence", { length: 16 }), // "did" | "skipped"
  adherenceRespondedAt: timestamp("adherence_responded_at"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DebtSession = typeof debtSessions.$inferSelect;
export type NewDebtSession = typeof debtSessions.$inferInsert;
