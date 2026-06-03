"use client";

export function HRVDeltaBar({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  const isBad = pct <= -20;
  const color = isBad ? "#DC2626" : pct <= -10 ? "#EA580C" : "#4ADE80";
  const baseW = Math.max(10, 100 - abs);
  const obsW  = Math.min(90, abs);
  return (
    <div className="space-y-2 mt-3">
      <div className="flex justify-between text-[9px] uppercase tracking-widest font-mono" style={{ color: "#3a3835" }}>
        <span>Baseline</span>
        <span>Observed</span>
      </div>
      <div className="h-6 w-full rounded-lg flex overflow-hidden" style={{ backgroundColor: "#0A0A0B", border: "1px solid rgba(168,162,158,0.1)" }}>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${baseW}%`, backgroundColor: "rgba(74,222,128,0.18)", color: "#4ADE80" }}>
          base
        </div>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${obsW}%`, backgroundColor: color, color: "#fff" }}>
          {pct > 0 ? `+${pct}%` : `${pct}%`}
        </div>
      </div>
    </div>
  );
}
