"use client";

import { motion } from "framer-motion";
import { slotToMinutes } from "@/lib/time-utils";

const CX = 100;
const CY = 100;
const R = 78;

/** Hours-from-midnight → point on the ring (12 AM at top, clockwise). */
function polar(hours: number) {
  const a = (hours / 24) * Math.PI * 2;
  return { x: CX + R * Math.sin(a), y: CY - R * Math.cos(a) };
}

/** Clockwise arc from startH to endH, wrapping past 24h when needed. */
function arcPath(startH: number, endH: number) {
  let sweep = endH - startH;
  if (sweep <= 0) sweep += 24;
  const s = polar(startH);
  const e = polar(endH);
  const large = sweep > 12 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
}

const TICKS = [
  { h: 0, label: "12a" },
  { h: 6, label: "6a" },
  { h: 12, label: "12p" },
  { h: 18, label: "6p" },
];

/**
 * SleepArc — the night's window as a glowing arc on a 24-hour ring.
 * Draws in on mount; endpoints mark bedtime (amber) and wake (light).
 */
export function SleepArc({
  bedTime,
  wakeTime,
  duration,
}: {
  bedTime: string;
  wakeTime: string;
  duration: string;
}) {
  const bedH = slotToMinutes(bedTime) / 60;
  const wakeH = slotToMinutes(wakeTime) / 60;
  const bed = polar(bedH);
  const wake = polar(wakeH);
  // Midpoint of the window — the "deepest" hour of the night, pulled inside
  // the ring so the moon floats within the sleep window rather than on it.
  let sweep = wakeH - bedH;
  if (sweep <= 0) sweep += 24;
  const midOnRing = polar(bedH + sweep / 2);
  const mid = {
    x: CX + (midOnRing.x - CX) * 0.72,
    y: CY + (midOnRing.y - CY) * 0.72,
  };

  return (
    <div className="relative w-full" style={{ maxWidth: 190, margin: "0 auto" }}>
      <svg viewBox="0 0 200 200" className="w-full h-auto block">
        {/* Track ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--color-bg-surface)"
          strokeWidth={7}
        />
        {/* Sleep window arc — draws in once, then follows the drums */}
        <motion.path
          d={arcPath(bedH, wakeH)}
          fill="none"
          stroke="var(--color-brand-primary)"
          strokeWidth={7}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 6px rgba(234,88,12,0.45))" }}
        />
        {/* Endpoint markers */}
        <circle cx={bed.x} cy={bed.y} r={5} fill="var(--color-brand-primary)" />
        <circle cx={wake.x} cy={wake.y} r={5} fill="var(--color-text-primary)" />
        {/* Moon at the midpoint of the night, drifting inside the window */}
        <motion.text
          x={mid.x}
          y={mid.y + 4}
          textAnchor="middle"
          fontSize={11}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          🌙
        </motion.text>
        {/* Cardinal hour labels */}
        {TICKS.map((t) => {
          const p = polar(t.h);
          return (
            <text
              key={t.h}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-mono, monospace)"
              fill="var(--color-text-faint)"
            >
              {t.label}
            </text>
          );
        })}
      </svg>
      {/* Center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-normal leading-none"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.35rem",
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {duration.replace(" sleep", "")}
        </span>
        <span
          className="text-[8px] font-mono uppercase tracking-widest mt-1"
          style={{ color: "var(--color-text-faint)" }}
        >
          {bedTime} → {wakeTime}
        </span>
      </div>
    </div>
  );
}
