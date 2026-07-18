"use client";

import { motion } from "framer-motion";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getContextConfig } from "@/lib/contexts";
import type { RecoveryMode } from "@/lib/types";

const MODES: RecoveryMode[] = ["personal", "football"];

export function ModeToggle() {
  const { mode, setMode } = useBodyDebtStore();

  return (
    <div
      className="relative inline-flex p-1 rounded-full"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      {MODES.map((m) => {
        const isActive = mode === m;
        const ctx = getContextConfig(m);
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="relative px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest transition-colors"
            style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-faint)" }}
          >
            {isActive && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: "var(--color-brand-primary)" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{ctx.vocabulary.personaLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
