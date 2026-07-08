"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import type { Stressor, StressorType } from "@/lib/types";
import { MiniOrb } from "@/components/MiniOrb";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StressorCard } from "./stressor-card";
import { ACK_COPY, CONFIDENCE_CONFIG, computeLiveScore, byMode, intakeStressors } from "@/stressors";
import type { StressorDef } from "@/stressors/types";
import { bandMeta } from "@/lib/debt-band";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Main screen ──────────────────────────────────────────────────────────────

export function DebtIntakeScreen() {
  const router = useRouter();
  const {
    selectedStressors,
    toggleStressor,
    updateStressor,
    confidenceTier,
    mode,
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
    const current = selectedStressors.find((s) => s.type === type);
    // Tapping a selected chip toggles it off — this is the missing
    // deselect path users expect after picking a sub-option.
    if (current && (current[field] as string | undefined) === optKey) {
      updateStressor(type, { [field]: undefined } as Partial<Stressor>);
      showAck(optKey);
      memory.reportAction({
        content: `User cleared ${type} context (${optKey}).`,
        event_type: "update",
        page: "intake",
        metadata: { type: "clear_context", stressor: type, context: optKey },
      }).catch(() => {});
    } else {
      updateStressor(type, { [field]: optKey } as Partial<Stressor>);
      showAck(optKey);
      memory.reportAction({
        content: `User set ${type} context to ${optKey}.`,
        event_type: "update",
        page: "intake",
        metadata: { type: "set_context", stressor: type, context: optKey },
      }).catch(() => {});
    }
  };

  const hasSelection = selectedStressors.length > 0;
  const liveScore = computeLiveScore(selectedStressors);
  const confConfig = CONFIDENCE_CONFIG.find((c) => c.tier === confidenceTier) ?? CONFIDENCE_CONFIG[0];

  const question =
    mode === "fan"
      ? "How did the match leave you?"
      : "What did you put your body through last night?";
  const questionHint =
    mode === "fan"
      ? "Log the result and how it felt · chevron to add detail"
      : "Tap to log · chevron to add detail";

  // Fan intake leads with the match itself (result, tension, scroll) before the
  // shared lifestyle stressors; see `intakeStressors`.
  const intakeDefs = intakeStressors(mode);

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      {/* Nav + live score readout */}
      <ScreenHeader
        back={{ href: "/wake-time", label: "Back" }}
        progress={{ current: 2, total: 5 }}
        right={
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
                style={{ color: "var(--color-text-faint)" }}
              >
                Live
              </span>
              <span
                className="font-mono text-base font-bold tabular-nums"
                style={{ color: bandMeta(liveScore).color }}
              >
                {liveScore}
              </span>
            </motion.div>
            <MiniOrb score={liveScore} size={32} />
          </div>
        }
      />

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
            color: "var(--color-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {question}
        </motion.h2>
        <p className="text-xs mt-1.5" style={{ color: "var(--color-text-faint)" }}>
          {questionHint}
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
              style={{ color: "var(--color-brand-primary)" }}
            >
              {ackLine.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Stressor cards */}
      {mode === "football" ? (
        <FootballStressorGrid
          selectedStressors={selectedStressors}
          onToggle={handleToggle}
          onSubOption={handleSubOption}
        />
      ) : (
        <div className="relative z-10 flex flex-col gap-2.5 flex-1">
          {intakeDefs.map((def, i) => {
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
      )}

      {/* Confidence signal */}
      <div className="relative z-10 pt-4 pb-2 flex items-center justify-center gap-2">
        <span className="text-sm" style={{ color: confConfig.color }}>{confConfig.dot}</span>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: confConfig.color }}>
          {confConfig.label}
        </span>
      </div>

      {/* CTA */}
      <div className="relative z-10 pb-10 pt-2">
        <PrimaryButton
          onClick={() => router.push("/context-deepener")}
          disabled={!hasSelection}
        >
          {hasSelection ? "Continue" : "Select what hit you"}
        </PrimaryButton>

        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-[11px] py-2.5 font-medium mt-1"
          style={{ color: "var(--color-text-faint)" }}
        >
          Skip — view dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Football two-column stressor grid ───────────────────────────────────────

function FootballStressorGrid({
  selectedStressors,
  onToggle,
  onSubOption,
}: {
  selectedStressors: Stressor[];
  onToggle: (type: StressorType) => void;
  onSubOption: (type: StressorType, field: keyof Stressor, key: string) => void;
}) {
  const all = byMode("football");
  // "Match Load" = the football-only stressors; everything else is "General".
  // Keyed by type (not the `modes` field) so restricting a general stressor to
  // specific modes never reshuffles this layout.
  const MATCH_LOAD_TYPES = new Set<StressorType>([
    "match_minutes", "card_stress", "travel_timezone", "concussion_check",
  ]);
  const general = all.filter((s) => !MATCH_LOAD_TYPES.has(s.type));
  const matchLoad = all.filter((s) => MATCH_LOAD_TYPES.has(s.type));

  return (
    <div className="relative z-10 flex flex-col gap-4 flex-1">
      <StressorSection
        label="General"
        stressors={general}
        selectedStressors={selectedStressors}
        onToggle={onToggle}
        onSubOption={onSubOption}
      />
      <StressorSection
        label="Match Load"
        stressors={matchLoad}
        selectedStressors={selectedStressors}
        onToggle={onToggle}
        onSubOption={onSubOption}
      />
    </div>
  );
}

function StressorSection({
  label,
  stressors,
  selectedStressors,
  onToggle,
  onSubOption,
}: {
  label: string;
  stressors: StressorDef[];
  selectedStressors: Stressor[];
  onToggle: (type: StressorType) => void;
  onSubOption: (type: StressorType, field: keyof Stressor, key: string) => void;
}) {
  return (
    <div>
      <p
        className="text-[9px] uppercase tracking-widest font-semibold mb-2"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {stressors.map((def, i) => {
          const stressor = selectedStressors.find((s) => s.type === def.type);
          return (
            <motion.div
              key={def.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <StressorCard
                def={def}
                stressor={stressor}
                onToggle={() => onToggle(def.type)}
                onSubOption={(field, key) => onSubOption(def.type, field, key)}
                compact
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
