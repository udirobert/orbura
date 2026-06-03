"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { fetchScoreHeatmap } from "@/lib/api";
import type { HeatmapDay } from "@/lib/api";

// ─── Score colour helpers ────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 41) return "#EA580C";
  if (score >= 21) return "#F59E0B";
  if (score > 0)  return "#4ADE80";
  return "transparent";
}

function scoreBg(score: number): string {
  if (score >= 61) return "rgba(220,38,38,0.25)";
  if (score >= 41) return "rgba(234,88,12,0.25)";
  if (score >= 21) return "rgba(245,158,11,0.25)";
  if (score > 0)  return "rgba(74,222,128,0.25)";
  return "rgba(168,162,158,0.04)";
}

function scoreLabel(score: number): string {
  if (score >= 61) return "High";
  if (score >= 41) return "Elevated";
  if (score >= 21) return "Mild";
  if (score > 0)  return "Low";
  return "No data";
}

// ─── Build last-N-days grid ────────────────────────────────────────────────

function buildGrid(
  days: HeatmapDay[],
  lookback = 30,
): { date: string; score: number; count: number }[] {
  const map = new Map(days.map((d) => [d.date, d]));

  const cells: { date: string; score: number; count: number }[] = [];

  for (let i = lookback - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    const match = map.get(key);
    cells.push({
      date: key,
      score: match?.debtScore ?? -1,
      count: match?.sessionCount ?? 0,
    });
  }

  return cells;
}

// ─── Day-of-week labels (dynamically aligned to grid start) ──────────────

function getDayLabels(): string[] {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(d);
    date.setDate(date.getDate() + i);
    return date.toLocaleDateString("en-US", { weekday: "short" })[0];
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ScoreHeatmap() {
  const [open, setOpen] = useState(false);
  const [cells, setCells] = useState<ReturnType<typeof buildGrid>>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const handleToggle = () => {
    if (!open && !fetched.current && !loading) {
      fetched.current = true;
      setLoading(true);
      fetchScoreHeatmap()
        .then((data) => setCells(buildGrid(data, 30)))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    setOpen((o) => !o);
  };

  return (
    <div className="relative z-10 mb-6">
      {/* Toggle header */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <CalendarDays className="w-3 h-3" style={{ color: "#524F4C" }} />
        <span
          className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "#524F4C" }}
        >
          Heatmap
        </span>
        <span className="text-[9px] ml-auto" style={{ color: "#524F4C" }}>
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div
                className="rounded-2xl px-4 py-5 text-center"
                style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
              >
                <p className="text-[10px]" style={{ color: "#524F4C" }}>
                  Loading heatmap...
                </p>
              </div>
            ) : cells.length === 0 ? (
              <div
                className="rounded-2xl px-4 py-5 text-center"
                style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
              >
                <p className="text-[10px]" style={{ color: "#524F4C" }}>
                  No data yet — complete an assessment to seed the heatmap.
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
              >
                {/* Weekday labels + grid */}
                <div className="flex gap-[2px]">
                  {/* Day-of-week gutter — dynamically aligned to the starting day */}
                  <div className="flex flex-col gap-[2px] mr-2 pt-2">
                    {getDayLabels().map((d) => (
                      <div
                        key={d}
                        className="text-[7px] font-mono uppercase tracking-wider leading-none flex items-center justify-end"
                        style={{ color: "#524F4C", width: 18, height: 14 }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Grid columns (one per week) */}
                  <div className="flex gap-[2px] flex-1 overflow-x-auto">
                    {chunk(cells, 7).map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-[2px]">
                        {week.map((cell) => {
                          const hasData = cell.score >= 0;
                          return (
                            <div
                              key={cell.date}
                              title={hasData ? `${cell.date}: ${cell.score}` : cell.date}
                              className="relative group rounded-sm"
                              style={{
                                width: 14,
                                height: 14,
                                backgroundColor: hasData
                                  ? scoreBg(cell.score)
                                  : "rgba(168,162,158,0.04)",
                                outline: hasData ? `1px solid ${scoreColor(cell.score)}` : "1px solid rgba(168,162,158,0.06)",
                                outlineOffset: -1,
                              }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20">
                                <div
                                  className="rounded-lg px-2 py-1 text-[9px] font-semibold whitespace-nowrap shadow-lg"
                                  style={{
                                    backgroundColor: "#1C1C1E",
                                    color: "#F5F5F4",
                                    border: "1px solid rgba(168,162,158,0.15)",
                                  }}
                                >
                                  {hasData
                                    ? `${cell.date}: ${cell.score} (${scoreLabel(cell.score)})${cell.count > 1 ? ` · ${cell.count} sessions` : ""}`
                                    : `${cell.date}: —`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <span className="text-[7px] font-mono uppercase" style={{ color: "#524F4C" }}>Clear</span>
                  {[0, 20, 40, 60].map((threshold) => (
                    <div
                      key={threshold}
                      className="rounded-sm"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: scoreBg(threshold + 1),
                        outline: `1px solid ${scoreColor(threshold + 1)}`,
                        outlineOffset: -1,
                      }}
                    />
                  ))}
                  <span className="text-[7px] font-mono uppercase" style={{ color: "#524F4C" }}>High</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
