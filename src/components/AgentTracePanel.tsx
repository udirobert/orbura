"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { AgentTrace } from "@/lib/types";
import { Collapse } from "@/components/ui/collapse";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";

const AGENT_ICONS: Record<string, string> = {
  triage: "🔬",
  coach: "💊",
  schedule: "📅",
  reflection: "🎭",
};

const SOURCE_LABELS: Record<string, string> = {
  "qvac-local": "QVAC · Qwen3-1.7B · app server",
  "eazo-cloud": "Cloud AI · legacy fallback",
  "deterministic": "Deterministic engine",
};

const SOURCE_COLORS: Record<string, string> = {
  "qvac-local": "var(--color-states-success)",
  "eazo-cloud": "var(--color-states-warning)",
  "deterministic": "var(--color-text-secondary)",
};

/**
 * AgentTracePanel
 *
 * Shows the multi-agent pipeline that produced the user's prescription.
 * Collapsible. Displays each agent's role, status, duration, and source
 * (QVAC local vs cloud fallback vs deterministic).
 */
export function AgentTracePanel({ trace }: { trace: AgentTrace }) {
  const [expanded, setExpanded] = useState(false);
  const sourceColor = SOURCE_COLORS[trace.source] ?? "var(--color-text-secondary)";
  const sourceLabel = SOURCE_LABELS[trace.source] ?? trace.source;

  const allDone = trace.steps.length > 0 && trace.steps.every((s) => s.status === "done");
  const hasError = trace.steps.some((s) => s.status === "error");

  return (
    <div className="relative z-10 mb-6">
      <motion.div
        layout
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-surface)",
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
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
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
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.22, ease: EASE_PROTOCOL }}
            className="text-[10px]"
            style={{ color: "var(--color-text-faint)" }}
          >
            ▼
          </motion.span>
        </div>

        {/* Expanded trace */}
        <Collapse open={expanded}>
              <div className="px-4 pb-4 space-y-2">
                {trace.steps.map((step, i) => (
                  <motion.div
                    key={`${step.agent}-${i}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ease: EASE_PROTOCOL }}
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
                          color: step.status === "done" ? "var(--color-text-primary)" : step.status === "error" ? "var(--color-states-error)" : "var(--color-text-secondary)",
                        }}>
                          {step.label}
                        </span>
                        {step.durationMs && (
                          <span className="text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>
                            {(step.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      {/* Description */}
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-faint)", lineHeight: 1.4 }}>
                        {step.description}
                      </p>
                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {step.status === "done" && (
                          <>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
                              {step.source === "qvac-local" ? "QVAC local" : step.source}
                            </span>
                          </>
                        )}
                        {step.status === "error" && (
                          <>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-error)" }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-error)" }}>
                              Failed — fell back
                            </span>
                          </>
                        )}
                        {step.status === "active" && (
                          <>
                            <motion.span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-brand-primary)" }}
                              animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                            <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-brand-primary)" }}>
                              Running on app server...
                            </span>
                          </>
                        )}
                      </div>

                      {/* Raw LLM output — collapsible */}
                      {step.raw && step.status === "done" && (
                        <RawOutput raw={step.raw} />
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Memory context injected from Supermemory */}
                {trace.memoryContext && (
                  <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.1)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-mono uppercase tracking-widest font-semibold" style={{ color: "#a855f7" }}>
                        🧠 Memory Context
                      </span>
                      <span className="text-[8px] font-mono" style={{ color: "#a855f7" }}>
                        Supermemory
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
                        {trace.memoryContext.slice(0, 600)}
                        {trace.memoryContext.length > 600 ? "\n…" : ""}
                      </pre>
                    </div>
                    <p className="text-[8px] font-mono mt-1.5" style={{ color: "var(--color-text-faint)" }}>
                      Injected into triage + coach agent prompts
                    </p>
                  </div>
                )}

                {/* Triage result preview */}
                {trace.triage && (
                  <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(234,88,12,0.04)", border: "1px solid rgba(234,88,12,0.1)" }}>
                    <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
                      Triage Output
                    </span>
                    <div className="mt-1.5 space-y-1">
                      {trace.triage.priority && (
                        <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-states-error)", fontWeight: 700 }}>PRIORITY:</span> {trace.triage.priority}
                        </p>
                      )}
                      {trace.triage.secondary && (
                        <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-brand-primary)", fontWeight: 700 }}>SECONDARY:</span> {trace.triage.secondary}
                        </p>
                      )}
                      {trace.triage.avoid && (
                        <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                          <span style={{ color: "var(--color-system-muscular)", fontWeight: 700 }}>AVOID:</span> {trace.triage.avoid}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Edge vs Cloud performance comparison */}
                {trace.totalDurationMs != null && trace.source === "qvac-local" && (
                  <div className="mt-3 rounded-xl p-3"
                    style={{ backgroundColor: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-mono uppercase tracking-widest font-semibold" style={{ color: "var(--color-states-success)" }}>
                        Performance
                      </span>
                      {trace.cloudDurationMs != null && trace.cloudDurationMs > 0 && trace.totalDurationMs > 0 && (
                        <span className="text-[8px] font-mono" style={{ color: "var(--color-states-success)" }}>
                          {Math.round(trace.cloudDurationMs / trace.totalDurationMs)}x faster
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Edge bar */}
                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono mb-0.5">
                          <span style={{ color: "var(--color-states-success)" }}>QVAC (app server)</span>
                          <span style={{ color: "var(--color-text-primary)" }}>{(trace.totalDurationMs / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border-subtle)" }}>
                          <motion.div
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{
                              backgroundColor: "var(--color-states-success)",
                              width: trace.cloudDurationMs != null && trace.cloudDurationMs > 0
                                ? `${Math.min(100, (trace.totalDurationMs / trace.cloudDurationMs) * 100)}%`
                                : "50%",
                            }}
                            initial={{ width: "0%" }}
                            animate={{
                              width: trace.cloudDurationMs != null && trace.cloudDurationMs > 0
                                ? `${Math.min(100, (trace.totalDurationMs / trace.cloudDurationMs) * 100)}%`
                                : "50%",
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      {/* Cloud bar */}
                      {trace.cloudDurationMs != null && trace.cloudDurationMs > 0 && (
                        <div className="flex-1">
                          <div className="flex justify-between text-[8px] font-mono mb-0.5">
                            <span style={{ color: "var(--color-states-error)" }}>Cloud (parallel)</span>
                            <span style={{ color: "var(--color-text-secondary)" }}>{(trace.cloudDurationMs / 1000).toFixed(1)}s</span>
                          </div>
                          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border-subtle)" }}>
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: "var(--color-states-error)", width: "100%" }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] font-mono mt-1.5 text-center" style={{ color: "var(--color-text-faint)" }}>
                      QVAC ran {trace.cloudDurationMs != null && trace.cloudDurationMs > trace.totalDurationMs
                        ? `${Math.round(trace.cloudDurationMs / trace.totalDurationMs)}x faster than the cloud comparison`
                        : "on the app server without a third-party model API"}
                    </p>
                  </div>
                )}
              </div>
        </Collapse>
      </motion.div>
    </div>
  );
}

function RawOutput({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  const preview = raw.slice(0, 80).trim();
  return (
    <div className="mt-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider"
        style={{ color: "var(--color-text-faint)" }}
      >
        <span
          className="inline-block transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transitionDuration: "var(--duration-collapse)",
          }}
        >
          ▸
        </span>
        <span>raw output</span>
      </button>
      <Collapse open={open}>
        <div
          className="mt-1.5 rounded-lg p-2 overflow-y-auto"
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(168,162,158,0.06)",
            maxHeight: 120,
          }}
        >
          <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
            {raw.trim()}
          </pre>
        </div>
      </Collapse>
      {!open && preview && (
        <p className="text-[9px] mt-0.5 truncate font-mono" style={{ color: "var(--color-text-disabled)" }}>
          {preview}...
        </p>
      )}
    </div>
  );
}
