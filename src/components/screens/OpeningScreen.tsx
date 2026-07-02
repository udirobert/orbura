"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getAllContexts } from "@/lib/contexts";
import { memory } from "@/lib/sdk/eazo-client";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { RecoveryMode } from "@/lib/types";

// Turbulence frames for dormant orb
const DORMANT_FRAMES = [
  "52% 48% 50% 50% / 50% 52% 48% 50%",
  "50% 50% 52% 48% / 52% 48% 50% 50%",
  "48% 52% 50% 50% / 50% 50% 52% 48%",
  "50% 50% 48% 52% / 48% 52% 50% 50%",
];

export function OpeningScreen() {
  const router = useRouter();
  const { analysis, setHasSeenOpening, setMode } = useBodyDebtStore();
  const [orbVisible, setOrbVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const allContexts = getAllContexts();

  useEffect(() => {
    if (analysis) {
      router.replace("/dashboard");
      return;
    }
    // Prefetch next routes while user reads the opening screen
    router.prefetch("/wake-time");
    router.prefetch("/intake");
    const t1 = setTimeout(() => setOrbVisible(true), 200);
    const t2 = setTimeout(() => setTextVisible(true), 1000);
    const t3 = setTimeout(() => setPickerVisible(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [analysis, router]);

  const handleSelectMode = (mode: RecoveryMode) => {
    setMode(mode);
    setHasSeenOpening(true);
    setExiting(true);
    router.prefetch("/wake-time");
    memory.reportAction({
      content: `User started a ${mode} session from the opening screen.`,
      event_type: "start",
      page: "opening",
      metadata: { type: "start_session", mode },
    }).catch(() => {});
    router.push("/wake-time");
  };

  return (
    <motion.div
      className="relative min-h-svh flex flex-col items-center overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.38 }}
    >
      {/* Full-bleed amber glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "34%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "480px", height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Brand */}
      <div className="relative z-10 w-full flex justify-center pt-14">
        <AnimatePresence>
          {textVisible && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span
                className="tracking-[0.25em] text-xs font-semibold uppercase"
                style={{ color: "rgba(168,162,158,0.5)" }}
              >
                BODY DEBT
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dormant orb */}
      <div className="relative z-10 flex flex-col items-center gap-6" style={{ marginTop: "-2vh" }}>
        <AnimatePresence>
          {orbVisible && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative flex items-center justify-center"
              style={{ width: "48vw", maxWidth: 200, height: "48vw", maxHeight: 200 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 80px 28px rgba(245,158,11,0.15)" }}
                animate={{ opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: "74%", height: "74%",
                  background: "radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 55%, #1a0800 100%)",
                  boxShadow: "0 0 50px 12px rgba(245,158,11,0.2)",
                }}
                animate={{ borderRadius: DORMANT_FRAMES, scale: [1, 1.025, 1] }}
                transition={{
                  borderRadius: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "46%", height: "46%",
                  background: "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.13), transparent 65%)",
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <div
                className="absolute text-center font-normal"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2rem, 8vw, 3rem)",
                  color: "rgba(245,245,244,0.25)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                —
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {textVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-8"
            >
              <p
                className="leading-relaxed"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1rem, 4vw, 1.15rem)",
                  color: "rgba(168,162,158,0.7)",
                  letterSpacing: "0.01em",
                }}
              >
                Your body keeps the score. Quantify the debt from last night&apos;s choices — alcohol, sleep, training, stress — and get a recovery plan that works offline.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mode picker */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-center px-6 pb-10">
        <AnimatePresence>
          {pickerVisible && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="flex flex-col gap-3"
            >
              {allContexts.map((c) => {
                const v = c.vocabulary;
                const isDefault = c.mode === "personal";
                return (
                  <motion.button
                    key={c.mode}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectMode(c.mode)}
                    className="w-full rounded-2xl px-5 py-4 text-left flex items-start gap-4 transition-colors"
                    style={{
                      backgroundColor: isDefault ? "rgba(234,88,12,0.06)" : "var(--color-bg-surface)",
                      border: isDefault ? "1px solid rgba(234,88,12,0.2)" : "1px solid rgba(168,162,158,0.1)",
                    }}
                  >
                    <span className="text-xl flex-shrink-0 pt-0.5">
                      {isDefault ? "🧘" : "⚽"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold block ${isDefault ? "" : ""}`}
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {v.appName}
                        </span>
                        {isDefault && (
                          <span
                            className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "rgba(234,88,12,0.1)",
                              color: "var(--color-brand-primary)",
                            }}
                          >
                            Default
                          </span>
                        )}
                        {c.mode === "football" && (
                          <span
                            className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "rgba(74,222,128,0.08)",
                              color: "var(--color-states-success)",
                            }}
                          >
                            Squad mode
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[11px] block mt-0.5 leading-relaxed"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {v.tagline}
                      </span>
                    </div>
                    <span
                      className="text-lg flex-shrink-0 pt-0.5"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      →
                    </span>
                  </motion.button>
                );
              })}
              <p
                className="text-center mt-4 text-[10px] tracking-widest uppercase font-mono"
                style={{ color: "rgba(82,79,76,0.7)" }}
              >
                No account · AI runs on-device
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
