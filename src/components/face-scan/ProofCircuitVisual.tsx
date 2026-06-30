"use client";

import { motion } from "framer-motion";

interface CircuitStep {
  label: string;
  detail: string;
  done: boolean;
}

function CircuitNode({ done, color, delay }: { done: boolean; color: string; delay: number }) {
  return (
    <motion.div
      className="relative"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 15 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: color,
          filter: "blur(6px)",
          opacity: done ? 0.6 : 0.15,
        }}
        animate={done ? { scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Node circle */}
      <div
        className="relative w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: done ? `${color}22` : "rgba(168,162,158,0.08)",
          border: `2px solid ${done ? color : "rgba(168,162,158,0.2)"}`,
        }}
      >
        {done ? (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: delay + 0.3, duration: 0.4 }}
            viewBox="0 0 12 12"
            className="w-3 h-3"
            style={{ color }}
          >
            <motion.path
              d="M2 6l3 3 5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: delay + 0.3, duration: 0.4 }}
            />
          </motion.svg>
        ) : (
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "rgba(168,162,158,0.3)" }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

function CircuitLine({ done, color, delay }: { done: boolean; color: string; delay: number }) {
  return (
    <div className="flex-1 mx-0.5 relative" style={{ height: 2 }}>
      {/* Background track */}
      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(168,162,158,0.06)" }} />
      {/* Animated progress */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: done ? color : "transparent" }}
        initial={{ width: "0%" }}
        animate={{ width: done ? "100%" : "0%" }}
        transition={{ delay, duration: 0.5, ease: "easeOut" }}
      />
      {/* Connection dots - circuit trace aesthetic */}
      <motion.div
        className="absolute -top-0.5 w-1 h-1 rounded-full"
        style={{ backgroundColor: done ? color : "rgba(168,162,158,0.1)", left: "25%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0.3 }}
        transition={{ delay: delay + 0.2 }}
      />
      <motion.div
        className="absolute -top-0.5 w-1 h-1 rounded-full"
        style={{ backgroundColor: done ? color : "rgba(168,162,158,0.1)", left: "75%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0.3 }}
        transition={{ delay: delay + 0.4 }}
      />
    </div>
  );
}

export function ProofCircuitVisual({ steps }: { steps: CircuitStep[] }) {
  const stepColors = ["#10B981", "var(--color-states-warning)", "var(--color-states-success)", "var(--color-brand-primary)"];
  const stepDelays = [0, 0.3, 0.6, 0.9];

  return (
    <div
      className="rounded-2xl p-4 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)", position: "relative" }}
    >
      {/* Faint circuit-diagram grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ color: "var(--color-brand-primary)" }}>
        <defs>
          <pattern id="circuit-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-faint)" }}>
            Proof Circuit
          </span>
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: steps.every(s => s.done) ? "var(--color-states-success)" : "var(--color-states-warning)" }}
            animate={{ opacity: steps.every(s => s.done) ? 1 : [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: steps.every(s => s.done) ? 0 : Infinity }}
          />
        </div>

        {/* Circuit trace - horizontal flow with nodes */}
        <div className="flex items-center">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              {/* Node */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <CircuitNode done={step.done} color={stepColors[i % stepColors.length]} delay={stepDelays[i]} />
                {/* Labels below */}
                <span
                  className="text-[8px] font-semibold text-center leading-tight max-w-[60px]"
                  style={{ color: step.done ? "var(--color-text-primary)" : "var(--color-text-faint)" }}
                >
                  {step.label.length > 14 ? step.label.slice(0, 12) + "..." : step.label}
                </span>
                <span
                  className="text-[6px] font-mono text-center leading-tight break-words"
                  style={{ color: step.done ? "var(--color-text-secondary)" : "var(--color-text-disabled)", maxWidth: 72 }}
                >
                  {step.detail}
                </span>
              </div>
              {/* Connecting line between nodes */}
              {i < steps.length - 1 && (
                <CircuitLine done={step.done} color={stepColors[i % stepColors.length]} delay={stepDelays[i] + 0.3} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
