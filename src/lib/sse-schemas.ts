/**
 * sse-schemas.ts
 *
 * Zod schemas for every Server-Sent Event emitted by /api/analyze/stream.
 *
 * These schemas serve dual purpose:
 *   1. Runtime validation — catch shape drift between layers before it reaches the UI.
 *   2. Documentation — a single source of truth for every event payload.
 *
 * Validation never blocks the stream. On mismatch the event is still delivered
 * but a console warning is emitted so mismatches surface during development.
 *
 * Event catalog (10 events):
 *
 *   score        → Layer 1: deterministic debt score + seed prescription
 *   agent_start  → A QVAC agent has begun work (triage / coach / schedule / reflection)
 *   agent_token  → Token streamed from the QVAC local LLM
 *   agent_done   → Agent completed with a result
 *   agent_error  → Agent failed
 *   agent_progress → QVAC model download / loading progress
 *   verdict      → Layer 2: AI verdict + recovery arc
 *   prescription → Layer 3: full prescription from QVAC multi-agent pipeline
 *   done         → Final merged DebtAnalysis
 *   error        → Stream-level error (all layers failed)
 */

import { z } from "zod";

// ─── Reusable sub-schemas ────────────────────────────────────────────────────

export const StressorTypeSchema = z.enum([
  "alcohol",
  "sleep",
  "training",
  "stress",
  "ill",
  "care",
  "match_minutes",
  "card_stress",
  "travel_timezone",
  "concussion_check",
]);

export const RecoveryModeSchema = z.enum(["personal", "football"]);

export const RecoverySystemSchema = z.enum([
  "cardiovascular",
  "brain",
  "liver",
  "muscular",
  "gut",
]);

export const ConfidenceTierSchema = z.enum([
  "estimated",
  "partial",
  "good",
  "accurate",
  "precise",
]);

export const StressorBreakdownItemSchema = z.object({
  stressor: z.string(),
  points: z.number(),
  insight: z.string(),
  icon: z.string(),
});

export const SystemScoreSchema = z.object({
  system: RecoverySystemSchema,
  label: z.string(),
  icon: z.string(),
  score: z.number(),
  clearedAt: z.string(),
  causeText: z.string(),
  actionText: z.string(),
  hasData: z.boolean().default(true),
  scienceFact: z.string().optional(),
  scienceCite: z.string().optional(),
});

export const PrescriptionSchema = z.object({
  rightNow: z.string(),
  thisMorning: z.string(),
  today: z.string(),
  avoid: z.string(),
});

export const RecoveryArcSchema = z.object({
  dangerEnds: z.string(),
  partialEnds: z.string(),
  clearedAt: z.string(),
});

export const CounterfactualSchema = z.object({
  systemLabel: z.string(),
  fromScore: z.number(),
  toScore: z.number(),
  leverLabel: z.string(),
});

export const ScheduleBlockSchema = z.object({
  time: z.string(),
  action: z.string(),
  system: z.string(),
});

export const AgentStepSchema = z.object({
  agent: z.enum(["triage", "coach", "schedule", "reflection"]),
  label: z.string(),
  description: z.string(),
  status: z.enum(["pending", "active", "done", "error"]),
  durationMs: z.number().optional(),
  source: z.enum(["qvac-local", "eazo-cloud", "deterministic"]),
  model: z.string().optional(),
  raw: z.string().optional(),
});

export const TriageResultSchema = z.object({
  priority: z.string(),
  secondary: z.string(),
  avoid: z.string(),
});

export const AgentTraceSchema = z.object({
  steps: z.array(AgentStepSchema),
  triage: TriageResultSchema.optional(),
  source: z.enum(["qvac-local", "eazo-cloud", "deterministic"]),
  totalDurationMs: z.number().optional(),
  cloudDurationMs: z.number().optional(),
  model: z.string().optional(),
});

// ─── Full DebtAnalysis schema (for the "done" event) ─────────────────────────

export const DebtAnalysisSchema = z.object({
  debtScore: z.number(),
  verdict: z.string(),
  recoveryTime: z.string(),
  prescription: PrescriptionSchema,
  stressorBreakdown: z.array(StressorBreakdownItemSchema),
  systemScores: z.array(SystemScoreSchema).optional(),
  confidenceTier: ConfidenceTierSchema.optional(),
  recoveryArc: RecoveryArcSchema,
  confidenceLevel: z.enum(["high", "medium", "low"]),
  sessionId: z.number().optional(),
  agentTrace: AgentTraceSchema.optional(),
  schedule: z.array(ScheduleBlockSchema).optional(),
  counterfactual: CounterfactualSchema.optional(),
});

// ─── SSE event schemas ───────────────────────────────────────────────────────

/**
 * event: score
 * Layer 1 — deterministic debt score. Always arrives first, within <5ms.
 */
export const ScoreEventSchema = z.object({
  debtScore: z.number(),
  stressorBreakdown: z.array(StressorBreakdownItemSchema),
  systemScores: z.array(SystemScoreSchema).optional(),
  confidenceLevel: z.enum(["high", "medium", "low"]),
  confidenceTier: ConfidenceTierSchema.optional(),
  recoveryArc: RecoveryArcSchema,
  verdict: z.string(),
  recoveryTime: z.string(),
  prescription: PrescriptionSchema,
  _layer: z.literal("deterministic"),
});

/**
 * event: agent_start
 * A QVAC agent has begun its work cycle.
 */
export const AgentStartEventSchema = z.object({
  agent: z.string(),
  description: z.string(),
});

/**
 * event: agent_token
 * A single token emitted by the QVAC local LLM.
 */
export const AgentTokenEventSchema = z.object({
  agent: z.string(),
  token: z.string(),
});

/**
 * event: agent_done
 * Agent completed its work with a result payload.
 */
export const AgentDoneEventSchema = z.object({
  agent: z.string(),
  result: z.any(),
  durationMs: z.number(),
});

/**
 * event: agent_error
 * Agent encountered a terminal error.
 */
export const AgentErrorEventSchema = z.object({
  agent: z.string(),
  error: z.string(),
});

/**
 * event: agent_progress
 * QVAC model download or loading progress update.
 */
export const AgentProgressEventSchema = z.object({
  status: z.string(),
  percent: z.number().optional(),
  loaded: z.number().optional(),
  total: z.number().optional(),
});

/**
 * event: verdict
 * Layer 2 — AI verdict + recovery arc (may arrive in parallel with agents).
 */
export const VerdictEventSchema = z.object({
  verdict: z.string(),
  recoveryTime: z.string(),
  recoveryArc: RecoveryArcSchema,
  _layer: z.string(),
  _model: z.string().optional(),
  _cloudDurationMs: z.number().optional(),
});

/**
 * event: prescription
 * Layer 3 — full prescription from QVAC multi-agent pipeline (or fallback).
 */
export const PrescriptionEventSchema = z.object({
  prescription: PrescriptionSchema,
  _layer: z.string(),
  schedule: z.array(ScheduleBlockSchema).optional(),
  agentTrace: AgentTraceSchema.optional(),
});

/**
 * event: done
 * Final merged DebtAnalysis. Canonical state to display.
 */
export const DoneEventSchema = DebtAnalysisSchema;

/**
 * event: error
 * Stream-level error. All recovery layers have failed.
 */
export const ErrorEventSchema = z.object({
  error: z.string(),
});

// ─── Event name → schema map ────────────────────────────────────────────────

export const sseEventSchemas: Record<string, z.ZodTypeAny> = {
  score: ScoreEventSchema,
  agent_start: AgentStartEventSchema,
  agent_token: AgentTokenEventSchema,
  agent_done: AgentDoneEventSchema,
  agent_error: AgentErrorEventSchema,
  agent_progress: AgentProgressEventSchema,
  verdict: VerdictEventSchema,
  prescription: PrescriptionEventSchema,
  done: DoneEventSchema,
  error: ErrorEventSchema,
};

// ─── Validator ───────────────────────────────────────────────────────────────

export interface SSEValidationResult {
  ok: boolean;
  data: unknown;
  error?: string;
}

/**
 * Validate SSE event data against its schema.
 *
 * The validated (stripped) data is returned on success. On failure the
 * original data is passed through with a warning — validation never blocks
 * the stream or crashes the response.
 */
export function validateSSEEvent(
  event: string,
  data: unknown,
): SSEValidationResult {
  const schema = sseEventSchemas[event];
  if (!schema) {
    // Unknown event type — pass through without validation
    return { ok: true, data };
  }

  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const error = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");

  console.warn(`[SSE Schema] Event "${event}" validation failed: ${error}`);
  return { ok: false, data, error };
}
