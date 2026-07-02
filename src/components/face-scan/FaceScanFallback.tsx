"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, Droplets, Sparkles, Activity, ShieldCheck } from "lucide-react";
import type { FaceAnalysisResult } from "@/lib/types";

// ─── Config ──────────────────────────────────────────────────────────────────

interface FallbackField<T extends string> {
  key: keyof FaceAnalysisResult;
  label: string;
  icon: React.ReactNode;
  description: string;
  options: { value: T; label: string }[];
}

const FIELDS: FallbackField<string>[] = [
  {
    key: "periorbitalPuffiness",
    label: "Eye puffiness",
    icon: <Eye className="w-4 h-4" />,
    description: "Look in a mirror. Are your eyes or under-eye area puffy?",
    options: [
      { value: "none", label: "Not puffy" },
      { value: "mild", label: "Slightly puffy" },
      { value: "moderate", label: "Moderately puffy" },
      { value: "severe", label: "Very puffy" },
    ],
  },
  {
    key: "skinPerfusion",
    label: "Skin tone",
    icon: <Droplets className="w-4 h-4" />,
    description: "Does your skin look paler or more flushed than usual?",
    options: [
      { value: "good", label: "Normal" },
      { value: "low", label: "Pale / washed out" },
      { value: "very_low", label: "Very pale" },
    ],
  },
  {
    key: "eyeClarity",
    label: "Eye clarity",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Do your eyes look clear or tired/bloodshot?",
    options: [
      { value: "clear", label: "Clear" },
      { value: "fatigued", label: "Tired / bloodshot" },
      { value: "very_fatigued", label: "Very tired" },
    ],
  },
  {
    key: "inflammation",
    label: "Inflammation",
    icon: <Activity className="w-4 h-4" />,
    description: "Any visible redness, swelling, or skin irritation?",
    options: [
      { value: "none", label: "None" },
      { value: "mild", label: "Slight redness" },
      { value: "moderate", label: "Noticeable" },
      { value: "severe", label: "Significant" },
    ],
  },
];

const DEFAULT_SUMMARY = "Manual self-assessment (face scan unavailable).";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDebtContribution(values: Record<string, string>): number {
  let total = 0;
  if (values.periorbitalPuffiness === "mild") total += 3;
  if (values.periorbitalPuffiness === "moderate") total += 6;
  if (values.periorbitalPuffiness === "severe") total += 10;
  if (values.skinPerfusion === "low") total += 4;
  if (values.skinPerfusion === "very_low") total += 8;
  if (values.eyeClarity === "fatigued") total += 4;
  if (values.eyeClarity === "very_fatigued") total += 8;
  if (values.inflammation === "mild") total += 2;
  if (values.inflammation === "moderate") total += 5;
  if (values.inflammation === "severe") total += 9;
  return Math.min(total, 25);
}

function buildFaceAnalysis(values: Record<string, string>): FaceAnalysisResult {
  const debtContribution = computeDebtContribution(values);
  return {
    periorbitalPuffiness: (values.periorbitalPuffiness || "unmeasured") as FaceAnalysisResult["periorbitalPuffiness"],
    skinPerfusion: (values.skinPerfusion || "good") as FaceAnalysisResult["skinPerfusion"],
    eyeClarity: (values.eyeClarity || "clear") as FaceAnalysisResult["eyeClarity"],
    inflammation: (values.inflammation || "none") as FaceAnalysisResult["inflammation"],
    debtContribution,
    summary: DEFAULT_SUMMARY,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface FaceScanFallbackProps {
  onSubmit: (result: FaceAnalysisResult) => void;
  onSkip: () => void;
}

export function FaceScanFallback({ onSubmit, onSkip }: FaceScanFallbackProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const selectedCount = Object.keys(values).length;
  const allSelected = selectedCount === FIELDS.length;

  const setValue = (key: string, value: string) => {
    // Tapping the same value deselects it
    if (values[key] === value) {
      setValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setValues((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = () => {
    const result = buildFaceAnalysis(values);
    onSubmit(result);
  };

  return (
    <div className="relative z-10 flex-1 flex flex-col pb-10">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4" style={{ color: "var(--color-states-warning)" }} />
          <h2
            className="font-normal leading-snug"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.1rem, 5vw, 1.35rem)",
              color: "var(--color-text-primary)",
            }}
          >
            Camera-based scan unavailable
          </h2>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          The face detection model couldn&apos;t load. Answer a few quick questions
          about how you look right now — this approximates what the camera would
          detect, all on-device.
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4 flex-1">
        {FIELDS.map((field, fi) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: fi * 0.06 }}
            className="rounded-2xl p-4"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: values[field.key]
                ? "1.5px solid rgba(234,88,12,0.35)"
                : "1px solid rgba(168,162,158,0.1)",
              transition: "border-color 0.2s",
            }}
          >
            {/* Field header */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: values[field.key]
                    ? "rgba(234,88,12,0.18)"
                    : "rgba(168,162,158,0.08)",
                  color: values[field.key]
                    ? "var(--color-brand-primary)"
                    : "var(--color-text-faint)",
                }}
              >
                {field.icon}
              </span>
              <div>
                <span
                  className="text-[10px] font-semibold block"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {field.label}
                </span>
                <span
                  className="text-[8px]"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {field.description}
                </span>
              </div>
            </div>

            {/* Option chips */}
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((opt) => {
                const isSelected = values[field.key] === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setValue(field.key, opt.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: isSelected
                        ? "rgba(234,88,12,0.2)"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        isSelected
                          ? "rgba(234,88,12,0.5)"
                          : "var(--color-border-default)"
                      }`,
                      color: isSelected
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                      minHeight: 30,
                    }}
                  >
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selection count & submit row */}
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid rgba(74,222,128,0.12)",
          }}
        >
          <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-states-success)" }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {selectedCount === 0
              ? "Select at least one option above to proceed."
              : allSelected
                ? "All fields assessed. Tap submit to continue."
                : `${selectedCount} of ${FIELDS.length} fields assessed. Facial signal will be approximate.`}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={selectedCount === 0}
          className="w-full font-semibold text-sm rounded-2xl transition-opacity"
          style={{
            backgroundColor: "var(--color-brand-primary)",
            color: "var(--color-text-primary)",
            minHeight: 52,
            opacity: selectedCount === 0 ? 0.4 : 1,
          }}
        >
          {selectedCount === 0
            ? "Select an option to continue"
            : "Submit self-assessment"}
        </motion.button>

        <button
          onClick={onSkip}
          className="w-full text-center text-[13px] py-2.5 font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Skip — continue with intake only
        </button>
      </div>
    </div>
  );
}
