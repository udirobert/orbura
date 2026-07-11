import path from "node:path";
import type {
  AgentTrace,
  AgentStep,
  TriageResult,
  Prescription,
  ScheduleBlock,
  SystemScore,
  RecoveryMode,
} from "@/lib/types";

// ─── Input types ─────────────────────────────────────────────────────────────

export interface MultiAgentInput {
  debtScore: number;
  systemScores: SystemScore[];
  stressors: string[];
  faceStress?: number | null;
  currentTime?: string;
  recoveryTime?: string;
  personality?: "honest" | "gentle" | "scientific" | "sarcastic";
  mode?: RecoveryMode;
  /** User history from Supermemory — injected into agent prompts */
  memoryContext?: string | null;
}

export interface MultiAgentResult {
  triage: TriageResult | null;
  prescription: Prescription | null;
  schedule: ScheduleBlock[] | null;
  reflection: Prescription | null;
  agentMeta: Array<{
    agent: string;
    durationMs: number;
    status: string;
    model?: string;
    error?: string;
    raw?: string;
  }>;
  source: "qvac-local" | "eazo-cloud" | "deterministic";
  model?: string;
  totalDurationMs?: number;
}

export interface ProgressEvent {
  status: string;
  loaded?: number;
  total?: number;
  percent?: number;
}

export type AgentEvent =
  | { type: "agent_start"; agent: string; description: string }
  | { type: "agent_token"; agent: string; token: string }
  | { type: "agent_done"; agent: string; result: unknown; durationMs: number }
  | { type: "agent_error"; agent: string; error: string }
  | { type: "progress"; data: ProgressEvent }
  | { type: "result"; data: MultiAgentResult };

// ─── QVAC multi-agent runner ─────────────────────────────────────────────────

const AGENT_LABELS: Record<string, string> = {
  triage: "Triage Agent",
  coach: "Recovery Coach Agent",
  schedule: "Schedule Agent",
  reflection: "Reflection Agent",
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  triage: "Analyzes system scores to identify priority, secondary concern, and what to avoid.",
  coach: "Generates a personalized 4-part recovery prescription from triage context.",
  schedule: "Produces a time-blocked recovery schedule for the next 12 hours.",
  reflection: "Rewrites the Coach's prescription in the user's chosen voice — direct, gentle, scientific, or sarcastic.",
};

/**
 * Runs the 3-agent QVAC pipeline by spawning a standalone worker process.
 * Streams agent events via onEvent callback for real-time UI updates.
 * Falls back to cloud AI if the worker is unavailable or all agents fail.
 */
export async function runMultiAgentPipeline(
  input: MultiAgentInput,
  onProgress?: (progress: ProgressEvent) => void,
  onAgentEvent?: (event: AgentEvent) => void,
): Promise<MultiAgentResult | null> {
  const workerPath = path.resolve(process.cwd(), "scripts/qvac-worker.mjs");
  const cpModule = "node:child_process";
  const cp = await import(/* webpackIgnore: true */ cpModule);

  const workerArg = JSON.stringify(input);
  const isBareAvailable = await import("node:child_process").then(cp => {
    try {
      cp.execSync("which bare", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }).catch(() => false);

  let child;
  try {
    const runtime = isBareAvailable ? "bare" : process.execPath;
    child = cp.spawn(runtime, [workerPath, workerArg], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        DYLD_FALLBACK_LIBRARY_PATH: [
          process.env.DYLD_FALLBACK_LIBRARY_PATH,
          "/opt/homebrew/opt/openssl@3/lib",
          "/usr/local/opt/openssl@3/lib",
          "/opt/homebrew/lib",
          "/usr/local/lib",
          "/usr/lib",
        ]
          .filter(Boolean)
          .join(":"),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("QVAC worker failed to start:", message);
    return null;
  }

  return new Promise<MultiAgentResult | null>((resolve) => {
    let result: MultiAgentResult | null = null;
    let buffer = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.event === "progress") {
            onProgress?.(msg.data as ProgressEvent);
            onAgentEvent?.({ type: "progress", data: msg.data });
          } else if (msg.event === "agent_start") {
            onAgentEvent?.({ type: "agent_start", agent: msg.data.agent, description: msg.data.description });
          } else if (msg.event === "agent_token") {
            onAgentEvent?.({ type: "agent_token", agent: msg.data.agent, token: msg.data.token });
          } else if (msg.event === "agent_done") {
            onAgentEvent?.({ type: "agent_done", agent: msg.data.agent, result: msg.data.result, durationMs: msg.data.durationMs });
          } else if (msg.event === "agent_error") {
            onAgentEvent?.({ type: "agent_error", agent: msg.data.agent, error: msg.data.error });
          } else if (msg.event === "result") {
            result = msg.data as MultiAgentResult;
          }
        } catch {
          // skip malformed lines
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.warn("[QVAC worker stderr]", text);
    });

    child.on("close", () => {
      resolve(result);
    });

    child.on("error", (err: Error) => {
      console.warn("QVAC worker failed to start:", err.message);
      resolve(null);
    });

    setTimeout(() => {
      if (!child.killed) {
        child.kill();
      }
      resolve(result);
    }, 120_000);
  });
}

// ─── Build agent trace for UI ────────────────────────────────────────────────

export function buildAgentTrace(result: MultiAgentResult): AgentTrace {
  const steps: AgentStep[] = result.agentMeta.map((m) => ({
    agent: m.agent as AgentStep["agent"],
    label: AGENT_LABELS[m.agent] ?? m.agent,
    description: AGENT_DESCRIPTIONS[m.agent] ?? "",
    status: m.status as AgentStep["status"],
    durationMs: m.durationMs,
    source: result.source === "qvac-local" ? "qvac-local" : "eazo-cloud",
    model: m.model ?? result.model,
    raw: m.raw,
  }));

  return {
    steps,
    triage: result.triage ?? undefined,
    source: result.source,
    totalDurationMs: result.totalDurationMs,
    model: result.model,
    memoryContext: input.memoryContext ?? null,
  };
}

// ─── Legacy single-agent health coach (kept for /api/qvac/infer compat) ──────

export interface HealthCoachInput {
  stressScore: number;
  isHealthy: boolean;
  features: {
    eyeFatigue: boolean;
    browTension: boolean;
    mouthTension: boolean;
  };
  stressors: string[];
}

export function buildPrompt(input: HealthCoachInput): string {
  return `You are a health recovery coach. A user completed a ZK-verified facial stress scan.

Verified data:
- Stress score: ${input.stressScore}/100
- ZK result: ${input.isHealthy ? "Within healthy range" : "Elevated stress"}
- Eye fatigue: ${input.features.eyeFatigue ? "Yes" : "No"}
- Brow tension: ${input.features.browTension ? "Yes" : "No"}
- Reported stressors: ${input.stressors.join(", ") || "None"}

Give 3 specific, actionable recovery tips in 2-3 sentences total. Direct, no caveats.`;
}

export function buildFallbackPrompt(input: HealthCoachInput): string {
  return buildPrompt(input);
}

/**
 * Legacy: Runs QVAC Edge AI inference by spawning a standalone worker process.
 * @deprecated Use runMultiAgentPipeline for the full 3-agent flow.
 */
export async function runHealthCoach(
  input: HealthCoachInput,
  onProgress?: (progress: ProgressEvent) => void
): Promise<string | null> {
  // For legacy compat, we run the multi-agent pipeline and return the
  // prescription text as a single string.
  const multiInput: MultiAgentInput = {
    debtScore: input.stressScore,
    systemScores: [],
    stressors: input.stressors,
    faceStress: input.stressScore,
  };

  const result = await runMultiAgentPipeline(multiInput, onProgress);
  if (!result?.prescription) return null;

  const p = result.prescription;
  return `RIGHT NOW: ${p.rightNow}\nTHIS MORNING: ${p.thisMorning}\nTODAY: ${p.today}\nAVOID: ${p.avoid}`;
}
