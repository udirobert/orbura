"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { HRVDeltaBar } from "./hrv-delta-bar";
import { SOURCE_META } from "./hrv-config";
import type { HRVData } from "@/lib/types";

export function ConnectedPanel({ data, onContinue }: { data: HRVData; onContinue: () => void }) {
  const meta = SOURCE_META[data.source ?? "manual_proxy"];
  const isBad = (data.hrvDeltaPercent ?? 0) <= -20;
  const orbColor = isBad ? "#DC2626" : data.hrvDeltaPercent <= -10 ? "#EA580C" : "#4ADE80";

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
      <div className="rounded-2xl p-5" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.1)" }}>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#A8A29E" }}>Last night</span>
        <div className="py-2 font-normal leading-none" style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", color: orbColor }}>
          {data.hrvDeltaPercent > 0 ? `+${data.hrvDeltaPercent}` : data.hrvDeltaPercent}%
        </div>
        <p className="text-xs" style={{ color: "#A8A29E" }}>
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
              { label: "Deep",  val: data.sleepStages.deep,  color: "#EA580C" },
              { label: "REM",   val: data.sleepStages.rem,   color: "#F59E0B" },
              { label: "Light", val: data.sleepStages.light, color: "#A8A29E" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: "#0A0A0B" }}>
                <div className="text-[9px] uppercase tracking-widest" style={{ color: "#3a3835" }}>{s.label}</div>
                <div className="text-xs font-mono font-bold mt-0.5" style={{ color: s.color }}>{s.val}m</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <motion.button whileTap={{ scale: 0.98 }} onClick={onContinue}
        className="w-full font-semibold text-sm rounded-2xl"
        style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: "58px" }}>
        Calculate my full score
      </motion.button>
    </motion.div>
  );
}
