"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { bandMeta } from "@/lib/debt-band";

// ─── Signals being "processed" — animate through these ───────────────────────
const SIGNALS = [
  { id: "stressors", label: "Stressor intake",     icon: "📋", doneAt: 0.12 },
  { id: "context",   label: "Context depth",        icon: "🔍", doneAt: 0.25 },
  { id: "memory",    label: "Recalling your history", icon: "🧠", doneAt: 0.35 },
  { id: "face",      label: "Face biomarkers",       icon: "👁", doneAt: 0.45 },
  { id: "hrv",       label: "Autonomic signals",     icon: "❤️", doneAt: 0.62 },
  { id: "timeline",  label: "Recovery arc",          icon: "📈", doneAt: 0.78 },
  { id: "rx",        label: "Generating prescription",icon: "💊", doneAt: 0.92 },
];

export interface AgentEventState {
  agent: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
  durationMs?: number;
  tokens?: string;
}

const AGENT_ICONS: Record<string, string> = {
  triage: "🔬",
  coach: "💊",
  schedule: "📅",
  reflection: "🎭",
};

const AGENT_LABELS: Record<string, string> = {
  triage: "Triage Agent",
  coach: "Recovery Coach",
  schedule: "Schedule Agent",
  reflection: "Reflection Agent",
};

interface AnalysisLoaderProps {
  hasFaceScan: boolean;
  hasHRV: boolean;
  /** Optional HRV context for personalised loading messages. */
  hrvContext?: { deltaPercent: number; source: string };
  /** Optional face-scan context for personalised loading messages. */
  faceContext?: { summary: string };
  agentEvents?: AgentEventState[];
  agentProgress?: { status: string; percent?: number; loaded?: number; total?: number } | null;
}

export function AnalysisLoader({ hasFaceScan, hasHRV, hrvContext, faceContext, agentEvents, agentProgress }: AnalysisLoaderProps) {
  const [elapsed, setElapsed] = useState(0);       // 0–1 simulated progress
  const [orbScore, setOrbScore] = useState(0);     // orb heats up as signals process

  // Simulate progress over ~5 seconds for the initial signal-processing phase.
  // Once live agents are running, progress is driven by agent completion.
  useEffect(() => {
    const DURATION = 5000;
    const start = Date.now();
    const iv = setInterval(() => {
      const raw = (Date.now() - start) / DURATION;
      const eased = Math.min(0.97, raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2);
      setElapsed(eased);
      setOrbScore(Math.round(eased * 75));
      if (raw >= 1) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, []);

  // Personalised signal label when HRV or face context is available
  const personalizedSignals = SIGNALS.map((s) => {
    if (s.id === "hrv" && hrvContext) {
      const prefix = hrvContext.deltaPercent > 0
        ? `HRV +${hrvContext.deltaPercent}%`
        : `HRV ${hrvContext.deltaPercent}%`;
      return { ...s, label: `${prefix} (${hrvContext.source.replace("_", " ")})` };
    }
    if (s.id === "face" && faceContext) {
      return { ...s, label: `Face: ${faceContext.summary.slice(0, 32)}…` };
    }
    return s;
  });

  const activeSignals = personalizedSignals.filter((s) => {
    if (s.id === "face" && !hasFaceScan && !faceContext) return false;
    if (s.id === "hrv"  && !hasHRV && !hrvContext)     return false;
    return true;
  });

  // If we have live agent events, show them instead of the simulated signals
  const hasLiveAgents = agentEvents && agentEvents.length > 0;
  const isLoadingModel = agentProgress && !hasLiveAgents;

  // Drive progress from real agent state when agents are live.
  // Each completed agent = 25%. Active agent adds partial credit.
  const agentPct = hasLiveAgents && agentEvents
    ? Math.round(
        agentEvents.reduce((sum, a) => {
          if (a.status === "done") return sum + 1;
          if (a.status === "active") return sum + 0.3;
          return sum;
        }, 0) / agentEvents.length * 100
      )
    : null;

  const orbColor = bandMeta(orbScore).color;
  const showPercent = hasLiveAgents;
  const percentLabel = agentPct ?? 0;

  return (
    <div className="relative flex flex-col items-center min-h-svh px-5 pt-8 pb-6 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* Ambient glow that intensifies with progress */}
      <motion.div className="absolute pointer-events-none"
        animate={{ opacity: 0.08 + elapsed * 0.2 }}
        style={{
          top: "15%", left: "50%", transform: "translateX(-50%)",
          width: "400px", height: "400px", borderRadius: "50%",
          background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Orb — heats up as signals are processed */}
      <div className="relative z-10 flex flex-col items-center gap-4 flex-1 justify-center">
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 104, height: 104, position: "relative" }}
        >
          {/* Outer breathing ring */}
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: `1.5px solid ${orbColor}40` }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          {/* Secondary ring */}
          <motion.div className="absolute rounded-full"
            style={{ inset: "-8px", border: `1px solid ${orbColor}20` }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
          {/* Orb body */}
          <motion.div className="absolute inset-2 rounded-full"
            animate={{
              background: [
                `radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 60%, #1a0800 100%)`,
                `radial-gradient(circle at 40% 35%, ${orbColor}, #DC2626 60%, #0A0A0B 100%)`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: `0 0 40px 8px ${orbColor}30` }}
          />
          {/* Shimmer */}
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ inset: "22%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), transparent 60%)", mixBlendMode: "screen" }}
            animate={{ opacity: [0.4, 0.9, 0.4], rotate: [0, 360] }}
            transition={{ opacity: { duration: 3, repeat: Infinity }, rotate: { duration: 10, repeat: Infinity, ease: "linear" } }} />
        </motion.div>

        {/* Progress — pulsing indicator until agents start, then real percentage */}
        <div className="text-center" aria-live="polite" aria-atomic="true">
          {showPercent ? (
            <motion.div
              className="font-normal leading-none"
              style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", color: orbColor, letterSpacing: "-0.03em" }}
              key={percentLabel}
              initial={{ opacity: 0.5, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {percentLabel}%
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center justify-center gap-1.5"
              style={{ height: "3rem" }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: orbColor }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          )}
          <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: "var(--color-text-faint)" }}>
            {hasLiveAgents ? "edge AI agents working" : isLoadingModel ? "loading AI model" : "processing signals"}
          </p>
        </div>

        {/* Edge AI badge — only when live agents are running */}
        {hasLiveAgents && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--color-states-success)" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
              QVAC · Qwen3-1.7B · on-device
            </span>
          </motion.div>
        )}

        {/* Memory badge — shown during the recall phase */}
        {!hasLiveAgents && elapsed >= 0.25 && elapsed < 0.45 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "#a855f7" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#a855f7" }}>
              Recalling from Supermemory
            </span>
          </motion.div>
        )}

        {/* Model download progress bar */}
        {agentProgress && agentProgress.status === "downloading" && (
          <div className="w-full max-w-sm rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--color-brand-primary)" }}>
                Loading Qwen3-1.7B
              </span>
              <span className="text-[9px] font-mono" style={{ color: "var(--color-text-secondary)" }}>
                {agentProgress.percent != null ? `${agentProgress.percent}%` : "..."}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: "var(--color-brand-primary)" }}
                animate={{ width: `${agentProgress.percent ?? 50}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {agentProgress.loaded != null && agentProgress.total != null && (
              <p className="text-[8px] font-mono mt-1" style={{ color: "var(--color-text-faint)" }}>
                {Math.round(agentProgress.loaded / 1024 / 1024)}MB / {Math.round(agentProgress.total / 1024 / 1024)}MB
              </p>
            )}
          </div>
        )}

        {/* Live agent activity — replaces simulated signals when agents are running */}
        {hasLiveAgents ? (
          <div className="w-full space-y-1.5 mt-1">
            {agentEvents!.map((agent, i) => {
              const isActive = agent.status === "active";
              const isDone = agent.status === "done";
              return (
                <motion.div key={`${agent.agent}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl px-3 py-2"
                  style={{
                    backgroundColor: isDone ? "rgba(74,222,128,0.06)" : "rgba(234,88,12,0.06)",
                    border: `1px solid ${isDone ? "rgba(74,222,128,0.2)" : "rgba(234,88,12,0.2)"}`,
                  }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm flex-shrink-0">{AGENT_ICONS[agent.agent] ?? "🤖"}</span>
                    <span className="text-xs font-medium flex-1" style={{
                      color: isDone ? "var(--color-states-success)" : "var(--color-text-primary)",
                    }}>
                      {AGENT_LABELS[agent.agent] ?? agent.agent}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-mono" style={{ color: "var(--color-states-success)" }}>
                        ✓ {((agent.durationMs ?? 0) / 1000).toFixed(1)}s
                      </span>
                    ) : (
                      <motion.div className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-brand-primary)" }}
                        animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    )}
                  </div>
                  {/* Live token stream — expanded scrollable area for the active agent */}
                  {isActive && agent.tokens && (
                    <div
                      className="mt-1.5 rounded-lg p-2 text-[11px] leading-relaxed overflow-y-auto"
                      style={{
                        color: "var(--color-text-secondary)",
                        backgroundColor: "rgba(0,0,0,0.25)",
                        maxHeight: 80,
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {agent.tokens}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Simulated signal checklist — trimmed spacing */
          <div className="w-full space-y-1.5 mt-1">
            {activeSignals.map((sig) => {
              const done    = elapsed >= sig.doneAt;
              const active  = !done && elapsed >= sig.doneAt - 0.15;
              return (
                <motion.div key={sig.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: done ? 1 : active ? 0.85 : 0.3, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{
                    backgroundColor: done ? "rgba(74,222,128,0.06)" : active ? "rgba(234,88,12,0.06)" : "var(--color-bg-surface)",
                    border: `1px solid ${done ? "rgba(74,222,128,0.2)" : active ? "rgba(234,88,12,0.2)" : "rgba(168,162,158,0.08)"}`,
                    transition: "background-color 0.4s, border-color 0.4s",
                  }}>
                  <span className="text-sm flex-shrink-0">{sig.icon}</span>
                  <span className="text-xs font-medium flex-1" style={{ color: done ? "var(--color-states-success)" : active ? "var(--color-text-primary)" : "var(--color-text-faint)" }}>
                    {sig.label}
                  </span>
                  {done ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                      className="text-[10px] font-mono font-bold" style={{ color: "var(--color-states-success)" }}>✓</motion.span>
                  ) : active ? (
                    <motion.div className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-brand-primary)" }}
                      animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
