"use client";

import { motion } from "framer-motion";

interface PatternLayerProps {
  streakDays: number;
}

export function PatternLayer({ streakDays }: PatternLayerProps) {
  if (streakDays === 0) return null;
  return (
    <div className="relative z-10 mb-6">
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid rgba(74,222,128,0.15)",
        }}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: "var(--color-states-success)" }}
        />
        <div>
          <span className="text-xs font-semibold" style={{ color: "var(--color-states-success)" }}>
            {streakDays} day{streakDays !== 1 ? "s" : ""} under 20
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>
            Clean streak. Your body is thanking you.
          </p>
        </div>
      </div>
    </div>
  );
}
