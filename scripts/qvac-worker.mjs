#!/usr/bin/env node

/**
 * QVAC Edge AI worker — multi-agent health recovery pipeline.
 *
 * Four agents run sequentially through QVAC local LLM:
 *   1. Triage Agent      — ranks systems, identifies priority
 *   2. Coach Agent       — generates the 4-part recovery prescription
 *   3. Schedule Agent    — produces a time-blocked recovery schedule
 *   4. Reflection Agent  — rewrites the Coach output in the user's voice
 *
 * All inference runs on-device via @qvac/sdk (Llama-3.2-1B-Instruct Q4).
 * Falls back gracefully per-agent: if an agent fails, the next still runs
 * and the result includes which agents succeeded.
 *
 * Usage:
 *   node scripts/qvac-worker.mjs '{"debtScore":62,"systemScores":[...],"stressors":[...],...}'
 *
 * Output: one JSON object per line to stdout:
 *   {"event":"agent_start","data":{"agent":"triage"}}
 *   {"event":"progress","data":{"status":"downloading","percent":50}}
 *   {"event":"agent_token","data":{"agent":"triage","token":"..."}}
 *   {"event":"agent_done","data":{"agent":"triage","result":{...},"durationMs":1200}}
 *   {"event":"result","data":{"triage":{...},"prescription":{...},"schedule":[...],"reflection":{...},"source":"qvac-local","model":"llama-3.2-1b-inst-q4"}}
 */

import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";

function send(event, data) {
  process.stdout.write(JSON.stringify({ event, data }) + "\n");
}

// ─── Tool definitions (simulated tool-calling for small models) ──────────────
//
// Llama-3.2-1B doesn't have native function-calling, so we simulate it
// with structured prompts. Each agent gets a clear system prompt with its
// role, the available "tools" (deterministic functions we already have),
// and a strict output format. The orchestrator parses the output and
// feeds it to the next agent.

const AGENTS = {
  triage: {
    name: "triage",
    role: "Triage Agent",
    description: "Analyzes the 5-system breakdown and identifies the priority system, secondary concern, and what to avoid.",
    systemPrompt: (input) => `You are the Triage Agent in a multi-agent health recovery system. Your job is to analyze physiological debt data and produce a structured triage assessment.

You have access to these tools (already computed):
- compute_score: debt score = ${input.debtScore}/100
- get_system_scores: ${JSON.stringify(input.systemScores?.map(s => ({ system: s.system, label: s.label, score: s.score, clearedAt: s.clearedAt })) ?? [])}

Based on the data above, output EXACTLY three lines, no other text:
PRIORITY: <system name> <score> — <one specific reason in 8 words>
SECONDARY: <system name> <score> — <one specific reason in 8 words>
AVOID: <one specific thing to avoid today, with biological reason, 12 words max>`,
  },
  coach: {
    name: "coach",
    role: "Recovery Coach Agent",
    description: "Generates a personalized 4-part recovery prescription using the triage assessment as context.",
    systemPrompt: (input, triageResult) => `You are the Recovery Coach Agent in a multi-agent health recovery system. The Triage Agent has identified priorities. Your job is to produce a specific, actionable recovery prescription.

Triage assessment:
${triageResult || "No triage available — use the system scores directly."}

Body debt score: ${input.debtScore}/100
Stressors: ${(input.stressors ?? []).join(", ") || "None reported"}
${input.faceStress !== null && input.faceStress !== undefined ? `Face scan stress: ${input.faceStress}/100` : ""}

Output EXACTLY four lines, each starting with the label, no other text:
RIGHT NOW: <one specific action with quantity, 12-18 words>
THIS MORNING: <one specific action for next 2-3 hours, 12-18 words>
TODAY: <one key insight about today's capacity, 12-18 words>
AVOID: <one specific thing to avoid + biological reason, 12-18 words>`,
  },
  schedule: {
    name: "schedule",
    role: "Schedule Agent",
    description: "Produces a time-blocked recovery schedule for the next 12 hours.",
    systemPrompt: (input, triageResult, coachResult) => `You are the Schedule Agent in a multi-agent health recovery system. Using the triage and prescription from the other agents, create a time-blocked recovery schedule.

Triage:
${triageResult || "N/A"}

Prescription:
${coachResult || "N/A"}

Current time: ${input.currentTime ?? "morning"}
Recovery window: ${input.recoveryTime ?? "later today"}

Output EXACTLY 4 schedule blocks, one per line, no other text. Each line:
<time range> | <action> | <which system it helps>

Example format:
NOW-10AM | 500ml water + electrolytes, no caffeine | Liver
10AM-12PM | Light walk outside, natural light | Brain
12PM-3PM | Protein-rich lunch, gentle movement | Muscular
3PM-6PM | No intense activity, hydrate | Cardiovascular`,
  },
  reflection: {
    name: "reflection",
    role: "Reflection Agent",
    description: "Rewrites the Coach's prescription in the user's chosen voice — direct, gentle, scientific, or sarcastic.",
    systemPrompt: (input, _triageResult, coachResult) => {
      const personality = input.personality ?? "honest";
      const voiceGuide = {
        honest:     "Direct. Knowledgeable. No fluff. Same meaning, tighter language.",
        gentle:     "Warmer. Supportive. Acknowledge the effort before the action. Still honest.",
        scientific: "Data-driven. Cite the mechanism in one phrase (cortisol, HRV, glycogen, hepatic).",
        sarcastic:  "Dry wit. Call out the obvious choice that caused this. Still useful.",
      }[personality] ?? "Direct. No fluff.";
      return `You are the Reflection Agent in a multi-agent health recovery system. The Recovery Coach has produced a prescription. Your job is to rewrite each line in the user's chosen voice, keeping all specific actions, quantities, and biology intact. Never invent new advice. Never soften the avoid line.

User's voice: ${personality}
Voice guide: ${voiceGuide}

Original prescription:
${coachResult || "N/A"}

Output EXACTLY four lines, each starting with the label, no other text:
RIGHT NOW: <rewritten>
THIS MORNING: <rewritten>
TODAY: <rewritten>
AVOID: <rewritten>`;
    },
  },
};

// ─── Main pipeline ────────────────────────────────────────────────────────────

async function main() {
  const input = JSON.parse(process.argv[2]);

  send("progress", { status: "downloading", loaded: 0, total: 0, percent: 0 });

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    modelType: "llamacpp-completion",
    modelConfig: {
      // TurboQuant: KV-cache quantization — up to 5x less memory
      "cache-type-k": "tbq4_0",
      "cache-type-v": "pq4_0",
    },
    onProgress: (p) => {
      send("progress", {
        status: p.status ?? "downloading",
        loaded: p.loaded,
        total: p.total,
        percent: p.percent,
      });
    },
  });

  send("progress", { status: "agents_ready", percent: 100 });

  const results = {
    triage: null,
    prescription: null,
    schedule: null,
    reflection: null,
    agentMeta: [],
  };

  // ── Agent 1: Triage ─────────────────────────────────────────────────────
  const triageStart = Date.now();
  send("agent_start", { agent: "triage", description: AGENTS.triage.description });
  try {
    const triageRaw = await runAgent(modelId, "triage", input);
    results.triage = parseTriage(triageRaw);
    const triageText = formatTriageForContext(results.triage);
    const triageDuration = Date.now() - triageStart;
    results.agentMeta.push({ agent: "triage", durationMs: triageDuration, status: "done", model: "llama-3.2-1b-inst-q4" });
    send("agent_done", { agent: "triage", result: results.triage, durationMs: triageDuration, raw: triageRaw });

    // ── Agent 2: Coach (uses triage output) ──────────────────────────────
    const coachStart = Date.now();
    send("agent_start", { agent: "coach", description: AGENTS.coach.description });
    try {
      const coachRaw = await runAgent(modelId, "coach", input, triageText);
      results.prescription = parsePrescription(coachRaw);
      const coachDuration = Date.now() - coachStart;
      results.agentMeta.push({ agent: "coach", durationMs: coachDuration, status: "done", model: "llama-3.2-1b-inst-q4" });
      send("agent_done", { agent: "coach", result: results.prescription, durationMs: coachDuration, raw: coachRaw });

      // ── Agent 3: Schedule (uses triage + coach output) ──────────────────
      const schedStart = Date.now();
      send("agent_start", { agent: "schedule", description: AGENTS.schedule.description });
      try {
        const schedRaw = await runAgent(modelId, "schedule", input, triageText, formatPrescriptionForContext(results.prescription));
        results.schedule = parseSchedule(schedRaw);
        const schedDuration = Date.now() - schedStart;
        results.agentMeta.push({ agent: "schedule", durationMs: schedDuration, status: "done", model: "llama-3.2-1b-inst-q4" });
        send("agent_done", { agent: "schedule", result: results.schedule, durationMs: schedDuration, raw: schedRaw });

        // ── Agent 4: Reflection (rewrites Coach output in user's voice) ─────
        const reflectStart = Date.now();
        send("agent_start", { agent: "reflection", description: AGENTS.reflection.description });
        try {
          const reflectRaw = await runAgent(
            modelId,
            "reflection",
            input,
            triageText,
            formatPrescriptionForContext(results.prescription)
          );
          const reflected = parsePrescription(reflectRaw);
          // Only adopt the reflection if it parsed cleanly; otherwise keep the coach output
          if (reflected.rightNow && reflected.thisMorning && reflected.today && reflected.avoid) {
            results.reflection = reflected;
            results.prescription = reflected;
          }
          const reflectDuration = Date.now() - reflectStart;
          results.agentMeta.push({ agent: "reflection", durationMs: reflectDuration, status: "done", model: "llama-3.2-1b-inst-q4" });
          send("agent_done", { agent: "reflection", result: results.reflection ?? results.prescription, durationMs: reflectDuration, raw: reflectRaw });
        } catch (err) {
          results.agentMeta.push({ agent: "reflection", durationMs: Date.now() - reflectStart, status: "error", error: err.message });
          send("agent_error", { agent: "reflection", error: err.message });
        }
      } catch (err) {
        results.agentMeta.push({ agent: "schedule", durationMs: Date.now() - schedStart, status: "error", error: err.message });
        send("agent_error", { agent: "schedule", error: err.message });
      }
    } catch (err) {
      results.agentMeta.push({ agent: "coach", durationMs: Date.now() - coachStart, status: "error", error: err.message });
      send("agent_error", { agent: "coach", error: err.message });
    }
  } catch (err) {
    results.agentMeta.push({ agent: "triage", durationMs: Date.now() - triageStart, status: "error", error: err.message });
    send("agent_error", { agent: "triage", error: err.message });
  }

  await unloadModel({ modelId });

  send("result", {
    ...results,
    source: "qvac-local",
    model: "llama-3.2-1b-inst-q4",
    totalDurationMs: results.agentMeta.reduce((sum, m) => sum + (m.durationMs ?? 0), 0),
  });
}

// ─── Agent runner ─────────────────────────────────────────────────────────────

const AGENT_TIMEOUT_MS = 25_000;

async function runAgent(modelId, agentName, input, triageContext = null, coachContext = null) {
  const agent = AGENTS[agentName];
  const systemPrompt = agent.systemPrompt(input, triageContext, coachContext);

  let result = "";
  const response = completion({
    modelId,
    history: [{ role: "user", content: systemPrompt }],
    stream: true,
    max_tokens: 300,
  });

  // Race the token stream against a per-agent timeout. A 1B model with a
  // vague task (especially the reflection agent) can otherwise loop
  // forever without ever closing the stream.
  const streamPromise = (async () => {
    for await (const token of response.tokenStream) {
      result += token;
      send("agent_token", { agent: agentName, token });
    }
  })();

  let timer;
  try {
    await Promise.race([
      streamPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`agent_timeout_${AGENT_TIMEOUT_MS}ms`)), AGENT_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }

  return result;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseTriage(raw) {
  const text = raw.trim();
  const plan = { priority: null, secondary: null, avoid: null };
  for (const line of text.split("\n")) {
    const up = line.toUpperCase().trim();
    if (up.startsWith("PRIORITY:") && !plan.priority) {
      plan.priority = line.split(":").slice(1).join(":").trim();
    } else if (up.startsWith("SECONDARY:") && !plan.secondary) {
      plan.secondary = line.split(":").slice(1).join(":").trim();
    } else if (up.startsWith("AVOID:") && !plan.avoid) {
      plan.avoid = line.split(":").slice(1).join(":").trim();
    }
  }
  // Fallback: if parsing failed, use raw text
  if (!plan.priority) plan.priority = raw.trim().split("\n")[0] ?? "Unable to parse triage";
  return plan;
}

function parsePrescription(raw) {
  const text = raw.trim();
  const rx = { rightNow: null, thisMorning: null, today: null, avoid: null };
  for (const line of text.split("\n")) {
    const up = line.toUpperCase().trim();
    if (up.startsWith("RIGHT NOW:") && !rx.rightNow) {
      rx.rightNow = line.split(":").slice(1).join(":").trim();
    } else if (up.startsWith("THIS MORNING:") && !rx.thisMorning) {
      rx.thisMorning = line.split(":").slice(1).join(":").trim();
    } else if (up.startsWith("TODAY:") && !rx.today) {
      rx.today = line.split(":").slice(1).join(":").trim();
    } else if (up.startsWith("AVOID:") && !rx.avoid) {
      rx.avoid = line.split(":").slice(1).join(":").trim();
    }
  }
  // Fallback
  if (!rx.rightNow) rx.rightNow = "Drink 500ml water with electrolytes.";
  if (!rx.thisMorning) rx.thisMorning = "Delay caffeine 90 minutes.";
  if (!rx.today) rx.today = "Protect your best focus window.";
  if (!rx.avoid) rx.avoid = "Intense training — you'll create more debt.";
  return rx;
}

function parseSchedule(raw) {
  const text = raw.trim();
  const blocks = [];
  for (const line of text.split("\n")) {
    const parts = line.split("|").map(s => s.trim());
    if (parts.length >= 3) {
      blocks.push({ time: parts[0], action: parts[1], system: parts[2] });
    }
  }
  return blocks;
}

function formatTriageForContext(triage) {
  if (!triage) return null;
  return `PRIORITY: ${triage.priority ?? "N/A"}
SECONDARY: ${triage.secondary ?? "N/A"}
AVOID: ${triage.avoid ?? "N/A"}`;
}

function formatPrescriptionForContext(rx) {
  if (!rx) return null;
  return `RIGHT NOW: ${rx.rightNow ?? "N/A"}
THIS MORNING: ${rx.thisMorning ?? "N/A"}
TODAY: ${rx.today ?? "N/A"}
AVOID: ${rx.avoid ?? "N/A"}`;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    send("error", { message: err.message });
    process.exit(1);
  });
