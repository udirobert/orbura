"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import type { StressorType } from "@/lib/types";
import { MiniOrb } from "@/components/MiniOrb";
import { ProgressBar } from "@/components/ProgressBar";

interface Question {
  type: StressorType;
  icon: string;
  label: string;
  options: { value: string; label: string; points: number }[];
}

const QUESTIONS: Question[] = [
  {
    type: "alcohol",
    icon: "🍺",
    label: "How many drinks?",
    options: [
      { value: "1-2 drinks",  label: "1–2",        points: 14 },
      { value: "3-4 drinks",  label: "3–4",        points: 22 },
      { value: "5+ drinks",   label: "5+",         points: 32 },
      { value: "Lost count",  label: "Lost count", points: 38 },
    ],
  },
  {
    type: "sleep",
    icon: "😴",
    label: "How many hours?",
    options: [
      { value: "Under 4hrs", label: "Under 4", points: 28 },
      { value: "4-6hrs",     label: "4–6 hrs", points: 20 },
      { value: "6-7hrs",     label: "6–7 hrs", points: 12 },
    ],
  },
  {
    type: "training",
    icon: "💪",
    label: "How hard?",
    options: [
      { value: "Easy",          label: "Light",     points: 8  },
      { value: "Moderate",      label: "Moderate",  points: 14 },
      { value: "Destroyed me",  label: "Crushed it", points: 22 },
    ],
  },
  {
    type: "stress",
    icon: "😤",
    label: "Still carrying it?",
    options: [
      { value: "Yes, still carrying it", label: "Still there", points: 18 },
      { value: "Mostly gone",            label: "Mostly gone", points: 8  },
    ],
  },
  {
    type: "ill",
    icon: "🤒",
    label: "How bad?",
    options: [
      { value: "Mild — just off",          label: "Mild",     points: 18 },
      { value: "Moderate — can function",  label: "Moderate", points: 25 },
      { value: "Bad — barely moving",      label: "Rough",    points: 35 },
    ],
  },
];

export function ContextDeepenerScreen() {
  const router = useRouter();
  const { selectedStressors, updateStressorContext } = useBodyDebtStore();

  // If no stressors selected (e.g. via skip path), redirect to face scan
  useEffect(() => {
    if (selectedStressors.length === 0) {
      router.replace("/face-scan");
    }
  }, [selectedStressors, router]);

  const activeQuestions = QUESTIONS.filter((q) =>
    selectedStressors.some((s) => s.type === q.type)
  );

  const getSelected = (type: StressorType) =>
    selectedStressors.find((s) => s.type === type)?.context ?? null;

  const totalPoints = selectedStressors.reduce((acc, s) => {
    const q = QUESTIONS.find((q2) => q2.type === s.type);
    if (!q) return acc;
    const opt = q.options.find((o) => o.value === s.context);
    return acc + (opt?.points ?? q.options[Math.floor(q.options.length / 2)]?.points ?? 0);
  }, 0);
  const clampedPoints = Math.min(100, Math.max(0, totalPoints));

  const scoreColor =
    clampedPoints >= 61 ? "#DC2626" : clampedPoints >= 41 ? "#EA580C" : "#F59E0B";

  const scoreVerb =
    clampedPoints >= 61 ? "This is significant" :
    clampedPoints >= 41 ? "Above baseline" :
    "Below threshold";

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Orb + interview question */}
      <div className="relative z-10 flex flex-col items-center pt-14 pb-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-4"
        >
          <MiniOrb score={clampedPoints} size={44} />
        </motion.div>

        <h2
          className="font-normal text-center leading-snug px-6"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.4rem, 5.5vw, 1.75rem)",
            color: "#F5F5F4",
            letterSpacing: "-0.01em",
          }}
        >
          A bit more detail.
        </h2>
        <p className="text-xs mt-1.5 font-medium" style={{ color: "#524F4C" }}>
          One tap per answer
        </p>
      </div>

      {/* Progress */}
      <div className="relative z-10 pb-4">
        <ProgressBar current={3} total={5} />
      </div>

      {/* Questions */}
      <div className="relative z-10 flex flex-col gap-6 flex-1">
        {activeQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-center" style={{ color: "#524F4C" }}>
              No stressors selected. Go back and pick what hit you.
            </p>
            <button
              onClick={() => router.push("/intake")}
              className="text-[11px] font-semibold uppercase tracking-wider px-4 py-3 rounded-xl"
              style={{ backgroundColor: "#141416", color: "#A8A29E", border: "1px solid rgba(168,162,158,0.15)" }}
            >
              Go back
            </button>
          </div>
        ) : (
          activeQuestions.map((q, gi) => {
            const selected = getSelected(q.type);
            return (
              <motion.div
                key={q.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.08 }}
                className="space-y-2.5"
              >
                {/* Question label */}
                <div className="flex items-center gap-2">
                  <span className="text-base">{q.icon}</span>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: "#F5F5F4" }}
                  >
                    {q.label}
                  </h3>
                </div>
                {/* Option grid */}
                <div className={q.options.length >= 3 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
                  {q.options.map((opt) => {
                    const chosen = selected === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
                          updateStressorContext(q.type, opt.value);
                          memory.reportAction({
                            content: `User provided context for ${q.type}: ${opt.value}.`,
                            event_type: "update",
                            page: "context-deepener",
                            metadata: { type: "provide_context", stressor: q.type, context: opt.value },
                          }).catch(() => {});
                        }}
                        className="flex justify-between items-center px-4 rounded-xl transition-all text-left"
                        style={{
                          minHeight: "52px",
                          fontSize: "15px",
                          fontWeight: 600,
                          backgroundColor: chosen ? "rgba(234,88,12,0.1)" : "#141416",
                          border: `1.5px solid ${chosen ? "rgba(234,88,12,0.55)" : "rgba(168,162,158,0.12)"}`,
                          color: chosen ? "#F5F5F4" : "#A8A29E",
                        }}
                      >
                        <span>{opt.label}</span>
                        <span
                          className="text-[10px] font-mono ml-2 flex-shrink-0"
                          style={{ color: chosen ? "#EA580C" : "#3a3835" }}
                        >
                          +{opt.points}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Live debt score */}
      <div
        className="relative z-10 rounded-2xl p-4 mt-5"
        style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}
      >
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold block" style={{ color: "#A8A29E" }}>
              Running total
            </span>
            <span className="text-xs mt-0.5 font-medium" style={{ color: scoreColor }}>
              {scoreVerb}
            </span>
          </div>
          <div className="text-right">
            <motion.div
              key={clampedPoints}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold font-mono leading-none"
              style={{ color: "#EA580C" }}
            >
              {clampedPoints}
            </motion.div>
            <span className="text-[8px] uppercase tracking-widest font-mono block mt-0.5" style={{ color: "#3a3835" }}>
              PTS
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative z-10 pb-10 pt-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/face-scan")}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{
            backgroundColor: "#EA580C",
            color: "#F5F5F4",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
          }}
        >
          Next — face check
        </motion.button>
      </div>
    </div>
  );
}
