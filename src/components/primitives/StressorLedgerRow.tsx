"use client";

/**
 * StressorLedgerRow — input row for a single stressor.
 *
 * Replaces the card pattern in `stressor-card.tsx`. One row per stressor
 * in the intake flow: icon, label, sublabel, optional chevron, and a
 * live contribution number on the right when the row is selected.
 *
 * The expansion panel (sub-options) is rendered via `children` so this
 * primitive stays a thin meter and the screen owns the option wiring.
 *
 * Summary mode (read-only, used in dashboard) is intentionally not in
 * this primitive yet — Pass 2 will introduce it.
 */

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Stressor } from "@/lib/types";
import { fadeUp, EASE_PROTOCOL } from "@/lib/motion/protocol";

export interface StressorLedgerRowProps {
  icon: string;
  label: string;
  sublabel: string;
  isSelected: boolean;
  /** Base points contribution to total debt. Positive adds, negative subtracts. */
  contribution: number;
  /** True when the row has sub-options that can be expanded. */
  hasExpansions?: boolean;
  expanded?: boolean;
  onToggle: () => void;
  onToggleExpansion?: () => void;
  /** When true, render in a "recovered" tone (used for "care" stressor). */
  isCare?: boolean;
  children?: React.ReactNode;
}

function formatContribution(contribution: number): string {
  if (contribution > 0) return `+${contribution}`;
  if (contribution < 0) return `${contribution}`;
  return "0";
}

export function StressorLedgerRow({
  icon,
  label,
  sublabel,
  isSelected,
  contribution,
  hasExpansions = false,
  expanded = false,
  onToggle,
  onToggleExpansion,
  isCare = false,
  children,
}: StressorLedgerRowProps) {
  const accent = isCare ? "var(--color-states-success)" : "var(--color-brand-primary)";
  const accentSoft = isCare ? "rgba(74,222,128,0.18)" : "rgba(234,88,12,0.18)";

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isSelected ? accentSoft : "var(--color-bg-surface)",
        border: `1.5px solid ${
          isSelected
            ? (isCare ? "rgba(74,222,128,0.35)" : "rgba(234,88,12,0.35)")
            : "rgba(168,162,158,0.1)"
        }`,
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      <div className="flex items-center" style={{ minHeight: 64 }}>
        {isSelected && (
          <div
            className="w-[3px] self-stretch flex-shrink-0 rounded-l-2xl"
            style={{ backgroundColor: accent }}
          />
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left px-4 py-3.5"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <span
              className="text-sm font-semibold block"
              style={{ color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
            >
              {label}
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
              {isSelected ? "Tap to remove" : sublabel}
            </span>
          </div>

          {/* Live contribution readout */}
          {isSelected && (
            <motion.span
              key={contribution}
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-xs font-bold flex-shrink-0 mr-1"
              style={{ color: accent }}
            >
              {formatContribution(contribution)}
            </motion.span>
          )}
        </motion.button>

        {hasExpansions && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) onToggle();
              onToggleExpansion?.();
            }}
            className="pr-4 pl-2 py-4 flex-shrink-0"
            style={{ color: isSelected ? accent : "var(--color-text-faint)" }}
            aria-label={expanded ? "Collapse" : "Add detail"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && children && (
          <motion.div
            key="expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_PROTOCOL }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4"
              style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export { type Stressor };
