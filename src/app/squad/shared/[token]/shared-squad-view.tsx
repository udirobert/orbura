"use client";

import { motion } from "framer-motion";

interface SharedPlayerData {
  name: string;
  position: string;
  analysis?: { debtScore: number; verdict?: string; recoveryTime?: string } | null;
}

function playerStatus(analysis?: { debtScore: number } | null): {
  label: string;
  color: string;
  emoji: string;
} {
  if (!analysis) return { label: "Not scanned", color: "var(--color-text-faint)", emoji: "○" };
  const score = analysis.debtScore;
  if (score >= 61) return { label: "Out — rest", color: "var(--color-states-error)", emoji: "🔴" };
  if (score >= 41) return { label: "Impact sub", color: "var(--color-states-warning)", emoji: "🟡" };
  if (score >= 21) return { label: "Modified", color: "var(--color-states-success)", emoji: "🟢" };
  return { label: "Fit to start", color: "var(--color-system-brain)", emoji: "⚽" };
}

export function SharedSquadView({
  squad,
  appName,
}: {
  squad: SharedPlayerData[];
  appName?: string;
}) {
  const readyCount = squad.filter((p) => p.analysis && p.analysis.debtScore < 41).length;
  const subCount = squad.filter((p) => p.analysis && p.analysis.debtScore >= 41 && p.analysis.debtScore < 61).length;
  const outCount = squad.filter((p) => p.analysis && p.analysis.debtScore >= 61).length;

  const sharedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-svh px-5 py-8 bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-slate-100 mb-1">
            {appName ?? "Match Fit"} — Squad Readiness
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Shared {sharedAt} · Read-only view
          </p>
        </div>

        {/* Team summary */}
        <div className="grid grid-cols-3 gap-3 mb-6 mt-6">
          <StatCard label="Ready" value={readyCount} color="var(--color-system-brain)" />
          <StatCard label="Impact" value={subCount} color="var(--color-states-warning)" />
          <StatCard label="Out" value={outCount} color="var(--color-states-error)" />
        </div>

        {/* Player list */}
        <div className="flex flex-col gap-2">
          {squad.map((p, i) => {
            const status = playerStatus(p.analysis);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{status.emoji}</span>
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {p.name}
                      </p>
                      <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600 flex-shrink-0">
                        {p.position}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono mt-1" style={{ color: status.color }}>
                      {status.label}
                    </p>
                  </div>
                  {p.analysis && (
                    <div className="text-right flex-shrink-0 ml-3">
                      <p
                        className="text-lg font-bold tabular-nums"
                        style={{ color: status.color }}
                      >
                        {p.analysis.debtScore}
                      </p>
                      <p className="text-[9px] font-mono text-slate-500">/100</p>
                    </div>
                  )}
                </div>
                {p.analysis?.verdict && (
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed border-t border-slate-800 pt-2">
                    {p.analysis.verdict}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] font-mono uppercase tracking-widest text-slate-600 mt-8">
          bodydebt.app · Shared squad snapshot
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-center">
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">{label}</p>
    </div>
  );
}
