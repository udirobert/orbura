"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import type { Stressor, StressorType } from "@/lib/types";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";
import { StressorCard } from "./stressor-card";
import { STRESSORS, ACK_COPY, CONFIDENCE_CONFIG, computeLiveScore } from "@/lib/stressor-scoring";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function liveScoreColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 41) return "#EA580C";
  if (score >= 21) return "#F59E0B";
  return "#4ADE80";
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function DebtIntakeScreen() {
  const router = useRouter();
  const {
    selectedStressors,
    toggleStressor,
    updateStressor,
    confidenceTier,
  } = useBodyDebtStore();

  // Acknowledgement line state — { key, text }
  const [ackLine, setAckLine] = useState<{ key: string; text: string } | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAck = (key: string) => {
    const text = ACK_COPY[key] ?? "";
    if (!text) return;
    if (ackTimer.current) clearTimeout(ackTimer.current);
    setAckLine({ key, text });
    ackTimer.current = setTimeout(() => setAckLine(null), 2200);
  };

  const handleToggle = (type: StressorType) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    toggleStressor(type);
    const isNowSelected = !selectedStressors.some((s) => s.type === type);
    if (isNowSelected) {
      showAck(type);
      memory.reportAction({
        content: `User logged stressor: ${type}.`,
        event_type: "create",
        page: "intake",
        metadata: { type: "log_stressor", stressor: type },
      }).catch(() => {});
    }
  };

  const handleSubOption = (type: StressorType, field: keyof Stressor, optKey: string) => {
    updateStressor(type, { [field]: optKey } as Partial<Stressor>);
    showAck(optKey);
  };

  const hasSelection = selectedStressors.length > 0;
  const liveScore = computeLiveScore(selectedStressors);
  const confConfig = CONFIDENCE_CONFIG.find((c) => c.tier === confidenceTier) ?? CONFIDENCE_CONFIG[0];

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Nav + live score readout */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button
          onClick={() => router.push("/wake-time")}
          className="text-[11px] font-medium flex items-center gap-1"
          style={{ color: "#524F4C", minHeight: "44px" }}
        >
          ← Back
        </button>
        <div className="flex items-center gap-2.5">
          <motion.div
            key={liveScore}
            initial={{ opacity: 0.6, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-end leading-none"
          >
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "#524F4C" }}
            >
              Live
            </span>
            <span
              className="font-mono text-base font-bold tabular-nums"
              style={{ color: liveScoreColor(liveScore) }}
            >
              {liveScore}
            </span>
          </motion.div>
          <MiniOrb score={liveScore} size={32} />
        </div>
      </div>

      <div className="relative z-10 pt-3 pb-2">
        <ProgressBar current={2} total={5} />
      </div>

      {/* Orb question */}
      <div className="relative z-10 mb-5">
        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.45rem, 5.5vw, 1.8rem)",
            color: "#F5F5F4",
            letterSpacing: "-0.01em",
          }}
        >
          What did you put your body through last night?
        </motion.h2>
        <p className="text-xs mt-1.5" style={{ color: "#524F4C" }}>
          Tap to log · chevron to add detail
        </p>
      </div>

      {/* Acknowledgement banner */}
      <div className="relative z-10 mb-3" style={{ minHeight: 24 }}>
        <AnimatePresence mode="wait">
          {ackLine && (
            <motion.p
              key={ackLine.key}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] font-mono italic"
              style={{ color: "#EA580C" }}
            >
              {ackLine.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Stressor cards */}
      <div className="relative z-10 flex flex-col gap-2.5 flex-1">
        {STRESSORS.map((def, i) => {
          const stressor = selectedStressors.find((s) => s.type === def.type);
          return (
            <motion.div
              key={def.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StressorCard
                def={def}
                stressor={stressor}
                onToggle={() => handleToggle(def.type)}
                onSubOption={(field, key) => handleSubOption(def.type, field, key)}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Confidence signal */}
      <div className="relative z-10 pt-4 pb-2 flex items-center justify-center gap-2">
        <span className="text-sm" style={{ color: confConfig.color }}>{confConfig.dot}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: confConfig.color }}>
          {confConfig.label}
        </span>
      </div>

      {/* CTA */}
      <div className="relative z-10 pb-10 pt-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/context-deepener")}
          disabled={!hasSelection}
          className="w-full font-semibold rounded-2xl"
          style={{
            backgroundColor: hasSelection ? "#EA580C" : "#141416",
            color: hasSelection ? "#F5F5F4" : "#524F4C",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
            border: hasSelection ? "none" : "1px solid rgba(168,162,158,0.1)",
            transition: "background-color 0.2s, color 0.2s",
          }}
        >
          {hasSelection ? "Continue" : "Select what hit you"}
        </motion.button>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-[11px] py-2.5 font-medium mt-1"
          style={{ color: "#524F4C" }}
        >
          Skip — view dashboard
        </button>
      </div>
    </div>
  );
}
