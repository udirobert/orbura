"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentTrace } from "@/lib/types";

const AGENT_ICONS: Record<string, string> = {
  triage: "🔬",
  coach: "💊",
  schedule: "📅",
};

const SOURCE_LABELS: Record<string, string> = {
  "qvac-local": "QVAC · Llama-3.2-1B · on-device",
  "eazo-cloud": "Cloud AI · Eazo",
  "deterministic": "Deterministic engine",
};

const SOURCE_COLORS: Record<string, string> = {
  "qvac-local": "#4ADE80",
  "eazo-cloud": "#F59E0B",
  "deterministic": "#A8A29E",
};

/**
 * AgentTracePanel
 *
 * Shows the multi-agent pipeline that produced the user's prescription.
 * Collapsible. Displays each agent's role, status, duration, and source
 * (QVAC local vs cloud fallback vs deterministic).
 *
 * This is a key differentiator for the QVAC hackathon: it makes the
 * multi-agent edge AI flow visible and legible to judges.
 */
export function AgentTracePanel({ trace }: { trace: AgentTrace }) {
  const [expanded, setExpanded] = useState(false);
  const sourceColor = SOURCE_COLORS[trace.source] ?? "#A8A29E";
  const sourceLabel = SOURCE_LABELS[trace.source] ?? trace.source;

  const allDone = trace.steps.length > 0 && trace.steps.every((s) => s.status === "done");
  const hasError = trace.steps.some((s) => s.status === "error");

  return (
    <div className="relative z-10 mb-6">
      <motion.div
        layout
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{
          backgroundColor: "#141416",
          border: `1px solid ${expanded ? "rgba(74,222,128,0.2)" : "rgba(168,162,158,0.08)"}`,
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm flex-shrink-0">
            {hasError ? "⚠️" : allDone ? "✓" : "⏳"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: "#F5F5F4" }}>
                Multi-Agent Pipeline
              </span>
              <span className="text-[9px] font-mono flex-shrink-0" style={{ color: sourceColor }}>
                {trace.steps.length} agents · {trace.totalDurationMs ? `${(trace.totalDurationMs / 1000).toFixed(1)}s` : ""}
              </span>
            </div>
            {/* Source badge */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: sourceColor }} />
              <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: sourceColor }}>
                {sourceLabel}
              </span>
            </div>
          </div>
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-[10px]" style={{ color: "#524F4C" }}>
            ▼
          </motion.span>
        </div>

        {/* Expanded trace */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {trace.steps.map((step, i) => (
                  <motion.div
                    key={`${step.agent}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 py-2"
                    style={{
                      borderBottom: i < trace.steps.length - 1 ? "1px solid rgba(168,162,158,0.06)" : "none",
                    }}
                  >
                    {/* Agent icon */}
                    <span className="text-sm flex-shrink-0 mt-0.5">
                      {AGENT_ICONS[step.agent] ?? "🤖"}
                    </span>

                    {/* Agent info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium" style={{
                          color: step.status === "done" ? "#F5F5F4" : step.status === "error" ? "#DC2626" : "#A8A29E",
                        }}>
                          {step.label}
                        </span>
                        {step.durationMs && (
                          <span className="text-[9px] font-mono" style={{ color: "#524F4C" }}>
                            {(step.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      {/* Description */}
                      <p className="text-[10px] mt-0.5" style={{ color: "#524F4C", lineHeight: 1.4 }}>
                        {step.description}
                      </p>
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {step.status === "done" && (
                          <>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#4ADE80" }}>
                              {step.source === "qvac-local" ? "QVAC local" : step.source}
                            </span>
                          </>
                        )}
                        {step.status === "error" && (
                          <>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#DC2626" }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#DC2626" }}>
                              Failed — fell back
                            </span>
                          </>
                        )}
                        {step.status === "active" && (
                          <>
                            <motion.span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#EA580C" }}
                              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#EA580C" }}>
                              Running on device...
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Triage result preview */}
                {trace.triage && (
                  <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(234,88,12,0.04)", border: "1px solid rgba(234,88,12,0.1)" }}>
                    <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#524F4C" }}>
                      Triage Output
                    </span>
                    <div className="mt-1.5 space-y-1">
                      {trace.triage.priority && (
                        <p className="text-[10px]" style={{ color: "#A8A29E" }}>
                          <span style={{ color: "#DC2626", fontWeight: 700 }}>PRIORITY:</span> {trace.triage.priority}
                        </p>
                      )}
                      {trace.triage.secondary && (
                        <p className="text-[10px]" style={{ color: "#A8A29E" }}>
                          <span style={{ color: "#EA580C", fontWeight: 700 }}>SECONDARY:</span> {trace.triage.secondary}
                        </p>
                      )}
                      {trace.triage.avoid && (
                        <p className="text-[10px]" style={{ color: "#A8A29E" }}>
                          <span style={{ color: "#A78BFA", fontWeight: 700 }}>AVOID:</span> {trace.triage.avoid}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
