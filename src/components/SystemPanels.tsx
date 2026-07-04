"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SystemScore } from "@/lib/types";
import { SystemOrb } from "@/components/SystemOrb";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

function formatCountdown(clearedAt: string, now: Date): string {
  const diff = new Date(clearedAt).getTime() - now.getTime();
  if (diff <= 0) return "Cleared";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClearTime(clearedAt: string): string {
  const cleared = new Date(clearedAt);
  const now = new Date();
  const diff = cleared.getTime() - now.getTime();
  if (diff <= 0) return "Cleared";
  const h = cleared.getHours();
  const m = cleared.getMinutes();
  const period = h >= 12 ? "pm" : "am";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const timeStr = `${h12}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${period}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (cleared.toDateString() === now.toDateString()) return `Cleared at ${timeStr}`;
  if (cleared.toDateString() === tomorrow.toDateString()) return `Cleared ${timeStr} tomorrow`;
  return `Cleared in ${Math.ceil(diff / 86400000)} days`;
}

function getBarColor(score: number): string {
  if (score >= 70) return "var(--color-states-error)";
  if (score >= 40) return "var(--color-brand-primary)";
  if (score >= 15) return "var(--color-states-warning)";
  return "var(--color-states-success)";
}

// ─── Single system panel ──────────────────────────────────────────────────────

function SystemPanel({ sys, now }: { sys: SystemScore; now: Date }) {
  const [expanded, setExpanded] = useState(false);
  const wasClearedRef = useRef(false);
  const [justCleared, setJustCleared] = useState(false);
  const isCleared = sys.hasData && (sys.score === 0 || new Date(sys.clearedAt) <= now);
  const isUnknown = !sys.hasData;

  // Detect transition to cleared for micro-celebration
  useEffect(() => {
    if (isCleared && !wasClearedRef.current) {
      wasClearedRef.current = true;
      setJustCleared(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([10, 40, 10]);
      }
      const t = setTimeout(() => setJustCleared(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isCleared]);

  const countdown = formatCountdown(sys.clearedAt, now);
  const clearTime = formatClearTime(sys.clearedAt);
  const barColor = getBarColor(sys.score);
  const pct = Math.max(0, Math.min(100, sys.score));

  return (
    <motion.div
      layout
      className="rounded-2xl overflow-hidden cursor-pointer relative"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: `1px solid ${
          isUnknown
            ? "rgba(168,162,158,0.04)"
            : isCleared
            ? "rgba(74,222,128,0.2)"
            : expanded
            ? "rgba(234,88,12,0.25)"
            : "rgba(168,162,158,0.08)"
        }`,
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Clearance sweep animation */}
      <AnimatePresence>
        {justCleared && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-20"
            style={{ background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.15), transparent)" }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* ── Collapsed row ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <motion.span
          className="text-lg flex-shrink-0"
          animate={justCleared ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          {sys.icon}
        </motion.span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-semibold"
              style={{
                color: isUnknown
                  ? "var(--color-text-disabled)"
                  : isCleared
                  ? "var(--color-states-success)"
                  : "var(--color-text-primary)",
              }}
            >
              {sys.label}
            </span>
            <span
              className="text-[10px] font-mono flex-shrink-0"
              style={{
                color: isUnknown
                  ? "var(--color-text-disabled)"
                  : isCleared
                  ? "var(--color-states-success)"
                  : "var(--color-text-secondary)",
              }}
            >
              {isUnknown ? "— No data" : isCleared ? "✓ Clear" : countdown}
            </span>
          </div>

          {/* Recovery bar */}
          <div
            className="mt-1.5 rounded-full overflow-hidden"
            style={{ height: 4, backgroundColor: "rgba(168,162,158,0.1)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isUnknown ? "rgba(168,162,158,0.15)" : barColor }}
              initial={{ width: 0 }}
              animate={{ width: isUnknown ? "100%" : `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {/* Clearance time */}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[9px]" style={{ color: "var(--color-text-disabled)" }}>
              {isUnknown ? "Awaiting data" : clearTime}
            </span>
            {!isCleared && !isUnknown && (
              <motion.div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: barColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid rgba(168,162,158,0.06)" }}
            >
              {/* Morphing orb + cause */}
              <div className="flex items-start gap-4 pt-3">
                <div className="flex-shrink-0">
                  <SystemOrb
                    system={sys.system}
                    score={sys.score}
                    state={expanded ? "expanded" : "dormant"}
                    size={72}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {/* Cause */}
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      Why
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {sys.causeText}
                    </p>
                  </div>
                  {/* Recovery action */}
                  <div className="flex items-start gap-2">
                    <span
                      className="text-[10px] font-mono font-bold flex-shrink-0 mt-0.5"
                      style={{ color: "var(--color-brand-primary)" }}
                    >
                      →
                    </span>
                    <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {sys.actionText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Science citation */}
              {sys.scienceFact && (
                <div
                  className="rounded-xl px-3 py-2.5 space-y-1"
                  style={{ backgroundColor: "rgba(168,162,158,0.04)", border: "1px solid rgba(168,162,158,0.08)" }}
                >
                  <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--color-text-secondary)" }}>
                    &ldquo;{sys.scienceFact}&rdquo;
                  </p>
                  {sys.scienceCite && (
                    <p className="text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>
                      — {sys.scienceCite}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── System score dot row ────────────────────────────────────────────────────

const SYSTEM_ORDER: Record<string, { icon: string; accent: string }> = {
  cardiovascular: { icon: "🫀", accent: "#F43F5E" },
  brain:          { icon: "🧠", accent: "#22D3EE" },
  liver:          { icon: "🫁", accent: "#EAB308" },
  muscular:       { icon: "💪", accent: "#A78BFA" },
  gut:            { icon: "🦠", accent: "#2DD4BF" },
};

function SystemScoreBar({ systems, now }: { systems: SystemScore[]; now: Date }) {
  const maxScore = Math.max(...systems.map((s) => s.score), 1);
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      {systems.map((sys) => {
        const meta = SYSTEM_ORDER[sys.system] ?? { icon: "•", accent: "rgba(168,162,158,0.2)" };
        const isCleared = sys.hasData && (new Date(sys.clearedAt) <= now || sys.score === 0);
        const isUnknown = !sys.hasData;
        const pct = maxScore > 0 ? (sys.score / maxScore) * 100 : 0;
        const barHeight = isUnknown ? 4 : Math.max(4, (pct / 100) * 24);
        return (
          <div key={sys.system} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-sm" style={{ opacity: isUnknown ? 0.4 : 1 }}>{meta.icon}</span>
            <div
              className="w-full rounded-full flex items-end justify-center"
              style={{
                height: 28,
                backgroundColor: "rgba(168,162,158,0.04)",
              }}
            >
              <motion.div
                className="w-2 rounded-full"
                style={{
                  backgroundColor: isUnknown
                    ? "rgba(168,162,158,0.15)"
                    : isCleared
                    ? "var(--color-states-success)"
                    : meta.accent,
                  maxHeight: 24,
                }}
                initial={{ height: 0 }}
                animate={{ height: barHeight }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span
              className={`text-[9px] font-mono tabular-nums ${isCleared ? "" : "font-semibold"}`}
              style={{
                color: isUnknown
                  ? "var(--color-text-disabled)"
                  : isCleared
                  ? "var(--color-states-success)"
                  : "var(--color-text-secondary)",
              }}
            >
              {isUnknown ? "—" : isCleared ? "✓" : sys.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel list ───────────────────────────────────────────────────────────────

interface SystemPanelsProps {
  systems: SystemScore[];
}

export function SystemPanels({ systems }: SystemPanelsProps) {
  const now = useNow();
  const [expanded, setExpanded] = useState(false);

  if (!systems || systems.length === 0) return null;

  const sorted = [...systems].sort((a, b) => {
    // Systems with data sort above unknown systems
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    const aScore = new Date(a.clearedAt) <= now ? 0 : a.score;
    const bScore = new Date(b.clearedAt) <= now ? 0 : b.score;
    return bScore - aScore;
  });

  const allClear = sorted.every((s) => !s.hasData || new Date(s.clearedAt) <= now || s.score === 0);
  const activeSystems = sorted.filter((s) => s.hasData && new Date(s.clearedAt) > now && s.score > 0);
  const unknownCount = sorted.filter((s) => !s.hasData).length;
  const visibleSystems = expanded ? sorted : sorted.slice(0, 2);
  const hiddenCount = sorted.length - visibleSystems.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--color-text-faint)" }}
        >
          Recovery by system
        </p>
        <div className="flex items-center gap-2">
          {activeSystems.length > 0 && (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(168,162,158,0.06)", color: "var(--color-text-faint)" }}>
              {activeSystems.length} active
            </span>
          )}
          {allClear && unknownCount === 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[9px] font-semibold"
              style={{ color: "var(--color-states-success)" }}
            >
              All systems clear ●
            </motion.span>
          )}
          {allClear && unknownCount > 0 && (
            <span
              className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(168,162,158,0.06)", color: "var(--color-text-faint)" }}
            >
              {unknownCount} unassessed
            </span>
          )}
        </div>
      </div>

      {/* Score comparison bar strip */}
      {sorted.length > 1 && (
        <div
          className="rounded-xl mb-2 overflow-hidden"
          style={{ backgroundColor: "rgba(168,162,158,0.03)", border: "1px solid rgba(168,162,158,0.06)" }}
        >
          <SystemScoreBar systems={sorted} now={now} />
        </div>
      )}

      {visibleSystems.map((sys) => (
        <SystemPanel key={sys.system} sys={sys} now={now} />
      ))}

      {/* Progressive reveal: show worst 2 first, expand for rest */}
      {hiddenCount > 0 && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(true)}
          className="w-full rounded-xl py-2.5 text-center text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
          style={{
            color: "var(--color-text-secondary)",
            backgroundColor: "rgba(168,162,158,0.04)",
            border: "1px solid rgba(168,162,158,0.08)",
          }}
        >
          <span>Show {hiddenCount} more system{hiddenCount !== 1 ? "s" : ""}</span>
          <span className="text-[8px] font-mono px-1 py-0.5 rounded"
            style={{ backgroundColor: "rgba(168,162,158,0.06)", color: "var(--color-text-faint)" }}>
            {hiddenCount}
          </span>
          <span>↓</span>
        </motion.button>
      )}

      {expanded && hiddenCount === 0 && sorted.length > 2 && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(false)}
          className="w-full rounded-xl py-2.5 text-center text-[10px] font-mono uppercase tracking-wider"
          style={{
            color: "var(--color-text-faint)",
            backgroundColor: "rgba(168,162,158,0.04)",
            border: "1px solid rgba(168,162,158,0.06)",
          }}
        >
          Collapse ↑
        </motion.button>
      )}

      <p className="text-[9px] text-center pt-1" style={{ color: "var(--color-text-disabled)" }}>
        Tap a system to see cause and recovery action
      </p>
    </div>
  );
}
