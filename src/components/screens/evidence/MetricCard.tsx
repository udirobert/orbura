"use client";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function MetricCard({
  label,
  value,
  sub,
  color = "var(--color-states-success)",
}: MetricCardProps) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <span
        className="text-[9px] font-mono uppercase tracking-widest"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </span>
      <span
        className="font-black leading-none"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.75rem",
          color,
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
