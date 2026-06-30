import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createDebtSession } from "@/lib/db/queries";
import type { AnalyzeBodyRequest, DebtAnalysis } from "@/lib/types";
import { computeScore, deterministicPrescription, deterministicSchedule } from "../score/route";
import { ai } from "@/lib/sdk/eazo-client";
import { runMultiAgentPipeline, buildAgentTrace } from "@/lib/qvac";
import type { MultiAgentInput } from "@/lib/qvac";
import { validateSSEEvent } from "@/lib/sse-schemas";

export const maxDuration = 120;

/**
 * POST /api/analyze/stream
 *
 * Four-layer progressive analysis via Server-Sent Events:
 *
 *   event: score        → Layer 1: deterministic score (instant, <5ms)
 *   event: agent_start  → Agent begins (triage / coach / schedule)
 *   event: agent_token  → Token streamed from QVAC local LLM
 *   event: agent_done   → Agent completed with result + timing
 *   event: verdict      → Layer 2: AI verdict + recovery arc
 *   event: prescription → Layer 3: full prescription from QVAC multi-agent
 *   event: done         → Final merged result with full agent trace
 *   event: error        → Only if all layers fail
 *
 * AI inference runs on QVAC (Llama-3.2-1B, local) as the primary path.
 * Cloud AI (Eazo/deepseek) is fallback only when QVAC is unavailable.
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  const userId = authResult.ok ? authResult.user.id : null;

  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        const validated = validateSSEEvent(event, data);
        if (!validated.ok) {
          console.warn(
            `[SSE Schema] Delivering event "${event}" despite validation failure`
          );
        }
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(validated.data)}\n\n`
          )
        );
      }

      // ── Layer 1: Deterministic — always instant ──────────────────────────
      const layer1 = computeScore(body);
      emit("score", {
        debtScore:         layer1.debtScore,
        stressorBreakdown: layer1.stressorBreakdown,
        systemScores:      layer1.systemScores,
        confidenceLevel:   layer1.confidenceLevel,
        confidenceTier:    layer1.confidenceTier,
        recoveryArc:       layer1.recoveryArc,
        verdict:           layer1.verdict,
        recoveryTime:      layer1.recoveryTime,
        prescription:      layer1.prescription,
        _layer: "deterministic",
      });

      // ── Layer 2: AI verdict (runs in parallel with agents) ──────────────
      // Also serves as the cloud AI benchmark for the Edge vs Cloud comparison
      const cloudStartTime = Date.now();
      const verdictPromise = fetchVerdict(body, layer1).then((result) => {
        const cloudDurationMs = Date.now() - cloudStartTime;
        return { ...result, _cloudDurationMs: cloudDurationMs };
      }).catch(() => ({
        verdict:     layer1.verdict,
        recoveryTime: layer1.recoveryTime,
        recoveryArc: layer1.recoveryArc,
        _layer: "fallback",
        _cloudDurationMs: Date.now() - cloudStartTime,
      }));

      // ── Layer 3: QVAC multi-agent pipeline (primary AI path) ─────────────
      const qvacInput: MultiAgentInput = {
        debtScore:    layer1.debtScore,
        systemScores: layer1.systemScores ?? [],
        stressors:    body.stressors.map(s => s.type),
        faceStress:   body.faceAnalysis?.debtContribution ?? null,
        currentTime:  body.currentTime,
        recoveryTime: layer1.recoveryTime,
        personality:  body.personality,
        mode:         body.mode ?? "personal",
      };

      let prescriptionData: { prescription: DebtAnalysis["prescription"]; _layer: string; _agentTrace?: unknown; _schedule?: unknown };
      let schedule: DebtAnalysis["schedule"];
      let agentTrace: DebtAnalysis["agentTrace"];

      try {
        const qvacResult = await runMultiAgentPipeline(
          qvacInput,
          // Progress (model download, etc.)
          (progress) => {
            emit("agent_progress", progress);
          },
          // Agent lifecycle events for real-time UI
          (event) => {
            if (event.type === "agent_start") {
              emit("agent_start", { agent: event.agent, description: event.description });
            } else if (event.type === "agent_token") {
              emit("agent_token", { agent: event.agent, token: event.token });
            } else if (event.type === "agent_done") {
              emit("agent_done", { agent: event.agent, result: event.result, durationMs: event.durationMs });
            } else if (event.type === "agent_error") {
              emit("agent_error", { agent: event.agent, error: event.error });
            }
          },
        );

        if (qvacResult && qvacResult.prescription) {
          prescriptionData = {
            prescription: qvacResult.prescription,
            _layer: "qvac_multi_agent",
          };
          schedule = qvacResult.schedule ?? undefined;
          agentTrace = buildAgentTrace(qvacResult);
        } else {
          // QVAC unavailable — fall back to cloud AI
          prescriptionData = await fetchPrescriptionFromCloud(body, layer1);
          // Generate deterministic schedule fallback so the UI always has output
          schedule = deterministicSchedule(layer1.systemScores ?? [], layer1.debtScore, body.locale ?? "en", body.mode ?? "personal");
        }
      } catch {
        prescriptionData = await fetchPrescriptionFromCloud(body, layer1);
        // Generate deterministic schedule fallback
        schedule = deterministicSchedule(layer1.systemScores ?? [], layer1.debtScore, body.locale ?? "en");
      }

      // Emit prescription as soon as it's ready
      emit("prescription", {
        ...prescriptionData,
        schedule,
        agentTrace,
      });

      // ── Emit verdict (may have arrived earlier in parallel) ──────────────
      const verdictData = await verdictPromise;
      emit("verdict", verdictData);

      // Attach cloud timing to agent trace for Edge vs Cloud comparison
      const cloudDurationMs = verdictData._cloudDurationMs;
      if (agentTrace && typeof cloudDurationMs === "number") {
        agentTrace = { ...agentTrace, cloudDurationMs };
      }

      // Re-emit prescription with updated agent trace (now includes cloud timing)
      if (agentTrace?.cloudDurationMs != null) {
        emit("prescription", {
          ...prescriptionData,
          schedule,
          agentTrace,
        });
      }

      // ── Final merged result ───────────────────────────────────────────────
      const final: DebtAnalysis = {
        debtScore:         layer1.debtScore,
        stressorBreakdown: layer1.stressorBreakdown,
        systemScores:      layer1.systemScores,
        confidenceLevel:   layer1.confidenceLevel,
        confidenceTier:    layer1.confidenceTier,
        verdict:           verdictData.verdict     ?? layer1.verdict,
        recoveryTime:      verdictData.recoveryTime ?? layer1.recoveryTime,
        recoveryArc:       verdictData.recoveryArc  ?? layer1.recoveryArc,
        prescription:      prescriptionData.prescription ?? layer1.prescription,
        agentTrace,
        schedule,
      };

      // Persist to DB if authenticated (non-blocking)
      if (userId) {
        createDebtSession({
          userId,
          stressors:        body.stressors,
          faceAnalysis:     body.faceAnalysis ?? undefined,
          hrvData:          body.hrvData      ?? undefined,
          debtScore:        final.debtScore,
          verdict:          final.verdict,
          recoveryTime:     final.recoveryTime,
          prescription:     final.prescription,
          stressorBreakdown: final.stressorBreakdown,
        }).then((session) => {
          final.sessionId = Number(session.id);
        }).catch(() => {});
      }

      emit("done", final);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
      "X-AI-Source":   "qvac-local",
      "X-Offline-Capable": "true",
    },
  });
}

// ─── Layer 2: verdict + recovery arc ─────────────────────────────────────────

async function fetchVerdict(body: AnalyzeBodyRequest, layer1: ReturnType<typeof computeScore>) {
  const { stressors, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const prompt = `Body debt score: ${layer1.debtScore}/100
Stressors: ${stressors.map(s => `${s.type}${s.context ? ` (${s.context})` : ""}`).join(", ")}
Current time: ${now}
HRV: ${hrvData ? `${hrvData.hrvDeltaPercent}% from baseline` : "not available"}

Respond with JSON only:
{
  "verdict": <string, 6-12 words, blunt honest one-liner about their body state>,
  "recoveryTime": <string, specific clock time like "6pm tonight">,
  "recoveryArc": {
    "dangerEnds": <ISO 8601>,
    "partialEnds": <ISO 8601>,
    "clearedAt": <ISO 8601>
  }
}`;

  for (const model of ["anthropic.claude-3-5-haiku", "deepseek.v3.1"] as const) {
    try {
      // Race against a 5s timeout — offline/network issues should fail fast
      // so the deterministic fallback kicks in without making the user wait
      const res = await Promise.race([
        ai.chat({
          model,
          messages: [
            { role: "system", content: "Body recovery intelligence. Respond with JSON only. No caveats." },
            { role: "user",   content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 250,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("verdict_timeout")), 5000)
        ),
      ]);
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      if (typeof parsed.verdict !== "string") throw new Error("bad shape");
      return {
        verdict:     parsed.verdict,
        recoveryTime: parsed.recoveryTime ?? layer1.recoveryTime,
        recoveryArc: parsed.recoveryArc  ?? layer1.recoveryArc,
        _layer: "ai_verdict",
        _model: model,
      };
    } catch { continue; }
  }
  throw new Error("All verdict models failed");
}

// ─── Cloud fallback for prescription ─────────────────────────────────────────

async function fetchPrescriptionFromCloud(
  body: AnalyzeBodyRequest,
  layer1: ReturnType<typeof computeScore>
): Promise<{ prescription: DebtAnalysis["prescription"]; _layer: string }> {
  const { stressors, faceAnalysis, hrvData, currentTime } = body;
  const now = currentTime ?? new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const prompt = `Debt score: ${layer1.debtScore}/100. Time: ${now}.
Stressors: ${stressors.map(s => `${s.type}${s.context ? ` (${s.context})` : ""}`).join(", ")}
${faceAnalysis ? `Face: ${faceAnalysis.inflammation} inflammation, ${faceAnalysis.eyeClarity} clarity` : ""}
${hrvData ? `HRV: ${hrvData.hrvDeltaPercent}% from baseline` : ""}

Respond with JSON only:
{
  "prescription": {
    "rightNow":    <10-20 words, specific immediate action with quantity/substance>,
    "thisMorning": <10-20 words, specific action for next 2-3 hours>,
    "today":       <10-20 words, honest capacity assessment + one key action>,
    "avoid":       <10-20 words, one specific thing to avoid + biological reason>
  }
}

Rules: specific quantities, times, substances. No generic advice. No caveats.`;

  for (const model of ["deepseek.v3.1", "anthropic.claude-3-5-haiku"] as const) {
    try {
      const res = await Promise.race([
        ai.chat({
          model,
          messages: [
            { role: "system", content: "Body recovery intelligence. JSON only. Specific. Direct. No caveats." },
            { role: "user",   content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 500,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("prescription_timeout")), 8000)
        ),
      ]);
      const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
      const p = parsed.prescription ?? parsed;
      if (!p.rightNow || !p.thisMorning || !p.today || !p.avoid) throw new Error("incomplete");
      return { prescription: p, _layer: "cloud_fallback" };
    } catch { continue; }
  }

  return {
    prescription: deterministicPrescription(stressors.map(s => s.type), layer1.debtScore, body.locale ?? "en", body.mode ?? "personal"),
    _layer: "deterministic_fallback",
  };
}

function errorResponse(msg: string) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
        c.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
  );
}
