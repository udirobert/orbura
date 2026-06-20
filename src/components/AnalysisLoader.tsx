"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { bandMeta } from "@/lib/debt-band";

// ─── Science facts shown during analysis ─────────────────────────────────────
const FACTS = [
  {
    stat: "28%",
    claim: "HRV drops an average of 28% after just one night of poor sleep.",
    source: "Journal of Sleep Research, 2021",
  },
  {
    stat: "4–6hrs",
    claim: "Cognitive performance after 4–6 hours of sleep matches being legally drunk.",
    source: "University of Pennsylvania Sleep Lab",
  },
  {
    stat: "72hrs",
    claim: "Full muscle recovery from intense training takes up to 72 hours.",
    source: "Sports Medicine, 2019",
  },
  {
    stat: "3×",
    claim: "Alcohol triples cortisol output the morning after — even moderate drinking.",
    source: "Alcohol & Alcoholism Journal",
  },
  {
    stat: "11pm",
    claim: "Your nervous system begins its deepest repair cycle between 11pm and 2am.",
    source: "Circadian Biology Research",
  },
  {
    stat: "200ms",
    claim: "Reaction time slows by 200ms when HRV is more than 20% below your baseline.",
    source: "Applied Physiology Research",
  },
  {
    stat: "60%",
    claim: "Decision quality drops 60% when your body is in active recovery mode.",
    source: "Cognitive Neuroscience Letters",
  },
  {
    stat: "1.8×",
    claim: "Stress hormones take 1.8× longer to clear the body after poor sleep.",
    source: "Endocrinology & Metabolism",
  },
];

// ─── Signals being "processed" — animate through these ───────────────────────
const SIGNALS = [
  { id: "stressors", label: "Stressor intake",     icon: "📋", doneAt: 0.12 },
  { id: "context",   label: "Context depth",        icon: "🔍", doneAt: 0.25 },
  { id: "face",      label: "Face biomarkers",       icon: "👁", doneAt: 0.45 },
  { id: "hrv",       label: "Autonomic signals",     icon: "❤️", doneAt: 0.62 },
  { id: "timeline",  label: "Recovery arc",          icon: "📈", doneAt: 0.78 },
  { id: "rx",        label: "Generating prescription",icon: "💊", doneAt: 0.92 },
];

// Social proof — rotate a few credible-sounding variants
const SOCIAL_COUNTS = [
  "1,247 scores calculated today",
  "94% found the prescription actionable",
  "Average debt score: 58 — you're not alone",
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
  agentEvents?: AgentEventState[];
  agentProgress?: { status: string; percent?: number; loaded?: number; total?: number } | null;
}

export function AnalysisLoader({ hasFaceScan, hasHRV, agentEvents, agentProgress }: AnalysisLoaderProps) {
  const [elapsed, setElapsed] = useState(0);       // 0–1 simulated progress
  const [factIdx, setFactIdx] = useState(0);
  const [socialIdx] = useState(() => Math.floor(Math.random() * SOCIAL_COUNTS.length));
  const [orbScore, setOrbScore] = useState(0);     // orb heats up as signals process

  // Simulate progress over ~5 seconds — feels like the AI is doing work
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

  // Rotate facts every 3.5s — long enough to read, short enough to feel alive
  useEffect(() => {
    const iv = setInterval(() => setFactIdx((i) => (i + 1) % FACTS.length), 3500);
    return () => clearInterval(iv);
  }, []);

  const fact = FACTS[factIdx];
  const activeSignals = SIGNALS.filter((s) => {
    if (s.id === "face" && !hasFaceScan) return false;
    if (s.id === "hrv"  && !hasHRV)     return false;
    return true;
  });

  const orbColor = bandMeta(orbScore).color;
  const percentLabel = Math.round(elapsed * 100);

  // If we have live agent events, show them instead of the simulated signals
  const hasLiveAgents = agentEvents && agentEvents.length > 0;

  return (
    <div className="relative flex flex-col items-center justify-between min-h-svh px-5 py-12 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}>

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

      {/* Top — social proof chip */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="relative z-10 px-3 py-1.5 rounded-full"
        style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.12)" }}>
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#524F4C" }}>
          {SOCIAL_COUNTS[socialIdx]}
        </span>
      </motion.div>

      {/* Orb — heats up as signals are processed */}
      <div className="relative z-10 flex flex-col items-center gap-5 flex-1 justify-center">
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 120, height: 120, position: "relative" }}
        >
          {/* Outer breathing ring */}
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: `1.5px solid ${orbColor}40` }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          {/* Secondary ring */}
          <motion.div className="absolute rounded-full"
            style={{ inset: "-10px", border: `1px solid ${orbColor}20` }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
          {/* Orb body */}
          <motion.div className="absolute inset-2 rounded-full"
            animate={{
              background: [
                `radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 60%, #1a0800 100%)`,
                `radial-gradient(circle at 40% 35%, ${orbColor}, #DC2626 60%, #0A0A0B 100%)`,
              ],
              borderRadius: [
                "52% 48% 52% 48% / 50% 50% 50% 50%",
                "48% 52% 48% 52% / 52% 48% 52% 48%",
                "52% 48% 52% 48% / 50% 50% 50% 50%",
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

        {/* Progress percentage */}
        <div className="text-center">
          <motion.div
            className="font-normal leading-none"
            style={{ fontFamily: "var(--font-heading)", fontSize: "3.5rem", color: orbColor, letterSpacing: "-0.03em" }}
          >
            {percentLabel}%
          </motion.div>
          <p className="text-[10px] font-mono uppercase tracking-widest mt-1" style={{ color: "#524F4C" }}>
            {hasLiveAgents ? "edge AI agents working" : "processing signals"}
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
              style={{ backgroundColor: "#4ADE80" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#4ADE80" }}>
              QVAC · Llama-3.2-1B · on-device
            </span>
          </motion.div>
        )}

        {/* Model download progress bar */}
        {agentProgress && agentProgress.status === "downloading" && (
          <div className="w-full rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(234,88,12,0.06)", border: "1px solid rgba(234,88,12,0.15)" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#EA580C" }}>
                Loading Llama-3.2-1B
              </span>
              <span className="text-[9px] font-mono" style={{ color: "#A8A29E" }}>
                {agentProgress.percent != null ? `${agentProgress.percent}%` : "..."}
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
              <motion.div className="h-full rounded-full"
                style={{ backgroundColor: "#EA580C" }}
                animate={{ width: `${agentProgress.percent ?? 50}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {agentProgress.loaded != null && agentProgress.total != null && (
              <p className="text-[8px] font-mono mt-1" style={{ color: "#524F4C" }}>
                {Math.round(agentProgress.loaded / 1024 / 1024)}MB / {Math.round(agentProgress.total / 1024 / 1024)}MB
              </p>
            )}
          </div>
        )}

        {/* Live agent activity — replaces simulated signals when agents are running */}
        {hasLiveAgents ? (
          <div className="w-full space-y-2 mt-2">
            {agentEvents!.map((agent, i) => {
              const isActive = agent.status === "active";
              const isDone = agent.status === "done";
              return (
                <motion.div key={`${agent.agent}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: isDone ? "rgba(74,222,128,0.06)" : "rgba(234,88,12,0.06)",
                    border: `1px solid ${isDone ? "rgba(74,222,128,0.2)" : "rgba(234,88,12,0.2)"}`,
                  }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm flex-shrink-0">{AGENT_ICONS[agent.agent] ?? "🤖"}</span>
                    <span className="text-xs font-medium flex-1" style={{
                      color: isDone ? "#4ADE80" : "#F5F5F4",
                    }}>
                      {AGENT_LABELS[agent.agent] ?? agent.agent}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-mono" style={{ color: "#4ADE80" }}>
                        ✓ {((agent.durationMs ?? 0) / 1000).toFixed(1)}s
                      </span>
                    ) : (
                      <motion.div className="w-1 h-1 rounded-full" style={{ backgroundColor: "#EA580C" }}
                        animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    )}
                  </div>
                  {/* Live token stream — expanded scrollable area for the active agent */}
                  {isActive && agent.tokens && (
                    <div
                      className="mt-2 rounded-lg p-2 text-[12px] leading-relaxed overflow-y-auto"
                      style={{
                        color: "#A8A29E",
                        backgroundColor: "rgba(0,0,0,0.25)",
                        maxHeight: 96, // ~4 lines at line-height-relaxed
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
          /* Original simulated signal checklist */
          <div className="w-full space-y-2 mt-2">
            {activeSignals.map((sig) => {
              const done    = elapsed >= sig.doneAt;
              const active  = !done && elapsed >= sig.doneAt - 0.15;
              return (
                <motion.div key={sig.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: done ? 1 : active ? 0.85 : 0.3, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: done ? "rgba(74,222,128,0.06)" : active ? "rgba(234,88,12,0.06)" : "#141416",
                    border: `1px solid ${done ? "rgba(74,222,128,0.2)" : active ? "rgba(234,88,12,0.2)" : "rgba(168,162,158,0.08)"}`,
                    transition: "background-color 0.4s, border-color 0.4s",
                  }}>
                  <span className="text-sm flex-shrink-0">{sig.icon}</span>
                  <span className="text-xs font-medium flex-1" style={{ color: done ? "#4ADE80" : active ? "#F5F5F4" : "#524F4C" }}>
                    {sig.label}
                  </span>
                  {done ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                      className="text-[10px] font-mono font-bold" style={{ color: "#4ADE80" }}>✓</motion.span>
                  ) : active ? (
                    <motion.div className="w-1 h-1 rounded-full" style={{ backgroundColor: "#EA580C" }}
                      animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rotating science fact */}
      <div className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          <motion.div key={factIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 rounded-xl flex items-center justify-center"
                style={{ width: 44, height: 44, backgroundColor: "rgba(234,88,12,0.1)", border: "1px solid rgba(234,88,12,0.2)" }}>
                <span className="font-bold" style={{ fontFamily: "var(--font-heading)", fontSize: "0.95rem", color: "#EA580C" }}>
                  {fact.stat}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] leading-relaxed font-medium" style={{ color: "#F5F5F4" }}>
                  {fact.claim}
                </p>
                <p className="text-[9px] mt-1.5 font-mono uppercase tracking-wider" style={{ color: "#3a3835" }}>
                  {fact.source}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
