"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { ActionButtons } from "./ActionButtons";
import type { Prescription } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimeBand {
  key: keyof Prescription;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  timeLabel: string;
  isAvoid?: boolean;
}

// ─── Animation variants ──────────────────────────────────────────────────────

const item = {
  hidden: { opacity: 0, x: -14 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface TimelineBandProps {
  band: TimeBand;
  text: string;
  isSelected: boolean;
  isBookmarked: boolean;
  isCopied: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onBookmark: () => void;
}

export function TimelineBand({
  band,
  text,
  isSelected,
  isBookmarked,
  isCopied,
  onSelect,
  onCopy,
  onBookmark,
}: TimelineBandProps) {
  return (
    <motion.div
      variants={item}
      className="group relative flex items-start gap-3 py-2.5 rounded-xl -mx-1 px-1 cursor-pointer transition-colors duration-200 select-none"
      onClick={onSelect}
      whileHover={{
        backgroundColor: band.isAvoid
          ? "rgba(220,38,38,0.04)"
          : "rgba(168,162,158,0.04)",
      }}
      whileTap={{ scale: 0.99 }}
      style={{
        outline: isSelected ? `1px solid ${band.accentColor}40` : "none",
        outlineOffset: 1,
      }}
    >
      {/* Timeline dot connector */}
      <div className="relative flex-shrink-0 mt-1 z-10">
        <motion.div
          className="w-[10px] h-[10px] rounded-full flex items-center justify-center"
          style={{
            backgroundColor: isBookmarked
              ? band.accentColor
              : band.isAvoid
                ? "rgba(220,38,38,0.15)"
                : `${band.accentColor}18`,
            border: `1.5px solid ${
              isBookmarked
                ? band.accentColor
                : band.isAvoid
                  ? "var(--color-states-error)"
                  : band.accentColor
            }`,
          }}
          animate={isBookmarked ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.4 }}
        >
          <div
            className="w-[4px] h-[4px] rounded-full"
            style={{
              backgroundColor: isBookmarked
                ? "var(--color-bg-surface)"
                : band.isAvoid
                  ? "var(--color-states-error)"
                  : band.accentColor,
            }}
          />
        </motion.div>
      </div>

      {/* Icon circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
        style={{
          backgroundColor: isSelected
            ? `${band.accentColor}22`
            : band.isAvoid
              ? "rgba(220,38,38,0.10)"
              : `${band.accentColor}15`,
          color: band.isAvoid
            ? "var(--color-states-error)"
            : band.accentColor,
          opacity: band.isAvoid && !isSelected ? 0.7 : 1,
        }}
      >
        {band.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{
              color: band.isAvoid
                ? "var(--color-states-error)"
                : band.accentColor,
            }}
          >
            {band.isAvoid ? `✗ ${band.label}` : band.label}
          </span>
          <span
            className="text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              color: "var(--color-text-faint)",
              backgroundColor: "rgba(168,162,158,0.06)",
            }}
          >
            {band.timeLabel}
          </span>
          {/* Bookmark indicator */}
          {isBookmarked && (
            <Bookmark
              className="w-2.5 h-2.5"
              style={{ color: band.accentColor, fill: band.accentColor }}
            />
          )}
        </div>
        <p
          className="text-sm leading-relaxed"
          style={{
            color: band.isAvoid
              ? "var(--color-text-secondary)"
              : "var(--color-text-primary)",
            fontStyle: band.isAvoid ? "italic" : "normal",
          }}
        >
          {band.isAvoid && (
            <span className="mr-1 opacity-40">✗</span>
          )}
          {text}
        </p>

        {/* Action buttons — slide-in on selection */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ActionButtons
                onCopy={onCopy}
                onBookmark={onBookmark}
                isCopied={isCopied}
                isBookmarked={isBookmarked}
                accentColor={band.accentColor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Left accent bar — shows on selection */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-opacity duration-200"
        style={{
          backgroundColor: band.accentColor,
          opacity: isSelected ? 0.6 : 0,
        }}
      />
    </motion.div>
  );
}
