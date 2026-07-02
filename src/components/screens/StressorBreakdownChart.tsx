"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

const DONUT_COLORS = ["#DC2626", "#EA580C", "#F59E0B", "#10B981", "#6366F1", "#EC4899"];
const BAR_COLORS = ["rgba(220,38,38,0.7)", "rgba(234,88,12,0.7)", "rgba(245,158,11,0.7)", "rgba(16,185,129,0.7)", "rgba(99,102,241,0.7)", "rgba(236,72,153,0.7)"];

export interface BreakdownItem {
  stressor: string;
  points: number;
  insight: string;
  icon: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs max-w-[220px]"
      style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid rgba(168,162,158,0.15)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{data.icon}</span>
        <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{data.stressor}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px]" style={{ color: "var(--color-brand-primary)" }}>+{data.points} pts</span>
        {data.pct !== undefined && (
          <span className="text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>
            ({data.pct}%)
          </span>
        )}
      </div>
      {data.insight && (
        <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {data.insight}
        </p>
      )}
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

export function DonutChart({ items }: { items: BreakdownItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!items.length) return null;

  const total = items.reduce((s, i) => s + i.points, 0);

  // Annotate items with percentage
  const annotated = items.map((item) => ({
    ...item,
    pct: total > 0 ? Math.round((item.points / total) * 100) : 0,
  }));

  const handleSegmentClick = (index: number) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--color-text-faint)" }}>
        Debt Breakdown
      </p>

      <div className="flex items-start gap-5">
        {/* Donut */}
        <div className="flex-shrink-0" style={{ width: 130, height: 130 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={annotated}
                cx="50%" cy="50%"
                innerRadius={32}
                outerRadius={54}
                paddingAngle={3}
                dataKey="points"
                stroke="none"
                onClick={(_, i) => handleSegmentClick(i)}
                style={{ cursor: "pointer" }}
              >
                {annotated.map((_, i) => (
                  <Cell
                    key={i}
                    fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                    opacity={selectedIndex === null || selectedIndex === i ? 1 : 0.3}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {annotated.map((item, i) => {
            const isSelected = selectedIndex === i;
            const isDimmed = selectedIndex !== null && !isSelected;
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{
                  opacity: isDimmed ? 0.5 : 1,
                  x: 0,
                }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSegmentClick(i)}
                className="w-full flex items-center gap-2 text-left rounded-lg px-1.5 py-1 transition-colors"
                style={{
                  backgroundColor: isSelected ? `${DONUT_COLORS[i % DONUT_COLORS.length]}0F` : "transparent",
                }}
              >
                {/* Icon + name */}
                <span className="text-xs flex-shrink-0">{item.icon}</span>
                <span className="text-[10px] font-medium truncate flex-1" style={{ color: "var(--color-text-primary)" }}>
                  {item.stressor}
                </span>
                {/* Points */}
                <span className="text-[9px] font-mono flex-shrink-0" style={{ color: DONUT_COLORS[i % DONUT_COLORS.length] }}>
                  +{item.points}
                </span>
                {/* Percentage pill */}
                <span
                  className="text-[8px] font-mono px-1 py-0.5 rounded flex-shrink-0"
                  style={{
                    backgroundColor: "rgba(168,162,158,0.06)",
                    color: "var(--color-text-faint)",
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {item.pct}%
                </span>
              </motion.button>
            );
          })}

          {/* Total row */}
          <div className="flex items-center gap-2 pt-1.5" style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}>
            <span className="text-[10px] font-semibold flex-1" style={{ color: "var(--color-text-secondary)" }}>Total</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: "var(--color-brand-primary)" }}>+{total}</span>
            <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(168,162,158,0.06)", color: "var(--color-text-faint)" }}>
              100%
            </span>
          </div>
        </div>
      </div>

      {/* Tap hint */}
      {selectedIndex !== null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[8px] text-center mt-2 font-mono"
          style={{ color: "var(--color-text-disabled)" }}
        >
          Tap again to deselect
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

export function BarChartView({ items }: { items: BreakdownItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!items.length) return null;

  const sorted = [...items].sort((a, b) => b.points - a.points);
  const total = sorted.reduce((s, i) => s + i.points, 0);
  const annotated = sorted.map((item) => ({
    ...item,
    pct: total > 0 ? Math.round((item.points / total) * 100) : 0,
  }));

  const handleBarClick = (index: number) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--color-text-faint)" }}>
        Impact by stressor
      </p>

      <div style={{ height: Math.max(130, sorted.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={annotated}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="stressor"
              tick={{ fill: "#A8A29E", fontSize: 10 }}
              width={72}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="points" radius={[0, 4, 4, 0]} maxBarSize={18} cursor="pointer">
              {annotated.map((_, i) => (
                <Cell
                  key={i}
                  fill={BAR_COLORS[i % BAR_COLORS.length]}
                  opacity={selectedIndex === null || selectedIndex === i ? 1 : 0.25}
                  stroke={selectedIndex === i ? BAR_COLORS[i % BAR_COLORS.length] : "none"}
                  strokeWidth={selectedIndex === i ? 2 : 0}
                  onClick={() => handleBarClick(i)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tap hint */}
      {selectedIndex !== null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[8px] text-center mt-1 font-mono"
          style={{ color: "var(--color-text-disabled)" }}
        >
          Tap again to deselect
        </motion.p>
      )}
    </motion.div>
  );
}
