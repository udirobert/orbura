"use client";

import { motion } from "framer-motion";
import { Clock } from "lucide-react";

/**
 * ComingSoonCard — shown to guest users on the dashboard, prescription
 * screen, and share card. Honest about the current state: data is saved
 * on this device only. Cloud sync / cross-device / reminders need
 * backend infrastructure (Zapier-style integration is on the roadmap)
 * and are explicitly marked as "coming soon" so users don't expect
 * the buttons to do something they can't.
 */
export function GuestAuthCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mt-6 rounded-2xl p-4 text-center"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <Clock className="w-3 h-3" style={{ color: "var(--color-states-warning)" }} />
        <span
          className="text-[9px] font-mono uppercase tracking-widest font-semibold"
          style={{ color: "var(--color-states-warning)" }}
        >
          Coming soon
        </span>
      </div>
      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Your data is saved on this device
      </p>
      <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
        Cloud sync, cross-device history, and reminders need
        backend infrastructure (Zapier-style integration).
        Until then, your scores stay on this device.
      </p>
    </motion.div>
  );
}
