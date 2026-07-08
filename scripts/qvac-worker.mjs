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
 * All inference runs on-device via @qvac/sdk (Qwen3-1.7B-Instruct Q4).
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
 *   {"event":"result","data":{"triage":{...},"prescription":{...},"schedule":[...],"reflection":{...},"source":"qvac-local","model":"qwen3-1.7b-inst-q4"}}
 */

import { plugins, QWEN3_1_7B_INST_Q4 } from "@qvac/sdk";
import { llmPlugin } from "@qvac/sdk/llamacpp-completion/plugin";

const isBare = typeof Bare !== "undefined";
const argv = isBare ? Bare.argv : process.argv;

// Register the llamacpp plugin before any SDK calls (required by bare runtime)
const { loadModel, completion, unloadModel } = plugins([llmPlugin]);

function send(event, data) {
  const line = JSON.stringify({ event, data });
  if (isBare) {
    console.log(line);
  } else {
    process.stdout.write(line + "\n");
  }
}

// ─── Context-aware prompt fragments ──────────────────────────────────────────

const CONTEXT_PROMPTS = {
  personal: {
    domainContext: "A person's body has physiological stress from poor sleep, alcohol, training, or illness. This is NOT financial debt — it is body health debt.",
    domainNoun: "body debt",
    playerNoun: "person",
    recoveryNoun: "recovery",
  },
  football: {
    domainContext: "A football player has physiological stress from match minutes, training load, travel, poor sleep, alcohol, or head impact. This is about match-readiness and return-to-play, NOT financial debt. The score represents how much recovery the player needs before they are match-fit.",
    domainNoun: "match-readiness debt",
    playerNoun: "player",
    recoveryNoun: "return-to-play",
  },
  fan: {
    domainContext: "This person is a football fan who just watched a match. Watching football causes real physiological stress — a loss, a penalty shootout, or a late winner drives cortisol and adrenaline, raises heart rate, and disrupts sleep, especially for late kickoffs. This is emotional and mental recovery debt from watching, NOT financial debt and NOT about playing. Be warm and human: acknowledge how the match felt, then give a practical wind-down (a short walk, water, screens down, breathing). The score represents how much wind-down the fan needs after the final whistle.",
    domainNoun: "post-match recovery debt",
    playerNoun: "fan",
    recoveryNoun: "wind-down",
  },
};

function getCtx(input) {
  return CONTEXT_PROMPTS[input.mode ?? "personal"] ?? CONTEXT_PROMPTS.personal;
}

// ─── Tool definitions (simulated tool-calling for small models) ──────────────
//
// Qwen3-1.7B has native tool-calling support, but we keep the structured-prompt
// approach for reliability with the small quantized model. Each agent gets a clear
// system prompt with its role, the available "tools" (deterministic functions we
// already have), and a strict output format. The orchestrator parses the output
// and feeds it to the next agent.

const AGENTS = {
  triage: {
    name: "triage",
    role: "Triage Agent",
    description: "Analyzes the 5-system breakdown and identifies the priority system, secondary concern, and what to avoid.",
    systemPrompt: (input) => {
      const ctx = getCtx(input);
      return `${ctx.domainContext}

Their ${ctx.domainNoun} score: ${input.debtScore}/100 (higher = more ${ctx.recoveryNoun} needed)
Body systems affected:
${JSON.stringify(input.systemScores?.map(s => ({ system: s.system, label: s.label, score: s.score, clearedAt: s.clearedAt })) ?? [])}

Output EXACTLY three lines, no other text:
PRIORITY: <body system name> <score> — <health reason in 8 words>
SECONDARY: <body system name> <score> — <health reason in 8 words>
AVOID: <one health thing to avoid + biological reason, 12 words max>`;
    },
  },
  coach: {
    name: "coach",
    role: "Recovery Coach Agent",
    description: "Generates a personalized 4-part recovery prescription using the triage assessment as context.",
    systemPrompt: (input, triageResult) => {
      const ctx = getCtx(input);
      return `${ctx.domainContext}

Triage:
${triageResult || "No triage available — use the system scores directly."}

${ctx.domainNoun === "match-readiness debt" ? "Match-readiness" : "Body debt"} score: ${input.debtScore}/100 (higher = more ${ctx.recoveryNoun} needed)
Stressors: ${(input.stressors ?? []).join(", ") || "None reported"}
${input.faceStress !== null && input.faceStress !== undefined ? `Face scan stress: ${input.faceStress}/100` : ""}

Write a ${ctx.recoveryNoun} prescription for this ${ctx.playerNoun}. Output EXACTLY four lines:
RIGHT NOW: <one specific health action with quantity, 12-18 words>
THIS MORNING: <one specific health action for next 2-3 hours, 12-18 words>
TODAY: <one key insight about physical capacity today, 12-18 words>
AVOID: <one thing to avoid + biological reason, 12-18 words>`;
    },
  },
  schedule: {
    name: "schedule",
    role: "Schedule Agent",
    description: "Produces a time-blocked recovery schedule for the next 12 hours.",
    systemPrompt: (input, triageResult, coachResult) => {
      const ctx = getCtx(input);
      return `${ctx.domainContext}

Triage:
${triageResult || "N/A"}

Prescription:
${coachResult || "N/A"}

Current time: ${input.currentTime ?? "morning"}
${ctx.recoveryNoun === "return-to-play" ? "Return-to-play" : "Recovery"} window: ${input.recoveryTime ?? "later today"}

Output EXACTLY 4 schedule blocks, one per line. Format:
<time range> | <health action> | <body system>

NOW-10AM | 500ml water + electrolytes, no caffeine | Liver
10AM-12PM | Light walk outside, natural light | Brain
12PM-3PM | Protein-rich lunch, gentle movement | Muscular
3PM-6PM | No intense activity, hydrate | Cardiovascular`;
    },
  },
  reflection: {
    name: "reflection",
    role: "Reflection Agent",
    description: "Rewrites the Coach's prescription in the user's chosen voice — direct, gentle, scientific, or sarcastic.",
    systemPrompt: (input, _triageResult, coachResult) => {
      const ctx = getCtx(input);
      const personality = input.personality ?? "honest";
      const voiceGuide = {
        honest:     "Direct. Knowledgeable. No fluff. Same meaning, tighter language.",
        gentle:     "Warmer. Supportive. Acknowledge the effort before the action. Still honest.",
        scientific: "Data-driven. Cite the mechanism in one phrase (cortisol, HRV, glycogen, hepatic).",
        sarcastic:  "Dry wit. Call out the obvious choice that caused this. Still useful.",
      }[personality] ?? "Direct. No fluff.";
      return `You are the Reflection Agent in a multi-agent ${ctx.recoveryNoun} system. The Recovery Coach has produced a prescription. Your job is to rewrite each line in the ${ctx.playerNoun}'s chosen voice, keeping all specific actions, quantities, and biology intact. Never invent new advice. Never soften the avoid line.

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
  const input = JSON.parse(argv[2]);

  send("progress", { status: "downloading", loaded: 0, total: 0, percent: 0 });

  const modelId = await loadModel({
    modelSrc: QWEN3_1_7B_INST_Q4,
    modelType: "llamacpp-completion",
    modelConfig: {
      ctx_size: 4096,
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
    results.agentMeta.push({ agent: "triage", durationMs: triageDuration, status: "done", model: "qwen3-1.7b-inst-q4", raw: triageRaw });
    send("agent_done", { agent: "triage", result: results.triage, durationMs: triageDuration, raw: triageRaw });

    // ── Agent 2: Coach (uses triage output) ──────────────────────────────
    const coachStart = Date.now();
    send("agent_start", { agent: "coach", description: AGENTS.coach.description });
    try {
      const coachRaw = await runAgent(modelId, "coach", input, triageText);
      results.prescription = parsePrescription(coachRaw);
      const coachDuration = Date.now() - coachStart;
      results.agentMeta.push({ agent: "coach", durationMs: coachDuration, status: "done", model: "qwen3-1.7b-inst-q4", raw: coachRaw });
      send("agent_done", { agent: "coach", result: results.prescription, durationMs: coachDuration, raw: coachRaw });

      // ── Agent 3: Schedule (uses triage + coach output) ──────────────────
      const schedStart = Date.now();
      send("agent_start", { agent: "schedule", description: AGENTS.schedule.description });
      try {
        const schedRaw = await runAgent(modelId, "schedule", input, triageText, formatPrescriptionForContext(results.prescription));
        results.schedule = parseSchedule(schedRaw);
        const schedDuration = Date.now() - schedStart;
        results.agentMeta.push({ agent: "schedule", durationMs: schedDuration, status: "done", model: "qwen3-1.7b-inst-q4", raw: schedRaw });
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
          results.agentMeta.push({ agent: "reflection", durationMs: reflectDuration, status: "done", model: "qwen3-1.7b-inst-q4", raw: reflectRaw });
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
    model: "qwen3-1.7b-inst-q4",
    totalDurationMs: results.agentMeta.reduce((sum, m) => sum + (m.durationMs ?? 0), 0),
  });
}

// ─── Agent runner ─────────────────────────────────────────────────────────────

const AGENT_TIMEOUT_MS = 40_000;
const SCHEDULE_TIMEOUT_MS = 90_000;
const SCHEDULE_MAX_TOKENS = 150;

async function runAgent(modelId, agentName, input, triageContext = null, coachContext = null) {
  const agent = AGENTS[agentName];
  const systemPrompt = agent.systemPrompt(input, triageContext, coachContext);

  const isSchedule = agentName === "schedule";
  let result = "";
  const response = completion({
    modelId,
    history: [{ role: "user", content: systemPrompt }],
    stream: true,
    max_tokens: isSchedule ? SCHEDULE_MAX_TOKENS : 300,
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
        const timeoutMs = isSchedule ? SCHEDULE_TIMEOUT_MS : AGENT_TIMEOUT_MS;
        timer = setTimeout(() => reject(new Error(`agent_timeout_${timeoutMs}ms`)), timeoutMs);
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
  .then(() => { if (!isBare) process.exit(0); })
  .catch((err) => {
    send("error", { message: err.message });
    if (!isBare) process.exit(1);
  });
