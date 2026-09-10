"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { HRVDeltaBar } from "./hrv-delta-bar";
import { SOURCE_META } from "./hrv-config";
import type { HRVData } from "@/lib/types";

export function ConnectedPanel({ data, onContinue }: { data: HRVData; onContinue: () => void }) {
  const meta = SOURCE_META[data.source ?? "manual_proxy"];
  const isBad = (data.hrvDeltaPercent ?? 0) <= -20;
  const isWarning = (data.hrvDeltaPercent ?? 0) <= -10;

  const orbColor = isBad
    ? "var(--color-states-error)"
    : isWarning
    ? "var(--color-brand-primary)"
    : "var(--color-states-success)";

  const confidenceColor =
    data.confidence === "high"
      ? "var(--color-states-success)"
      : data.confidence === "low"
      ? "var(--color-states-error)"
      : "var(--color-states-warning)";

  const currentHrv =
    data.baselineHrv != null
      ? Math.round(data.baselineHrv * (1 + (data.hrvDeltaPercent ?? 0) / 100))
      : null;
  const currentHr =
    data.baselineHr != null
      ? Math.round(data.baselineHr + (data.restingHrDelta ?? 0))
      : null;

  const baselineHrv = data.baselineHrv != null ? Math.round(data.baselineHrv) : null;
  const baselineHr = data.baselineHr != null ? Math.round(data.baselineHr) : null;

  const delta = data.hrvDeltaPercent ?? 0;
  const baselineLabel = `${baselineHrv ?? 65} ms`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Source + confidence badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <CheckCircle2 className="w-4 h-4" style={{ color: meta.color }} />
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
        {data.confidence && (
          <span
            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{
              color: confidenceColor,
              backgroundColor: `color-mix(in srgb, ${confidenceColor} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${confidenceColor} 20%, transparent)`,
            }}
          >
            {data.confidence} confidence
          </span>
        )}
      </div>

      {/* Delta card */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Last night
        </span>
        <div
          className="py-2 font-normal leading-none"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "2.5rem",
            color: orbColor,
          }}
        >
          {data.hrvDeltaPercent > 0 ? `+${data.hrvDeltaPercent}` : data.hrvDeltaPercent}%
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {isBad
            ? `Your HRV is ${Math.abs(delta)}% below your baseline of ${baselineLabel}. Your nervous system is still in recovery.`
            : isWarning
            ? `HRV is ${Math.abs(delta)}% below your ${baselineLabel} baseline — your body is processing something.`
            : `Close to your ${baselineLabel} baseline. Recovery is looking reasonable.`}
        </p>
        <HRVDeltaBar pct={data.hrvDeltaPercent} />

        {/* Current vs baseline metrics */}
        {(currentHrv != null || currentHr != null) && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {currentHrv != null && (
              <div
                className="rounded-xl px-2 py-2 text-center"
                style={{ backgroundColor: "var(--color-bg-base)" }}
              >
                <div
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--color-text-disabled)" }}
                >
                  HRV
                </div>
                <div
                  className="text-xs font-mono font-bold mt-0.5"
                  style={{ color: orbColor }}
                >
                  {currentHrv} ms
                </div>
                <div
                  className="text-[9px] font-mono"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  baseline {baselineHrv} ms
                </div>
              </div>
            )}
            {currentHr != null && (
              <div
                className="rounded-xl px-2 py-2 text-center"
                style={{ backgroundColor: "var(--color-bg-base)" }}
              >
                <div
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--color-text-disabled)" }}
                >
                  Resting HR
                </div>
                <div
                  className="text-xs font-mono font-bold mt-0.5"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {currentHr} bpm
                </div>
                <div
                  className="text-[9px] font-mono"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  baseline {baselineHr} bpm
                </div>
              </div>
            )}
          </div>
        )}

        {data.sleepStages && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Deep", val: data.sleepStages.deep, color: "var(--color-brand-primary)" },
              { label: "REM", val: data.sleepStages.rem, color: "var(--color-states-warning)" },
              { label: "Light", val: data.sleepStages.light, color: "var(--color-text-secondary)" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-2 py-2 text-center"
                style={{ backgroundColor: "var(--color-bg-base)" }}
              >
                <div
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--color-text-disabled)" }}
                >
                  {s.label}
                </div>
                <div
                  className="text-xs font-mono font-bold mt-0.5"
                  style={{ color: s.color }}
                >
                  {s.val}m
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full font-semibold text-sm rounded-2xl"
        style={{
          backgroundColor: "var(--color-brand-primary)",
          color: "var(--color-text-primary)",
          fontFamily: "var(--font-body)",
          minHeight: "58px",
        }}
      >
        Calculate my full score
      </motion.button>
    </motion.div>
  );
}
