"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { fetchDebtHistory } from "@/lib/api";
import type { DebtHistoryItem } from "@/lib/api";

// ─── Score colour helper ────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 41) return "#EA580C";
  if (score >= 21) return "#F59E0B";
  return "#4ADE80";
}

// ─── Date formatter ─────────────────────────────────────────────────────────

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr =
    d.toDateString() === today.toDateString()
      ? "Today"
      : d.toDateString() === yesterday.toDateString()
        ? "Yesterday"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return { date: dateStr, time: timeStr };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DebtHistory() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DebtHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const handleToggle = () => {
    if (!open && !fetched.current && !loading) {
      fetched.current = true;
      setLoading(true);
      fetchDebtHistory()
        .then(setItems)
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
        <Clock className="w-3 h-3" style={{ color: "#524F4C" }} />
        <span
          className="text-[9px] uppercase tracking-widest font-semibold"
          style={{ color: "#524F4C" }}
        >
          Past scores
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
                  Loading history...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div
                className="rounded-2xl px-4 py-5 text-center"
                style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
              >
                <p className="text-[10px]" style={{ color: "#524F4C" }}>
                  No past sessions yet. Complete an assessment to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => {
                  const color = scoreColor(item.debtScore);
                  const { date, time } = formatDate(item.createdAt);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={{
                        backgroundColor: "#141416",
                        border: "1px solid rgba(168,162,158,0.08)",
                      }}
                    >
                      {/* Score dot */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        {item.debtScore}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[11px] font-semibold truncate"
                          style={{ color: "#F5F5F4" }}
                        >
                          {item.verdict}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: "#524F4C" }}>
                          {date} · {time}
                          {item.stressorCount > 0 && ` · ${item.stressorCount} stressors`}
                        </p>
                      </div>

                      {/* Data badges */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.hasFaceScan && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                            style={{ backgroundColor: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                            📷
                          </span>
                        )}
                        {item.hasHRV && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                            style={{ backgroundColor: "rgba(234,88,12,0.1)", color: "#EA580C" }}>
                            ❤️
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
