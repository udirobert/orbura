"use client";

import { useMemo } from "react";
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

function formatHours(hours: number): string {
  if (hours >= 24) {
    const days = Math.round(hours / 24);
    return `${days}d`;
  }
  if (hours >= 1) {
    return `${Math.round(hours * 2) / 2}h`; // round to 0.5
  }
  if (hours > 0) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  return "now";
}

type Phase = "danger" | "recovering" | "cleared";

const PHASE_META: Record<Phase, { color: string; label: string; badgeBg: string }> = {
  danger:     { color: "var(--color-states-error)",   label: "Danger zone",    badgeBg: "rgba(220,38,38,0.08)" },
  recovering: { color: "var(--color-states-warning)", label: "Recovering",     badgeBg: "rgba(245,158,11,0.08)" },
  cleared:    { color: "var(--color-states-success)", label: "Cleared",        badgeBg: "rgba(74,222,128,0.08)" },
};

export function RecoveryTimeline({ arc }: { arc: RecoveryArc }) {
  const calc = useMemo(() => {
    const dangerH = hoursUntil(arc.dangerEnds);
    const partialH = hoursUntil(arc.partialEnds);
    const clearedH = hoursUntil(arc.clearedAt);
    const totalH = Math.max(clearedH || dangerH || partialH || 1, 1);

    const dangerPct = totalH > 0 ? Math.max(5, (dangerH / totalH) * 100) : 100;
    const partialPct = totalH > 0 ? Math.max(5, ((partialH - dangerH) / totalH) * 100) : 0;
    const clearedPct = totalH > 0 ? Math.max(5, ((clearedH - partialH) / totalH) * 100) : 0;

    // Determine current phase
    const now = new Date();
    let currentPhase: Phase = "cleared";
    if (now < new Date(arc.dangerEnds)) currentPhase = "danger";
    else if (now < new Date(arc.partialEnds)) currentPhase = "recovering";

    return {
      segments: [
        { phase: "danger" as Phase,     hours: dangerH,  pct: dangerPct,  endsAt: arc.dangerEnds },
        { phase: "recovering" as Phase, hours: partialH, pct: partialPct, endsAt: arc.partialEnds },
        { phase: "cleared" as Phase,    hours: clearedH, pct: clearedPct, endsAt: arc.clearedAt },
      ],
      currentPhase,
      allCleared: clearedH <= 0 && partialH <= 0 && dangerH <= 0,
    };
  }, [arc.dangerEnds, arc.partialEnds, arc.clearedAt]);

  const { segments, currentPhase, allCleared } = calc;

  return (
    <motion.div
      className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.1)" }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header with current phase badge */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-mono uppercase tracking-widest font-semibold" style={{ color: "var(--color-text-faint)" }}>
          Recovery Timeline
        </p>
        {allCleared ? (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider"
            style={{ backgroundColor: PHASE_META.cleared.badgeBg, color: PHASE_META.cleared.color, border: `1px solid ${PHASE_META.cleared.color}22` }}
          >
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: PHASE_META.cleared.color }} />
            All clear
          </span>
        ) : (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider"
            style={{ backgroundColor: PHASE_META[currentPhase].badgeBg, color: PHASE_META[currentPhase].color, border: `1px solid ${PHASE_META[currentPhase].color}22` }}
          >
            <motion.span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: PHASE_META[currentPhase].color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {PHASE_META[currentPhase].label}
          </span>
        )}
      </div>

      {/* Progress bar with segments */}
      <div className="relative h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: "rgba(168,162,158,0.06)" }}>
        {segments.map((seg, i) => (
          <motion.div
            key={seg.phase}
            className="h-full relative"
            style={{
              width: `${seg.pct}%`,
              background:
                seg.phase === "danger"
                  ? "linear-gradient(90deg, var(--color-states-error), var(--color-brand-primary))"
                  : seg.phase === "recovering"
                  ? "linear-gradient(90deg, var(--color-brand-primary), var(--color-states-warning))"
                  : "linear-gradient(90deg, var(--color-states-warning), var(--color-states-success))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${seg.pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.15 }}
          >
            {/* Active phase pulse overlay */}
            {seg.phase === currentPhase && !allCleared && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Phase rows — time + remaining hours */}
      <div className="space-y-1.5">
        {segments.map((seg, i) => {
          const meta = PHASE_META[seg.phase];
          const isActive = seg.phase === currentPhase && !allCleared;
          return (
            <motion.div
              key={seg.phase}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-2"
            >
              {/* Status dot */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isActive ? meta.color : "rgba(168,162,158,0.15)",
                  boxShadow: isActive ? `0 0 6px ${meta.color}44` : "none",
                }}
              />
              {/* Phase label */}
              <span
                className="text-[10px] font-semibold flex-1"
                style={{ color: isActive ? meta.color : "var(--color-text-faint)" }}
              >
                {meta.label}
              </span>
              {/* Time */}
              <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                {formatTime(seg.endsAt)}
              </span>
              {/* Hours remaining */}
              {seg.hours > 0 && (
                <span
                  className="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: isActive ? `${meta.color}12` : "rgba(168,162,158,0.04)",
                    color: isActive ? meta.color : "var(--color-text-disabled)",
                    minWidth: 40,
                    textAlign: "right",
                  }}
                >
                  {formatHours(seg.hours)}
                </span>
              )}
              {seg.hours <= 0 && (
                <span
                  className="text-[9px] font-mono text-right px-1.5"
                  style={{ color: "var(--color-states-success)", minWidth: 40 }}
                >
                  done
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Compact phase labels bar (desktop-friendly) */}
      <div className="flex justify-between mt-1 text-[8px] uppercase tracking-wider" style={{ color: "var(--color-text-disabled)" }}>
        {segments.map((seg) => {
          const meta = PHASE_META[seg.phase];
          const isActive = seg.phase === currentPhase && !allCleared;
          return (
            <span key={seg.phase} style={{ color: isActive ? meta.color : undefined }}>
              {seg.hours > 0 ? `${meta.label} · ${formatHours(seg.hours)}` : meta.label}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}
