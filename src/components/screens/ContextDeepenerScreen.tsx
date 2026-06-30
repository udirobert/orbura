"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import type { Stressor, StressorType } from "@/lib/types";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { STRESSORS, type StressorDef, type SubOption } from "@/stressors";

type Question = {
  stressorType: StressorType;
  field: keyof Stressor;
  question: string;
  options: SubOption[];
  currentValue: string | undefined;
};

interface StressorSummary {
  def: StressorDef;
  questions: Question[];
  /** Display string summarising the answered detail, e.g. "Beer · 1–2" or "Need detail". */
  detail: string;
  /** True if every expansion field has a value. */
  isComplete: boolean;
}

function buildSummaries(stressors: Stressor[]): StressorSummary[] {
  return stressors
    .map((s) => {
      const def = STRESSORS.find((d) => d.type === s.type);
      if (!def) return null;
      const questions: Question[] = (def.expansions ?? []).map((exp) => ({
        stressorType: s.type,
        field: exp.field,
        question: exp.question,
        options: exp.options,
        currentValue: s[exp.field] as string | undefined,
      }));
      const detail =
        questions.length === 0
          ? "Logged"
          : questions
              .filter((q) => q.currentValue)
              .map((q) => q.options.find((o) => o.key === q.currentValue)?.label ?? q.currentValue)
              .join(" · ") || "Need detail";
      const isComplete = questions.length === 0 || questions.every((q) => q.currentValue);
      return { def, questions, detail, isComplete };
    })
    .filter(Boolean) as StressorSummary[];
}

export function ContextDeepenerScreen() {
  const router = useRouter();
  const { selectedStressors, updateStressor } = useBodyDebtStore();

  // Id of the question currently being edited. null = show the next pending.
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // If the user landed here with nothing selected (via skip path), redirect.
  useEffect(() => {
    if (selectedStressors.length === 0) {
      router.replace("/face-scan");
    }
  }, [selectedStressors, router]);

  const summaries = useMemo(() => buildSummaries(selectedStressors), [selectedStressors]);
  const totalAnswered = summaries.filter((s) => s.isComplete).length;
  const allAnswered = summaries.length > 0 && totalAnswered === summaries.length;

  // The currently active question — either the one being edited, or the
  // first unanswered one. null when all are complete (review state).
  const activeQuestion: Question | null = useMemo(() => {
    if (editingKey !== null) {
      for (const s of summaries) {
        for (const q of s.questions) {
          if (`${q.stressorType}__${String(q.field)}` === editingKey) return q;
        }
      }
    }
    for (const s of summaries) {
      for (const q of s.questions) {
        if (!q.currentValue) return q;
      }
    }
    return null;
  }, [editingKey, summaries]);

  const activeSummary: StressorSummary | null = useMemo(() => {
    if (!activeQuestion) return null;
    return summaries.find((s) => s.def.type === activeQuestion.stressorType) ?? null;
  }, [activeQuestion, summaries]);

  const handleSelectOption = (q: Question, optKey: string) => {
    updateStressor(q.stressorType, { [q.field]: optKey } as Partial<Stressor>);
    memory.reportAction({
      content: `User provided context for ${q.stressorType}: ${optKey}.`,
      event_type: "update",
      page: "context-deepener",
      metadata: { type: "provide_context", stressor: q.stressorType, context: optKey, field: String(q.field) },
    }).catch(() => {});
    setEditingKey(null);
  };

  const handleSkip = () => {
    // Skip = don't set the field. The stressor stays with no detail for
    // this question and the next pending question is shown.
    setEditingKey(null);
  };

  const handleEditStressor = (s: StressorSummary) => {
    // Jump to the first unanswered question for this stressor; if all
    // are answered, jump to the first one (so the user can re-tap).
    const first = s.questions.find((q) => !q.currentValue) ?? s.questions[0];
    if (first) setEditingKey(`${first.stressorType}__${String(first.field)}`);
  };

  return (
    <div
      className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <ScreenHeader
        back={{ href: "/intake", label: "Back" }}
        progress={{ current: 3, total: 5 }}
      />

      <div className="relative z-10 flex-1 flex flex-col pt-2">
        {/* Top panel — carry-over from intake. "What we've got". */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-[9px] font-mono uppercase tracking-widest"
              style={{ color: "var(--color-text-faint)" }}
            >
              What we&apos;ve got
            </span>
            <span
              className="text-[9px] font-mono"
              style={{ color: totalAnswered === summaries.length ? "var(--color-states-success)" : "var(--color-text-secondary)" }}
            >
              {totalAnswered} of {summaries.length} with detail
            </span>
          </div>
          <div className="space-y-1">
            {summaries.map((s) => {
              const isActiveSummary = activeSummary?.def.type === s.def.type;
              const isInteractive = s.questions.length > 0;
              return (
                <button
                  key={s.def.type}
                  onClick={() => isInteractive && handleEditStressor(s)}
                  disabled={!isInteractive}
                  className="w-full flex items-center gap-3 py-2 px-2 rounded-lg text-left transition-colors"
                  style={{
                    backgroundColor: isActiveSummary ? "rgba(234,88,12,0.08)" : "transparent",
                    cursor: isInteractive ? "pointer" : "default",
                  }}
                >
                  <span className="text-base flex-shrink-0">{s.def.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {s.def.label}
                    </div>
                    <div
                      className="text-[10px] mt-0.5 truncate"
                      style={{
                        color: s.isComplete ? "var(--color-text-secondary)" : "var(--color-states-warning)",
                      }}
                    >
                      {s.detail}
                    </div>
                  </div>
                  {s.isComplete ? (
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "var(--color-states-success)" }}
                    />
                  ) : isInteractive ? (
                    <ChevronRight
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "var(--color-text-faint)" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active question OR review state */}
        {activeQuestion && activeSummary ? (
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={editingKey ?? `${activeQuestion.stressorType}__${String(activeQuestion.field)}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex-1"
              >
                <div className="text-center px-2 mb-5 pt-2">
                  <div className="text-3xl mb-2">{activeSummary.def.icon}</div>
                  <h2
                    className="text-lg font-normal"
                    style={{
                      fontFamily: "var(--font-heading)",
                      color: "var(--color-text-primary)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {activeQuestion.question}
                  </h2>
                  <p
                    className="text-[10px] mt-1.5 font-medium"
                    style={{ color: "var(--color-text-faint)" }}
                  >
                    For {activeSummary.def.label.toLowerCase()} · tap to choose
                  </p>
                </div>
                <div
                  className={
                    activeQuestion.options.length >= 3
                      ? "grid grid-cols-2 gap-2"
                      : "flex flex-col gap-2"
                  }
                >
                  {activeQuestion.options.map((opt) => {
                    const isSelected = activeQuestion.currentValue === opt.key;
                    return (
                      <motion.button
                        key={opt.key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSelectOption(activeQuestion, opt.key)}
                        className="flex justify-between items-center px-4 py-3 rounded-xl text-left"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(74,222,128,0.1)"
                            : "var(--color-bg-surface)",
                          border: `1.5px solid ${
                            isSelected
                              ? "rgba(74,222,128,0.5)"
                              : "rgba(168,162,158,0.12)"
                          }`,
                          color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                          minHeight: "56px",
                          fontSize: "14px",
                          fontWeight: 600,
                          transition: "all 0.2s",
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: "var(--color-states-success)" }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
            {/* Skip link */}
            <div className="text-center pb-2 pt-5">
              <button
                onClick={handleSkip}
                className="text-[11px] font-medium px-3 py-2"
                style={{ color: "var(--color-text-faint)" }}
              >
                Skip · accept default
              </button>
            </div>
          </div>
        ) : allAnswered ? (
          /* Review state — all questions answered. */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                background: "rgba(74,222,128,0.1)",
                border: "1.5px solid rgba(74,222,128,0.3)",
              }}
            >
              <Check className="w-8 h-8" style={{ color: "var(--color-states-success)" }} />
            </motion.div>
            <h2
              className="text-xl font-normal mb-2"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-text-primary)",
              }}
            >
              Your picture is clear
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              All stressors secured. Ready to check your face.
            </p>
          </div>
        ) : null}
      </div>

      {/* CTA — only in review state */}
      {allAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 pb-10 pt-4"
        >
          <PrimaryButton size="md" onClick={() => router.push("/face-scan")}>
            Continue — face check
          </PrimaryButton>
        </motion.div>
      )}
    </div>
  );
}
