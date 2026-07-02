"use client";

import { motion } from "framer-motion";
import { Copy, Bookmark, Check } from "lucide-react";

// ─── Animation variants ──────────────────────────────────────────────────────

const actionButton = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -6, transition: { duration: 0.15 } },
};

// ─── Component ───────────────────────────────────────────────────────────────

interface ActionButtonsProps {
  onCopy: () => void;
  onBookmark: () => void;
  isCopied: boolean;
  isBookmarked: boolean;
  accentColor: string;
}

export function ActionButtons({
  onCopy,
  onBookmark,
  isCopied,
  isBookmarked,
  accentColor,
}: ActionButtonsProps) {
  return (
    <div
      className="flex items-center gap-1.5 pt-2"
      style={{ borderTop: "1px solid rgba(168,162,158,0.06)" }}
    >
      {/* Copy button */}
      <motion.button
        variants={actionButton}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={(e) => { e.stopPropagation(); onCopy(); }}
        className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider rounded-md h-7 transition-colors duration-150"
        style={{
          color: isCopied ? "var(--color-states-success)" : "var(--color-text-secondary)",
          backgroundColor: isCopied ? "rgba(74,222,128,0.08)" : "rgba(168,162,158,0.06)",
        }}
      >
        {isCopied ? (
          <Check className="w-3 h-3" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
        <span>{isCopied ? "Copied" : "Copy"}</span>
      </motion.button>

      {/* Bookmark button */}
      <motion.button
        variants={actionButton}
        initial="hidden"
        animate="show"
        exit="exit"
        onClick={(e) => { e.stopPropagation(); onBookmark(); }}
        className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider rounded-md h-7 transition-colors duration-150"
        style={{
          color: isBookmarked ? accentColor : "var(--color-text-secondary)",
          backgroundColor: isBookmarked ? `${accentColor}15` : "rgba(168,162,158,0.06)",
        }}
      >
        <Bookmark
          className="w-3 h-3"
          style={{ fill: isBookmarked ? accentColor : "none" }}
        />
        <span>{isBookmarked ? "Saved" : "Save"}</span>
      </motion.button>

      {/* Deselect hint */}
      <span className="ml-auto text-[7px] font-mono" style={{ color: "var(--color-text-faint)" }}>
        Tap to close
      </span>
    </div>
  );
}
