"use client";

import { motion } from "framer-motion";
import type { RecoverySystem, DebtAnalysis } from "@/lib/types";

const SYSTEM_ORDER: RecoverySystem[] = ["cardiovascular", "brain", "liver", "muscular", "gut"];
const SYSTEM_ICONS: Record<RecoverySystem, string> = {
  cardiovascular: "🪀",
  brain: "🧠",
  liver: "🫁",
  muscular: "💪",
  gut: "🦠",
};

interface SystemIconRowProps {
  systems: DebtAnalysis["systemScores"];
  onTap: () => void;
}

export function SystemIconRow({ systems, onTap }: SystemIconRowProps) {
  if (!systems?.length) return null;
  return (
    <div className="flex items-center justify-center gap-5 mt-4">
      {SYSTEM_ORDER.map((sys) => {
        const score = systems.find((s) => s.system === sys)?.score ?? 0;
        const color =
          score >= 70
            ? "var(--color-states-error)"
            : score >= 40
              ? "var(--color-brand-primary)"
              : score >= 15
                ? "var(--color-states-warning)"
                : "var(--color-states-success)";
        return (
          <motion.button
            key={sys}
            whileTap={{ scale: 0.85 }}
            onClick={onTap}
            className="flex flex-col items-center gap-0.5"
          >
            <span className="text-base">{SYSTEM_ICONS[sys]}</span>
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
          </motion.button>
        );
      })}
    </div>
  );
}
