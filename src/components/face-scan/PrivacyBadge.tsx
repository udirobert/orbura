"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { ScanPhase } from "./use-face-scan-pipeline";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";

const PHASE_COPY: Partial<Record<ScanPhase, { label: string; sublabel?: string }>> = {
  camera:    { label: "Live preview", sublabel: "Not recording" },
  review:    { label: "In memory only", sublabel: "Not saved" },
  extracting: { label: "Processing locally", sublabel: "Browser-local" },
  proving:   { label: "Proving locally", sublabel: "Browser-local" },
  verifying: { label: "Verifying proof", sublabel: "Credential only" },
  result:    { label: "Photo cleared", sublabel: "Nothing stored" },
};

interface PrivacyBadgeProps {
  phase: ScanPhase;
}

/**
 * Persistent floating privacy indicator. Visible during all active
 * face-scan phases (camera through result). Adapts its copy per phase
 * so the user always knows the current state of their data.
 *
 * The badge is intentionally small and non-intrusive — it's a
 * reassurance signal, not a warning. The emerald shield icon and
 * pulse animation create a "secure" feeling without alarm.
 */
export function PrivacyBadge({ phase }: PrivacyBadgeProps) {
  const copy = PHASE_COPY[phase];
  if (!copy) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: EASE_PROTOCOL }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
        style={{
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ShieldCheck className="w-3 h-3" style={{ color: "var(--color-states-success)" }} />
        </motion.div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-[9px] font-mono font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-states-success)" }}
          >
            {copy.label}
          </span>
          {copy.sublabel && (
            <span
              className="text-[8px] font-mono uppercase tracking-wider"
              style={{ color: "var(--color-text-faint)" }}
            >
              · {copy.sublabel}
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
