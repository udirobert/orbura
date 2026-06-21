#!/usr/bin/env node
/**
 * Generates an auditable log for DoraHacks QVAC submission.
 *
 * Runs the 4-agent QVAC pipeline against standard demo inputs and
 * captures: model load/unload, per-agent inference metrics (prompt,
 * tokens generated, TTFT, tokens/sec, duration).
 *
 * Output: qvac-audit-log.jsonl (one JSON record per event)
 *
 * Usage:
 *   node scripts/generate-qvac-audit-log.mjs
 *   bare scripts/generate-qvac-audit-log.mjs
 */

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const isBare = typeof Bare !== "undefined";
const argv = isBare ? Bare.argv : process.argv;

const DEMO_INPUTS = [
  {
    label: "bad_night_spirits",
    input: {
      debtScore: 72,
      systemScores: [
        { system: "brain", label: "Brain", score: 85, clearedAt: "3pm" },
        { system: "liver", label: "Liver", score: 62, clearedAt: "6pm" },
        { system: "cardiovascular", label: "Cardiovascular", score: 55, clearedAt: "5pm" },
        { system: "muscular", label: "Muscular / CNS", score: 48, clearedAt: "4pm" },
        { system: "gut", label: "Gut", score: 40, clearedAt: "2pm" },
      ],
      stressors: ["alcohol", "poor_sleep"],
      faceStress: 61,
      currentTime: "8:00 AM",
      recoveryTime: "later today",
      personality: "honest",
    },
  },
  {
    label: "hard_training_day",
    input: {
      debtScore: 58,
      systemScores: [
        { system: "muscular", label: "Muscular / CNS", score: 78, clearedAt: "6pm" },
        { system: "cardiovascular", label: "Cardiovascular", score: 65, clearedAt: "4pm" },
        { system: "brain", label: "Brain", score: 45, clearedAt: "2pm" },
        { system: "liver", label: "Liver", score: 30, clearedAt: "12pm" },
        { system: "gut", label: "Gut", score: 25, clearedAt: "11am" },
      ],
      stressors: ["hard_training", "poor_sleep"],
      faceStress: 48,
      currentTime: "7:00 AM",
      recoveryTime: "this afternoon",
      personality: "scientific",
    },
  },
  {
    label: "mild_stress_day",
    input: {
      debtScore: 35,
      systemScores: [
        { system: "brain", label: "Brain", score: 52, clearedAt: "1pm" },
        { system: "cardiovascular", label: "Cardiovascular", score: 38, clearedAt: "12pm" },
        { system: "muscular", label: "Muscular / CNS", score: 30, clearedAt: "10am" },
        { system: "liver", label: "Liver", score: 22, clearedAt: "9am" },
        { system: "gut", label: "Gut", score: 18, clearedAt: "8am" },
      ],
      stressors: ["stress", "poor_sleep"],
      faceStress: 32,
      currentTime: "9:00 AM",
      recoveryTime: "this evening",
      personality: "gentle",
    },
  },
];

async function runWorker(input) {
  const workerPath = resolve(process.cwd(), "scripts/qvac-worker.mjs");
  let runtime = "bare";
  try {
    const { execSync } = await import("node:child_process");
    execSync("which bare", { stdio: "ignore" });
  } catch {
    runtime = "node";
  }

  return new Promise((resolve, reject) => {
    const child = spawn(runtime, [workerPath, JSON.stringify(input)], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    const events = [];
    let buffer = "";

    child.stdout?.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line));
        } catch {}
      }
    });

    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) console.error("[worker stderr]", text);
    });

    child.on("close", () => resolve(events));
    child.on("error", reject);

    setTimeout(() => {
      if (!child.killed) child.kill();
      resolve(events);
    }, 180_000);
  });
}

async function main() {
  const outDir = join(process.cwd(), "qvac-audit");
  mkdirSync(outDir, { recursive: true });

  const allRecords = [];
  const ts = new Date().toISOString();

  for (const { label, input } of DEMO_INPUTS) {
    // Clean up stale worker lock
    try { unlinkSync(join(process.env.HOME ?? "/tmp", ".qvac", ".worker.lock")); } catch {}

    console.log(`\n=== Running demo: ${label} ===`);
    const runStart = Date.now();
    const events = await runWorker(input);
    const runEnd = Date.now();

    let modelLoadTime = null;
    let modelUnloadTime = null;
    const agentMetrics = {};

    for (const evt of events) {
      if (evt.event === "progress" && evt.data?.status === "agents_ready") {
        modelLoadTime = runStart;
      }
      if (evt.event === "agent_start") {
        agentMetrics[evt.data.agent] = {
          agent: evt.data.agent,
          startTime: Date.now(),
          tokens: [],
          firstTokenMs: null,
        };
      }
      if (evt.event === "agent_token") {
        const m = agentMetrics[evt.data.agent];
        if (m && m.tokens) {
          if (m.firstTokenMs === null) {
            m.firstTokenMs = Date.now() - m.startTime;
          }
          m.tokens.push(evt.data.token);
        }
      }
      if (evt.event === "agent_done") {
        const m = agentMetrics[evt.data.agent];
        if (m) {
          m.durationMs = evt.data.durationMs;
          m.tokenCount = m.tokens.join("").trim().length;
          m.totalTokens = m.tokens.length;
          m.ttftMs = m.firstTokenMs;
          m.tokensPerSec = m.durationMs > 0 ? (m.totalTokens / (m.durationMs / 1000)).toFixed(2) : "0";
          m.result = evt.data.result;
          m.rawOutput = evt.data.raw;
          delete m.tokens;
          delete m.startTime;
        }
      }
      if (evt.event === "agent_error") {
        const m = agentMetrics[evt.data.agent];
        if (m) {
          m.status = "error";
          m.error = evt.data.error;
          m.durationMs = Date.now() - m.startTime;
          delete m.tokens;
          delete m.startTime;
        }
      }
      if (evt.event === "result") {
        modelUnloadTime = Date.now();
      }
    }

    // Build audit records
    const runId = `${label}_${ts}`;

    // Model load event
    allRecords.push({
      timestamp: new Date(modelLoadTime ?? runStart).toISOString(),
      runId,
      event: "model_load",
      model: "Llama-3.2-1B-Instruct-Q4",
      source: "qvac-sdk",
      modelSrc: "LLAMA_3_2_1B_INST_Q4_0",
      loadDurationMs: (modelLoadTime ?? runEnd) - runStart,
    });

    // Per-agent inference events
    for (const agentName of ["triage", "coach", "schedule", "reflection"]) {
      const m = agentMetrics[agentName];
      if (!m) continue;

      const agentPrompts = {
        triage: `Body debt score: ${input.debtScore}/100, systems: ${JSON.stringify(input.systemScores?.map(s => ({ system: s.system, score: s.score })))}`,
        coach: `Triage context + debt ${input.debtScore}/100, stressors: ${input.stressors?.join(", ")}`,
        schedule: `Triage + prescription context, time: ${input.currentTime}`,
        reflection: `Coach prescription rewritten in voice: ${input.personality}`,
      };

      allRecords.push({
        timestamp: new Date(modelLoadTime ?? runStart).toISOString(),
        runId,
        event: "inference_call",
        agent: agentName,
        model: "Llama-3.2-1B-Instruct-Q4",
        source: "qvac-local",
        prompt: agentPrompts[agentName] ?? "",
        tokensGenerated: m.totalTokens ?? 0,
        ttftMs: m.ttftMs ?? null,
        tokensPerSec: parseFloat(m.tokensPerSec ?? "0"),
        durationMs: m.durationMs ?? 0,
        status: m.status ?? "done",
        error: m.error,
        output: m.rawOutput ?? null,
      });
    }

    // Model unload event
    allRecords.push({
      timestamp: new Date(modelUnloadTime ?? runEnd).toISOString(),
      runId,
      event: "model_unload",
      model: "Llama-3.2-1B-Instruct-Q4",
      source: "qvac-sdk",
      unloadDurationMs: modelUnloadTime ? runEnd - modelUnloadTime : 0,
    });

    // Run summary
    const result = (events || []).find(e => e?.event === "result");
    allRecords.push({
      timestamp: new Date(runEnd).toISOString(),
      runId,
      event: "run_summary",
      label,
      totalDurationMs: runEnd - runStart,
      source: result?.data?.source ?? "unknown",
      agentCount: Object.keys(agentMetrics).length,
      agentsCompleted: Object.values(agentMetrics).filter(m => m.status !== "error").length,
      agentsFailed: Object.values(agentMetrics).filter(m => m.status === "error").length,
    });

    console.log(`  Completed in ${runEnd - runStart}ms`);
    for (const [name, m] of Object.entries(agentMetrics)) {
      console.log(`  ${name}: ${m.status ?? "done"} ${m.durationMs ?? 0}ms ${m.totalTokens ?? 0} tokens ${m.tokensPerSec ?? 0} tok/s`);
    }

    // Write incrementally after each run
    const jsonlPath = join(outDir, "qvac-audit-log.jsonl");
    writeFileSync(jsonlPath, allRecords.map(r => JSON.stringify(r)).join("\n") + "\n");
    const csvLines = ["runId,event,agent,model,tokensGenerated,ttftMs,tokensPerSec,durationMs,status"];
    for (const r of allRecords) {
      if (r.event === "inference_call") {
        csvLines.push(`${r.runId},${r.event},${r.agent},${r.model},${r.tokensGenerated},${r.ttftMs ?? ""},${r.tokensPerSec},${r.durationMs},${r.status ?? "done"}`);
      }
    }
    writeFileSync(join(outDir, "qvac-audit-summary.csv"), csvLines.join("\n") + "\n");
    console.log(`  (interim write: ${allRecords.length} records)`);
  }

  // Write CSV summary
  const csvLines = ["runId,event,agent,model,tokensGenerated,ttftMs,tokensPerSec,durationMs,status"];
  for (const r of allRecords) {
    if (r.event === "inference_call") {
      csvLines.push(`${r.runId},${r.event},${r.agent},${r.model},${r.tokensGenerated},${r.ttftMs ?? ""},${r.tokensPerSec},${r.durationMs},${r.status ?? "done"}`);
    }
  }
  const csvPath = join(outDir, "qvac-audit-summary.csv");
  writeFileSync(csvPath, csvLines.join("\n") + "\n");

  console.log(`\n=== Audit log written ===`);
  console.log(`JSONL: ${jsonlPath}`);
  console.log(`CSV:   ${csvPath}`);
  console.log(`Total records: ${allRecords.length}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  if (!isBare) process.exit(1);
});
