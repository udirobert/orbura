"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Stressor } from "@/lib/types";
import type { StressorDef } from "@/lib/stressor-scoring";

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: isSelected
          ? (isCare ? "rgba(74,222,128,0.07)" : "rgba(234,88,12,0.07)")
          : "#141416",
        border: `1.5px solid ${isSelected
          ? (isCare ? "rgba(74,222,128,0.35)" : "rgba(234,88,12,0.35)")
          : "rgba(168,162,158,0.1)"}`,
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      {/* Main row */}
      <div className="flex items-center" style={{ minHeight: 64 }}>
        {isSelected && (
          <div
            className="w-[3px] self-stretch flex-shrink-0 rounded-l-2xl"
            style={{ backgroundColor: isCare ? "#4ADE80" : "#EA580C" }}
          />
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left px-4 py-3.5"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <span className="text-2xl flex-shrink-0">{def.icon}</span>
          <div className="flex-1 min-w-0">
            <span
              className="text-sm font-semibold block"
              style={{ color: isSelected ? "#F5F5F4" : "#A8A29E" }}
            >
              {def.label}
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: "#3a3835" }}>
              {def.sublabel}
            </span>
          </div>
        </motion.button>

        {def.expansions && def.expansions.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelected) onToggle();
              setExpanded((v) => !v);
            }}
            className="pr-4 pl-2 py-4 flex-shrink-0"
            style={{ color: isSelected ? "#EA580C" : "#524F4C" }}
            aria-label={expanded ? "Collapse" : "Add detail"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Expansion panels */}
      <AnimatePresence initial={false}>
        {expanded && def.expansions && (
          <motion.div
            key="expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}
            >
              {def.expansions.map((exp) => {
                const current = stressor?.[exp.field as keyof Stressor] as string | undefined;
                return (
                  <div key={String(exp.field)}>
                    <p className="text-[9px] uppercase tracking-widest font-semibold mb-2 mt-3" style={{ color: "#524F4C" }}>
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
                              : "rgba(168,162,158,0.15)"}`,
                            color: current === opt.key ? "#F5F5F4" : "#A8A29E",
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
