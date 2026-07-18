"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getContextConfig } from "@/lib/contexts";
import { memory } from "@/lib/sdk/eazo-client";
import { useMemoryContext } from "@/hooks/useMemoryContext";
import { UserBadge } from "@/components/user-profile/user-badge";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { RecoveryMode } from "@/lib/types";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";

const DORMANT_FRAMES = [
  "52% 48% 50% 50% / 50% 52% 48% 50%",
  "50% 50% 52% 48% / 52% 48% 50% 50%",
  "48% 52% 50% 50% / 50% 50% 52% 48%",
  "50% 50% 48% 52% / 48% 52% 50% 50%",
];

const SECONDARY_MODES: { mode: RecoveryMode; label: string }[] = [
  { mode: "football", label: "Match Fit" },
  { mode: "fan", label: "Fan Recovery" },
];

export function OpeningScreen() {
  const router = useRouter();
  const { analysis, setHasSeenOpening, setMode, hasSeenOpening, lastWakeTime, lastBedTime, streakDays } =
    useBodyDebtStore();
  const { data: memoryData } = useMemoryContext("user body debt recovery patterns and habits");
  const [orbVisible, setOrbVisible] = useState(false);
  const [copyVisible, setCopyVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const memoryReturning =
    memoryData?.enabled && (memoryData.profile || memoryData.memories.length > 0);
  const localReturning = hasSeenOpening || streakDays > 0 || !!(lastWakeTime && lastBedTime);
  const isReturning = memoryReturning || localReturning;
  const memorySummary = memoryReturning
    ? memoryData.memories.slice(0, 2).join(" · ")
    : "";
  const sleepHabit =
    lastWakeTime && lastBedTime ? `${lastBedTime} → ${lastWakeTime}` : null;

  useEffect(() => {
    if (analysis) {
      router.replace("/dashboard");
      return;
    }
    router.prefetch("/wake-time");
    router.prefetch("/intake");
    const t1 = setTimeout(() => setOrbVisible(true), 120);
    const t2 = setTimeout(() => setCopyVisible(true), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [analysis, router]);

  const handleSelectMode = (mode: RecoveryMode) => {
    setMode(mode);
    setHasSeenOpening(true);
    setExiting(true);
    router.prefetch("/wake-time");
    memory
      .reportAction({
        content: `User started a ${mode} session from the opening screen.`,
        event_type: "start",
        page: "opening",
        metadata: { type: "start_session", mode },
      })
      .catch(() => {});
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
          top: "32%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <UserBadge />
      </div>

      {/* Hero: brand + orb + hook */}
      <div
        className="relative z-10 w-full flex flex-col items-center px-8"
        style={{ paddingTop: "18vh" }}
      >
        <AnimatePresence>
          {orbVisible && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: EASE_PROTOCOL }}
              className="relative flex items-center justify-center mb-8"
              style={{ width: "42vw", maxWidth: 168, height: "42vw", maxHeight: 168 }}
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
                  width: "74%",
                  height: "74%",
                  background:
                    "radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 55%, #1a0800 100%)",
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
                  width: "46%",
                  height: "46%",
                  background:
                    "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.13), transparent 65%)",
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {copyVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_PROTOCOL }}
              className="text-center max-w-sm"
            >
              <h1
                className="tracking-[0.22em] font-semibold uppercase mb-5"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.35rem, 5.5vw, 1.65rem)",
                  color: "var(--color-text-primary)",
                  letterSpacing: "0.18em",
                }}
              >
                Body Debt
              </h1>
              <p
                className="leading-snug"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.05rem, 4vw, 1.25rem)",
                  color: "rgba(168,162,158,0.85)",
                  letterSpacing: "0.01em",
                }}
              >
                {isReturning
                  ? "Welcome back. Ready to check today's debt?"
                  : "Your body keeps the score."}
              </p>
              {!isReturning && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Log last night. Get a recovery plan with transparent reasoning.
                </p>
              )}
              {!isReturning && (
                <button
                  type="button"
                  onClick={() => router.push("/coach-memory")}
                  className="mt-4 text-[10px] font-mono tracking-wide underline-offset-2 hover:underline"
                  style={{ color: "#a855f7" }}
                >
                  See how your coach learns over time →
                </button>
              )}
              {!isReturning && (
                <button
                  type="button"
                  onClick={() => router.push("/preview")}
                  className="mt-2 text-[9px] font-mono"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Or explore a full example session →
                </button>
              )}
              {isReturning && sleepHabit && (
                <p
                  className="mt-3 text-[11px] font-mono"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Usual sleep · {sleepHabit}
                </p>
              )}
              {isReturning && memorySummary && (
                <p
                  className="text-[11px] mt-3 font-mono leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {memorySummary.length > 120
                    ? memorySummary.slice(0, 120) + "…"
                    : memorySummary}
                </p>
              )}
              {isReturning && memoryReturning && (
                <button
                  type="button"
                  onClick={() => router.push("/coach-memory")}
                  className="mt-2 text-[9px] font-mono"
                  style={{ color: "#a855f7" }}
                >
                  How your coach uses this →
                </button>
              )}
              {isReturning && streakDays > 0 && !memorySummary && (
                <p
                  className="mt-3 text-[11px] font-mono"
                  style={{ color: "var(--color-states-success)" }}
                >
                  {streakDays}d streak · keep the chain going
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary path + quiet mode links */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-end px-6 pb-10">
        <AnimatePresence>
          {copyVisible && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: EASE_PROTOCOL }}
              className="flex flex-col gap-5"
            >
              <PrimaryButton
                size="lg"
                shimmer
                onClick={() => handleSelectMode("personal")}
              >
                {isReturning ? "Check today's debt" : "Check my debt"}
              </PrimaryButton>

              <div className="flex flex-col items-center gap-2.5">
                <p
                  className="text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: "rgba(82,79,76,0.75)" }}
                >
                  Or continue as
                </p>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  {SECONDARY_MODES.map((m, i) => (
                    <span key={m.mode} className="flex items-center">
                      {i > 0 && (
                        <span
                          className="mx-2 text-[10px]"
                          style={{ color: "rgba(82,79,76,0.5)" }}
                          aria-hidden
                        >
                          ·
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectMode(m.mode)}
                        className="text-[12px] font-medium underline-offset-4 hover:underline transition-colors"
                        style={{ color: "var(--color-text-secondary)", minHeight: 44 }}
                        title={getContextConfig(m.mode).vocabulary.tagline}
                      >
                        {m.label}
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <p
                className="text-center text-[10px] tracking-widest uppercase font-mono"
                style={{ color: "rgba(82,79,76,0.7)" }}
              >
                {isReturning
                  ? "Self-hosted QVAC · User-controlled memory"
                  : "No account · Deterministic score first"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
