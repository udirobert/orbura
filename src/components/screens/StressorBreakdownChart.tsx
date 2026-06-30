"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";

const DONUT_COLORS = ["#DC2626", "#EA580C", "#F59E0B", "#10B981", "#6366F1", "#EC4899"];
const BAR_COLORS = ["rgba(220,38,38,0.7)", "rgba(234,88,12,0.7)", "rgba(245,158,11,0.7)", "rgba(16,185,129,0.7)", "rgba(99,102,241,0.7)", "rgba(236,72,153,0.7)"];

interface BreakdownItem {
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
    <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid rgba(168,162,158,0.15)" }}>
      <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{data.stressor}</p>
      <p className="font-mono mt-0.5" style={{ color: "var(--color-brand-primary)" }}>+{data.points} pts</p>
      {data.insight && <p className="text-[10px] mt-1 max-w-[200px]" style={{ color: "var(--color-text-secondary)" }}>{data.insight}</p>}
    </div>
  );
}

export function DonutChart({ items }: { items: BreakdownItem[] }) {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.points, 0);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--color-text-faint)" }}>
        Debt Breakdown
      </p>
      <div className="flex items-center gap-4">
        <div style={{ width: 120, height: 120 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={items}
                cx="50%" cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={3}
                dataKey="points"
                stroke="none"
              >
                {items.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[10px] font-medium min-w-[60px]" style={{ color: "var(--color-text-primary)" }}>{item.stressor}</span>
              <span className="text-[9px] font-mono" style={{ color: DONUT_COLORS[i % DONUT_COLORS.length] }}>+{item.points}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-secondary)" }}>Total</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: "var(--color-brand-primary)" }}>+{total}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function BarChartView({ items }: { items: BreakdownItem[] }) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => b.points - a.points);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <p className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--color-text-faint)" }}>
        Impact by stressor
      </p>
      <div style={{ height: Math.max(120, sorted.length * 32) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="stressor" tick={{ fill: "#A8A29E", fontSize: 10 }} width={70} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="points" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
