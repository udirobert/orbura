"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Stressor } from "@/lib/types";
import type { StressorDef } from "@/stressors";
import { StressorLedgerRow } from "@/components/primitives/StressorLedgerRow";

/**
 * StressorCard — input wrapper for a single stressor in the intake flow.
 *
 * Owns the local expansion state and renders sub-option chips. The row
 * itself (icon, label, sublabel, contribution, chevron) is delegated
 * to the `StressorLedgerRow` primitive so the visual language is
 * consistent with summary uses and easy to evolve in one place.
 */
export function StressorCard({
  def,
  stressor,
  onToggle,
  onSubOption,
}: {
  def: StressorDef;
  stressor: Stressor | undefined;
  onToggle: () => void;
  onSubOption: (field: keyof Stressor, key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = !!stressor;
  const isCare = def.type === "care";

  return (
    <StressorLedgerRow
      icon={def.icon}
      label={def.label}
      sublabel={def.sublabel}
      isSelected={isSelected}
      contribution={def.basePoints}
      hasExpansions={!!(def.expansions && def.expansions.length > 0)}
      expanded={expanded}
      onToggle={onToggle}
      onToggleExpansion={() => setExpanded((v) => !v)}
      isCare={isCare}
    >
      {def.expansions?.map((exp) => {
        const current = stressor?.[exp.field as keyof Stressor] as string | undefined;
        return (
          <div key={String(exp.field)}>
            <p
              className="text-[9px] uppercase tracking-widest font-semibold mb-2 mt-3"
              style={{ color: "var(--color-text-faint)" }}
            >
              {exp.question}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exp.options.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSubOption(exp.field as keyof Stressor, opt.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: current === opt.key
                      ? (isCare ? "rgba(74,222,128,0.2)" : "rgba(234,88,12,0.2)")
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${current === opt.key
                      ? (isCare ? "rgba(74,222,128,0.5)" : "rgba(234,88,12,0.5)")
                      : "var(--color-border-default)"}`,
                    color: current === opt.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    minHeight: "32px",
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </StressorLedgerRow>
  );
}
