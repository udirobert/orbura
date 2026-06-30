"use client";

export function HRVDeltaBar({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  const isBad = pct <= -20;
  const color = isBad ? "var(--color-states-error)" : pct <= -10 ? "var(--color-brand-primary)" : "var(--color-states-success)";
  const baseW = Math.max(10, 100 - abs);
  const obsW  = Math.min(90, abs);
  return (
    <div className="space-y-2 mt-3">
      <div className="flex justify-between text-[9px] uppercase tracking-widest font-mono" style={{ color: "var(--color-text-disabled)" }}>
        <span>Baseline</span>
        <span>Observed</span>
      </div>
      <div className="h-6 w-full rounded-lg flex overflow-hidden" style={{ backgroundColor: "var(--color-bg-base)", border: "1px solid var(--color-border-subtle)" }}>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${baseW}%`, backgroundColor: "rgba(74,222,128,0.18)", color: "var(--color-states-success)" }}>
          base
        </div>
        <div className="h-full flex items-center justify-center font-mono text-[9px] font-bold"
          style={{ width: `${obsW}%`, backgroundColor: color, color: "var(--color-text-primary)" }}>
          {pct > 0 ? `+${pct}%` : `${pct}%`}
        </div>
      </div>
    </div>
  );
}
