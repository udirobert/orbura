"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { HRVDeltaBar } from "./hrv-delta-bar";
import { SOURCE_META } from "./hrv-config";
import type { HRVData } from "@/lib/types";

export function ConnectedPanel({ data, onContinue }: { data: HRVData; onContinue: () => void }) {
  const meta = SOURCE_META[data.source ?? "manual_proxy"];
  const isBad = (data.hrvDeltaPercent ?? 0) <= -20;
  const orbColor = isBad ? "var(--color-states-error)" : data.hrvDeltaPercent <= -10 ? "var(--color-brand-primary)" : "var(--color-states-success)";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      {/* Source badge */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" style={{ color: meta.color }} />
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {/* Delta card */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-secondary)" }}>Last night</span>
        <div className="py-2 font-normal leading-none" style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", color: orbColor }}>
          {data.hrvDeltaPercent > 0 ? `+${data.hrvDeltaPercent}` : data.hrvDeltaPercent}%
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {isBad
            ? "Your nervous system is still in recovery. This will factor into your prescription."
            : data.hrvDeltaPercent <= -10
            ? "Slightly below baseline — your body is processing something."
            : "Close to baseline. Recovery looking reasonable."}
        </p>
        <HRVDeltaBar pct={data.hrvDeltaPercent} />

        {data.sleepStages && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Deep",  val: data.sleepStages.deep,  color: "var(--color-brand-primary)" },
              { label: "REM",   val: data.sleepStages.rem,   color: "var(--color-states-warning)" },
              { label: "Light", val: data.sleepStages.light, color: "var(--color-text-secondary)" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: "var(--color-bg-base)" }}>
                <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-disabled)" }}>{s.label}</div>
                <div className="text-xs font-mono font-bold mt-0.5" style={{ color: s.color }}>{s.val}m</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} onClick={onContinue}
        className="w-full font-semibold text-sm rounded-2xl"
        style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-body)", minHeight: "58px" }}>
        Calculate my full score
      </motion.button>
    </motion.div>
  );
}
