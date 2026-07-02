"use client";

import { motion } from "framer-motion";

interface VerdictCardProps {
  verdict: string;
  tagline: string;
  recoveryTime: string;
  recoveryLabel: string;
}

export function VerdictCard({
  verdict,
  tagline,
  recoveryTime,
  recoveryLabel,
}: VerdictCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl px-5 py-3.5 mt-3 mx-2 text-center"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      {/* Verdict text */}
      <p
        className="font-normal leading-relaxed"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(0.875rem, 3.5vw, 1.05rem)",
          color: "var(--color-text-primary)",
        }}
      >
        {verdict}
      </p>

      {/* Bottom row: recovery time + tagline */}
      <div className="flex items-center justify-center gap-3 mt-2.5">
        <span className="text-[10px] font-mono" style={{ color: "var(--color-text-secondary)" }}>
          <span style={{ color: "var(--color-text-faint)" }}>{recoveryLabel}</span>{" "}
          <span style={{ color: "var(--color-text-primary)" }}>{recoveryTime}</span>
        </span>
        <span className="w-px h-3" style={{ backgroundColor: "rgba(168,162,158,0.12)" }} />
        <span className="text-[9px] italic" style={{ color: "var(--color-text-faint)" }}>
          {tagline}
        </span>
      </div>
    </motion.div>
  );
}
