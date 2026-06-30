"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { PERSONALITIES, getPersonality } from "@/lib/orbPersonality";

export function PersonalityPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { orbPersonality, setOrbPersonality } = useBodyDebtStore();
  const current = getPersonality(orbPersonality);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Select orb voice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full" style={{ backgroundColor: "var(--color-text-disabled)" }} />
            </div>

            {/* Header */}
            <div className="px-5 pb-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Orb voice
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>
                How the orb talks to you
              </p>
            </div>

            {/* Personality options */}
            <div className="px-5 pb-4 space-y-2">
              {PERSONALITIES.map((p) => {
                const isActive = p.id === orbPersonality;
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setOrbPersonality(p.id);
                      onClose();
                    }}
                    className="w-full rounded-2xl flex items-center gap-3 text-left px-4 py-3.5"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(234,88,12,0.1)"
                        : "transparent",
                      border: `1.5px solid ${
                        isActive
                          ? "rgba(234,88,12,0.35)"
                          : "rgba(168,162,158,0.08)"
                      }`,
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm font-semibold block"
                        style={{
                          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        }}
                      >
                        {p.label}
                      </span>
                      <span
                        className="text-[10px] block mt-0.5"
                        style={{ color: "var(--color-text-faint)" }}
                      >
                        {p.tagline}
                      </span>
                    </div>
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "var(--color-brand-primary)" }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Current state display */}
            <div className="px-5 pb-6">
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{ backgroundColor: "rgba(168,162,158,0.04)" }}
              >
                <span className="text-base">{current.emoji}</span>
                <span className="text-[10px]" style={{ color: "var(--color-text-faint)" }}>
                  Currently using <strong style={{ color: "var(--color-text-secondary)" }}>{current.label}</strong> —{" "}
                  {current.tagline}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
