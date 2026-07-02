"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Timer, Sunrise, Sun, Ban } from "lucide-react";
import { toast } from "sonner";
import { HeaderActions } from "./HeaderActions";
import { TimelineBand, type TimeBand } from "./TimelineBand";
import type { Prescription } from "@/lib/types";

// ─── Band config ─────────────────────────────────────────────────────────────

const BANDS: TimeBand[] = [
  {
    key: "rightNow",
    label: "RIGHT NOW",
    icon: <Timer className="w-4 h-4" />,
    accentColor: "var(--color-states-error)",
    timeLabel: "Immediate",
  },
  {
    key: "thisMorning",
    label: "THIS MORNING",
    icon: <Sunrise className="w-4 h-4" />,
    accentColor: "var(--color-brand-primary)",
    timeLabel: "Next 2–3h",
  },
  {
    key: "today",
    label: "TODAY",
    icon: <Sun className="w-4 h-4" />,
    accentColor: "var(--color-states-warning)",
    timeLabel: "Rest of day",
  },
  {
    key: "avoid",
    label: "AVOID",
    icon: <Ban className="w-4 h-4" />,
    accentColor: "var(--color-states-error)",
    timeLabel: "All day",
    isAvoid: true,
  },
];

// ─── Animation variants ──────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "recovery-schedule-bookmarks";

function loadBookmarks(): Set<keyof Prescription> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set<keyof Prescription>(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface RecoveryScheduleProps {
  prescription: Prescription;
  scheduleLabel?: string;
  className?: string;
}

export function RecoverySchedule({
  prescription,
  scheduleLabel = "Recovery Schedule",
  className = "",
}: RecoveryScheduleProps) {
  const [selectedBand, setSelectedBand] = useState<keyof Prescription | null>(null);
  const [bookmarkedBands, setBookmarkedBands] = useState<Set<keyof Prescription>>(loadBookmarks);
  const [copiedBand, setCopiedBand] = useState<keyof Prescription | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedBookmarked, setCopiedBookmarked] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCopy = useCallback((key: keyof Prescription, text: string) => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedBand(key);
        toast.success("Copied to clipboard");
        copyTimeoutRef.current = setTimeout(() => setCopiedBand(null), 1500);
      })
      .catch(() => toast.error("Couldn't copy to clipboard"));
  }, []);

  const handleCopyAll = useCallback(() => {
    const lines = BANDS
      .map((b) => {
        const label = b.isAvoid ? `✗ ${b.label}` : b.label;
        return `${label}: ${prescription[b.key]}`;
      })
      .join("\n");
    navigator.clipboard.writeText(lines)
      .then(() => {
        setCopiedAll(true);
        toast.success("All 4 phases copied");
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedAll(false), 1500);
      });
  }, [prescription]);

  const handleCopyBookmarked = useCallback(() => {
    const lines = BANDS
      .filter((b) => bookmarkedBands.has(b.key))
      .map((b) => {
        const label = b.isAvoid ? `✗ ${b.label}` : b.label;
        return `${label}: ${prescription[b.key]}`;
      })
      .join("\n");
    if (!lines) return;
    navigator.clipboard.writeText(lines)
      .then(() => {
        setCopiedBookmarked(true);
        toast.success(`${bookmarkedBands.size} phase${bookmarkedBands.size !== 1 ? "s" : ""} copied`);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedBookmarked(false), 1500);
      });
  }, [prescription, bookmarkedBands]);

  const handleBookmark = useCallback((key: keyof Prescription) => {
    setBookmarkedBands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleClearBookmarks = useCallback(() => {
    setBookmarkedBands(new Set());
    toast.success("All bookmarks cleared");
  }, []);

  // Sync bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarkedBands]));
    } catch { /* non-critical */ }
  }, [bookmarkedBands]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const isSelected = (key: keyof Prescription) => selectedBand === key;
  const isBookmarked = (key: keyof Prescription) => bookmarkedBands.has(key);
  const isCopied = (key: keyof Prescription) => copiedBand === key;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <HeaderActions
        scheduleLabel={scheduleLabel}
        bookmarkCount={bookmarkedBands.size}
        copiedAll={copiedAll}
        copiedBookmarked={copiedBookmarked}
        onCopyAll={handleCopyAll}
        onCopyBookmarked={handleCopyBookmarked}
        onClearBookmarks={handleClearBookmarks}
      />

      {/* Timeline bands */}
      <motion.div
        className="relative px-4 pb-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Vertical timeline rail */}
        <div
          className="absolute left-[28px] top-2 bottom-4 w-px rounded-full"
          style={{ backgroundColor: "rgba(168,162,158,0.08)" }}
        />

        {BANDS.map((band) => {
          const key = band.key;
          return (
            <TimelineBand
              key={key}
              band={band}
              text={prescription[key]}
              isSelected={isSelected(key)}
              isBookmarked={isBookmarked(key)}
              isCopied={isCopied(key)}
              onSelect={() => setSelectedBand(isSelected(key) ? null : key)}
              onCopy={() => handleCopy(key, prescription[key])}
              onBookmark={() => handleBookmark(key)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
