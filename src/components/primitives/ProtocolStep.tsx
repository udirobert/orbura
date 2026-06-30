"use client";

/**
 * ProtocolStep — single directive in the recovery prescription.
 *
 * Replaces the rounded-2xl card pattern in `PrescriptionScreen.tsx`.
 * Renders as a timeline-like row: step number, time window tag,
 * action text. Used in the prescription's vertical protocol layout.
 *
 * Color of the step number and time tag is configurable per step
 * (right-now = red, morning = orange, today = amber, avoid = red).
 */

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion/protocol";

export interface ProtocolStepProps {
  index: number;            // 1-based step number
  window: string;           // e.g. "RIGHT NOW", "THIS MORNING", "TODAY", "AVOID"
  action: string;           // the directive text
  accentColor: string;      // hex for step number / window tag
  isLast?: boolean;         // final step in the protocol
}

export function ProtocolStep({
  index,
  window,
  action,
  accentColor,
  isLast = false,
}: ProtocolStepProps) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative flex gap-3"
    >
      {/* Rail / connector line */}
      <div className="flex flex-col items-center" style={{ width: 28 }}>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold"
          style={{
            backgroundColor: `${accentColor}22`,
            border: `1px solid ${accentColor}66`,
            color: accentColor,
          }}
        >
          {String(index).padStart(2, "0")}
        </div>
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{ backgroundColor: "rgba(168,162,158,0.12)", minHeight: 24 }}
          />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-5 min-w-0">
        <div
          className="text-[9px] font-mono font-black uppercase tracking-widest mb-1.5"
          style={{ color: accentColor }}
        >
          {window}
        </div>
        <p
          className="text-sm leading-relaxed font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {action}
        </p>
      </div>
    </motion.div>
  );
}
