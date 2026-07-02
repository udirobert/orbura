"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConfidenceTier } from "@/lib/types";

const CONFIDENCE_CONFIG: Record<string, { dot: string; label: string; color: string; explanation: string }> = {
  estimated: { dot: "◐", label: "Estimated",       color: "var(--color-text-faint)", explanation: "Based on your reported stressors only. No biometric data used." },
  partial:   { dot: "◑", label: "Partial picture", color: "var(--color-text-secondary)", explanation: "Some biometric signal received. Connecting a wearable or doing a face scan would improve accuracy." },
  good:      { dot: "◕", label: "Good read",        color: "var(--color-states-warning)", explanation: "Face scan or HRV data is included. Confidence is high enough to act on." },
  accurate:  { dot: "●", label: "Accurate",         color: "var(--color-brand-primary)", explanation: "Multiple biometric signals verified. Your score reflects real physiology." },
  precise:   { dot: "●", label: "Precise",          color: "var(--color-states-success)", explanation: "Full signal coverage: stressors, face scan, and HRV. Maximum confidence." },
};

interface ConfidenceSignalProps {
  tier?: ConfidenceTier;
}

export function ConfidenceSignal({ tier }: ConfidenceSignalProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CONFIDENCE_CONFIG[tier ?? "estimated"] ?? CONFIDENCE_CONFIG.partial;

  // Signal strength: 1–5 bars based on tier index
  const tierOrder: ConfidenceTier[] = ["estimated", "partial", "good", "accurate", "precise"];
  const strength = tier ? Math.max(1, tierOrder.indexOf(tier) + 1) : 1;

  return (
    <div className="flex flex-col items-center mt-3">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="confidence-explanation"
        className="flex items-center justify-center gap-2"
      >
        {/* Signal strength bars */}
        <div className="flex items-end gap-[2px] h-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full"
              style={{
                height: `${4 + i * 2}px`,
                backgroundColor: i <= strength ? cfg.color : "rgba(168,162,158,0.1)",
                transition: "background-color 0.3s",
              }}
            />
          ))}
        </div>

        {/* Tier label */}
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </span>

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-[7px]"
          style={{ color: cfg.color }}
        >
          ▾
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            id="confidence-explanation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            role="region"
            aria-label="Confidence explanation"
          >
            <p className="text-[9px] text-center px-8 mt-1.5 leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
              {cfg.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
