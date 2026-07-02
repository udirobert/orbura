"use client";

import { motion } from "framer-motion";
import { Copy, Bookmark, Check } from "lucide-react";

// ─── Copy-all button ─────────────────────────────────────────────────────────

function CopyAllButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="flex items-center gap-1 rounded-md h-6 px-2 transition-colors duration-150"
      style={{
        color: copied ? "var(--color-states-success)" : "var(--color-text-faint)",
        backgroundColor: copied ? "rgba(74,222,128,0.08)" : "rgba(168,162,158,0.06)",
      }}
      title="Copy all recommendations"
      aria-label="Copy all 4 recommendations"
    >
      {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      <span className="text-[7px] font-mono uppercase tracking-wider">
        {copied ? "Copied" : "Copy all"}
      </span>
    </motion.button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface HeaderActionsProps {
  scheduleLabel: string;
  bookmarkCount: number;
  copiedAll: boolean;
  copiedBookmarked: boolean;
  onCopyAll: () => void;
  onCopyBookmarked: () => void;
  onClearBookmarks: () => void;
}

export function HeaderActions({
  scheduleLabel,
  bookmarkCount,
  copiedAll,
  copiedBookmarked,
  onCopyAll,
  onCopyBookmarked,
  onClearBookmarks,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: "var(--color-states-warning)" }}
      >
        {scheduleLabel}
      </span>
      <div className="flex items-center gap-2">
        {bookmarkCount > 0 && (
          <>
            <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
              {bookmarkCount} bookmarked
            </span>
            <motion.button
              onClick={onCopyBookmarked}
              whileHover={{ backgroundColor: "rgba(74,222,128,0.10)", color: "var(--color-states-success)" }}
              className="flex items-center gap-1 text-[7px] font-mono uppercase tracking-wider rounded px-1.5 py-0.5"
              style={{
                color: copiedBookmarked ? "var(--color-states-success)" : "var(--color-text-faint)",
                backgroundColor: copiedBookmarked ? "rgba(74,222,128,0.08)" : "rgba(168,162,158,0.06)",
              }}
              aria-label="Copy bookmarked recommendations"
            >
              {copiedBookmarked ? <Check className="w-2.5 h-2.5" /> : <Bookmark className="w-2.5 h-2.5" />}
              <span>{copiedBookmarked ? "Copied" : "Copy saved"}</span>
            </motion.button>
            <motion.button
              onClick={onClearBookmarks}
              whileHover={{ backgroundColor: "rgba(220,38,38,0.10)", color: "var(--color-states-error)" }}
              className="text-[7px] font-mono uppercase tracking-wider rounded px-1.5 py-0.5"
              style={{
                color: "var(--color-text-faint)",
                backgroundColor: "rgba(168,162,158,0.06)",
              }}
              aria-label="Clear all bookmarks"
            >
              Clear
            </motion.button>
          </>
        )}
        <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
          Timeline · 4 phases
        </span>
        <CopyAllButton onClick={onCopyAll} copied={copiedAll} />
      </div>
    </div>
  );
}
