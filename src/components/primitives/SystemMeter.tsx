"use client";

/**
 * SystemMeter — single recovery-system readout.
 *
 * Replaces the card pattern in `SystemPanels.tsx` for the collapsed
 * (default) view. One row per system: label, system icon glyph, score
 * bar, countdown, clear time. Uses the system-specific accent token.
 *
 * The expanded view (cause / action / science citation) is rendered by
 * the parent via `children` — this primitive only owns the meter itself.
 */

import { motion } from "framer-motion";
import type { RecoverySystem } from "@/lib/types";
import { SYSTEM_ACCENTS } from "@/lib/design-tokens";
import { fadeUp } from "@/lib/motion/protocol";

export interface SystemMeterProps {
  system: RecoverySystem;
  label: string;
  score: number;            // 0–100
  clearedAt: string;        // ISO datetime
  countdown: string;        // pre-formatted "Xh Ym" / "Cleared"
  clearTime: string;        // pre-formatted "Cleared 4pm tomorrow"
  isPrimary?: boolean;      // true for the highest-score system
  isCleared?: boolean;
  glyph?: string;           // optional single-character glyph (e.g. "C", "B", "L")
  onTap?: () => void;
  children?: React.ReactNode; // expanded content slot
}

function Glyph({ system }: { system: RecoverySystem }) {
  // Single-letter monogram for clinical readout feel. Replaces emoji in
  // the meter to align with the premium/clinical direction. The full
  // anatomical SVG path is reserved for the orb (SystemOrb).
  const map: Record<RecoverySystem, string> = {
    cardiovascular: "C",
    brain:          "N",
    liver:          "L",
    muscular:       "M",
    gut:            "G",
  };
  return <span aria-hidden>{map[system]}</span>;
}

export function SystemMeter({
  system,
  label,
  score,
  clearedAt: _clearedAt,
  countdown,
  clearTime,
  isPrimary = false,
  isCleared = false,
  glyph,
  onTap,
  children,
}: SystemMeterProps) {
  const accent = SYSTEM_ACCENTS[system];
  const accentColor = isPrimary ? accent.active : accent.muted;
  const barColor    = isPrimary ? accent.active : accent.muted;
  const textColor   = isCleared ? "var(--color-states-success)" : isPrimary ? "var(--color-text-primary)" : "var(--color-text-secondary)";
  const subTextColor = isCleared ? "var(--color-states-success)" : isPrimary ? accent.active : "var(--color-text-secondary)";
  const pct = Math.max(0, Math.min(100, score));

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: isPrimary ? "rgba(255,255,255,0.02)" : "transparent",
        border: `1px solid ${isPrimary ? accent.soft : "rgba(168,162,158,0.06)"}`,
      }}
    >
      <button
        type="button"
        onClick={onTap}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
        style={{ minHeight: 52, WebkitTapHighlightColor: "transparent" }}
      >
        {/* Glyph / monogram */}
        <span
          className="font-mono font-bold text-sm flex-shrink-0 w-6 text-center"
          style={{ color: accentColor }}
        >
          {glyph ?? <Glyph system={system} />}
        </span>

        {/* Label + bar + clear time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold" style={{ color: textColor }}>
              {label}
            </span>
            <span
              className="text-[10px] font-mono flex-shrink-0"
              style={{ color: subTextColor }}
            >
              {isCleared ? "✓ Clear" : countdown}
            </span>
          </div>

          <div
            className="mt-1.5 rounded-full overflow-hidden"
            style={{ height: 3, backgroundColor: "rgba(168,162,158,0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[9px] font-mono" style={{ color: "var(--color-text-disabled)" }}>
              {clearTime}
            </span>
            {!isCleared && isPrimary && (
              <motion.span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: barColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </div>
      </button>

      {children}
    </motion.div>
  );
}
