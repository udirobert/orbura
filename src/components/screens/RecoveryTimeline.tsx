"use client";

import { motion } from "framer-motion";

interface RecoveryArc {
  dangerEnds: string;
  partialEnds: string;
  clearedAt: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "—";
  }
}

function hoursUntil(iso: string): number {
  return Math.max(0, (new Date(iso).getTime() - Date.now()) / 3600000);
}

export function RecoveryTimeline({ arc }: { arc: RecoveryArc }) {
  const dangerH = hoursUntil(arc.dangerEnds);
  const partialH = hoursUntil(arc.partialEnds);
  const clearedH = hoursUntil(arc.clearedAt);
  const totalH = Math.max(clearedH || dangerH || partialH || 1, 1);

  const dangerPct = totalH > 0 ? Math.max(5, (dangerH / totalH) * 100) : 100;
  const partialPct = totalH > 0 ? Math.max(5, ((partialH - dangerH) / totalH) * 100) : 0;
  const clearedPct = totalH > 0 ? Math.max(5, ((clearedH - partialH) / totalH) * 100) : 0;

  return (
    <motion.div
      className="rounded-2xl p-4"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.1)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--color-text-faint)" }}>
        Recovery Timeline
      </p>

      {/* Progress bar with segments */}
      <div className="relative h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: "rgba(168,162,158,0.06)" }}>
        <motion.div
          className="h-full"
          style={{ width: `${dangerPct}%`, background: "linear-gradient(90deg, var(--color-states-error), var(--color-brand-primary))" }}
          initial={{ width: 0 }}
          animate={{ width: `${dangerPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.div
          className="h-full"
          style={{ width: `${partialPct}%`, background: "linear-gradient(90deg, var(--color-brand-primary), var(--color-states-warning))" }}
          initial={{ width: 0 }}
          animate={{ width: `${partialPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        />
        <motion.div
          className="h-full"
          style={{ width: `${clearedPct}%`, background: "linear-gradient(90deg, var(--color-states-warning), var(--color-states-success))" }}
          initial={{ width: 0 }}
          animate={{ width: `${clearedPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color: "var(--color-states-error)" }}
        >
          🔴 {formatTime(arc.dangerEnds)}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ color: "var(--color-states-warning)" }}
        >
          🟡 {formatTime(arc.partialEnds)}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{ color: "var(--color-states-success)" }}
        >
          🟢 {formatTime(arc.clearedAt)}
        </motion.span>
      </div>

      {/* Phase labels */}
      <div className="flex justify-between mt-1 text-[8px] uppercase tracking-wider" style={{ color: "var(--color-text-disabled)" }}>
        <span>Danger zone</span>
        <span>Recovering</span>
        <span>Cleared</span>
      </div>
    </motion.div>
  );
}
