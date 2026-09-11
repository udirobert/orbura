"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { getWearableTrend } from "@/lib/api";
import type { WearableTrendPoint } from "@/lib/api";

const DAYS = 14;

function average(values: (number | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function formatShortDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point: WearableTrendPoint = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid rgba(168,162,158,0.15)",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        {formatShortDate(label)}
      </p>
      {point.hrv != null && (
        <p style={{ color: "var(--color-brand-primary)" }}>
          HRV {point.hrv} ms
        </p>
      )}
      {point.restingHr != null && (
        <p style={{ color: "var(--color-text-secondary)" }}>
          Resting HR {point.restingHr} bpm
        </p>
      )}
      {point.deep != null && point.rem != null && point.light != null && (
        <p className="mt-1" style={{ color: "var(--color-text-faint)" }}>
          Sleep deep {point.deep}m · REM {point.rem}m · light {point.light}m
        </p>
      )}
    </div>
  );
}

export function WearableTrendPanel() {
  const [data, setData] = useState<WearableTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWearableTrend(DAYS)
      .then((res) => {
        setData(res.trend);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load trend");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    return {
      hrv: average(data.map((d) => d.hrv)),
      restingHr: average(data.map((d) => d.restingHr)),
      deep: average(data.map((d) => d.deep)),
      rem: average(data.map((d) => d.rem)),
      light: average(data.map((d) => d.light)),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <div className="h-24 animate-pulse rounded-xl" style={{ backgroundColor: "var(--color-bg-base)" }} />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "var(--color-text-faint)" }}>
          Wearable baseline
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {error ? `Could not load trend: ${error}` : "No wearable history yet. Connect a wearable during your next check-in to start building your personal baseline."}
        </p>
      </div>
    );
  }

  const hasHrv = data.some((d) => d.hrv != null);
  const hasHr = data.some((d) => d.restingHr != null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 mb-6"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
          Wearable baseline · last {DAYS} nights
        </p>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ color: "var(--color-text-faint)", backgroundColor: "var(--color-bg-base)" }}>
          {data.length} nights
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {stats.hrv != null && (
          <div className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: "var(--color-bg-base)" }}>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-disabled)" }}>Avg HRV</div>
            <div className="text-xs font-mono font-bold mt-0.5" style={{ color: "var(--color-brand-primary)" }}>{stats.hrv} ms</div>
          </div>
        )}
        {stats.restingHr != null && (
          <div className="rounded-xl px-2 py-2 text-center" style={{ backgroundColor: "var(--color-bg-base)" }}>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-disabled)" }}>Avg Resting HR</div>
            <div className="text-xs font-mono font-bold mt-0.5" style={{ color: "var(--color-text-primary)" }}>{stats.restingHr} bpm</div>
          </div>
        )}
        {stats.deep != null && stats.rem != null && stats.light != null && (
          <div className="rounded-xl px-2 py-2 text-center col-span-2" style={{ backgroundColor: "var(--color-bg-base)" }}>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: "var(--color-text-disabled)" }}>Avg Sleep</div>
            <div className="text-xs font-mono font-bold mt-0.5" style={{ color: "var(--color-text-primary)" }}>
              {stats.deep}m · {stats.rem}m · {stats.light}m
            </div>
            <div className="text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>deep · REM · light</div>
          </div>
        )}
      </div>

      {(hasHrv || hasHr) && (
        <div style={{ width: "100%", height: 160 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fontSize: 9, fill: "var(--color-text-faint)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9, fill: "var(--color-text-faint)" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: "var(--color-text-faint)" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<TrendTooltip />} />
              {hasHrv && stats.hrv != null && (
                <ReferenceLine
                  y={stats.hrv}
                  yAxisId="left"
                  stroke="var(--color-text-faint)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
              )}
              {hasHrv && (
                <Line
                  type="monotone"
                  dataKey="hrv"
                  yAxisId="left"
                  stroke="var(--color-brand-primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
              {hasHr && (
                <Line
                  type="monotone"
                  dataKey="restingHr"
                  yAxisId="right"
                  stroke="var(--color-states-warning)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasHrv && stats.hrv != null && (
        <p className="mt-2 text-[9px] font-mono" style={{ color: "var(--color-text-faint)" }}>
          - - your {data.length}-night avg baseline · {stats.hrv} ms
        </p>
      )}
    </motion.div>
  );
}
