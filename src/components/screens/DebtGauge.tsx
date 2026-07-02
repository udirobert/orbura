"use client";

import { motion } from "framer-motion";
import { bandLabel, bandMeta } from "@/lib/debt-band";

/**
 * Debt Meter — an inverted semicircular gauge.
 *
 * The full arc represents your total debt capacity (0–100). The fill
 * starts at full (all debt) and drains *down* as you recover. The
 * remaining fill is colored by severity band (red → amber → green as
 * debt decreases). This aligns the visual metaphor: high fill = bad,
 * low fill = good.
 *
 * Accessibility: text labels (not color alone) communicate the band.
 * Animations respect prefers-reduced-motion via Framer's
 * useReducedMotion (applied by parent MotionConfig).
 */
export function DebtGauge({ score, animated = true }: { score: number; animated?: boolean }) {
  const meta = bandMeta(score);
  const label = bandLabel(score);

  // SVG arc params — semicircle from left to right
  const cx = 100, cy = 100, r = 72;
  const arcLength = Math.PI * r;
  const debtRatio = score / 100;
  // Inverted: the fill represents debt remaining. Full arc = all debt.
  // As score drops, the fill shrinks. dashOffset = arcLength * (1 - debtRatio)
  // means at score=100 the whole arc is filled, at score=0 nothing is filled.
  const dashOffset = animated ? arcLength * (1 - debtRatio) : 0;

  // Pointer position on the arc
  const pointerAngle = Math.PI + debtRatio * Math.PI;
  const pointerR = r + 2;
  const px = cx + pointerR * Math.cos(pointerAngle);
  const py = cy + pointerR * Math.sin(pointerAngle);

  const ticks = [0, 25, 50, 75, 100];

  // Inverted gradient: left (low debt) = green, right (high debt) = red
  // This makes the fill color match the current debt level visually.
  const fillColor = meta.color;

  return (
    <div className="flex flex-col items-center">
      <svg
        width="200"
        height="150"
        viewBox="0 0 200 145"
        className="overflow-visible"
        role="img"
        aria-label={`Debt score ${score} out of 100. ${label}.`}
      >
        <defs>
          <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-states-success)" />
            <stop offset="25%" stopColor="var(--color-states-warning)" />
            <stop offset="50%" stopColor="var(--color-brand-primary)" />
            <stop offset="75%" stopColor="var(--color-states-error)" />
            <stop offset="100%" stopColor="var(--color-states-error)" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc — full semicircle (total capacity) */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(168,162,158,0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Debt fill — fills from left, shrinks as debt decreases */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gauge-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={animated ? { strokeDashoffset: arcLength } : undefined}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDashoffset: dashOffset, filter: "url(#gauge-glow)" }}
        />

        {/* Active arc underlay — colored by current band */}
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={fillColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={animated ? { strokeDashoffset: arcLength } : undefined}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDashoffset: dashOffset }}
        />

        {/* Tick marks + labels */}
        {ticks.map((t) => {
          const ta = Math.PI + (t / 100) * Math.PI;
          const tx1 = cx + (r - 5) * Math.cos(ta);
          const ty1 = cy + (r - 5) * Math.sin(ta);
          const tx2 = cx + (r + 4) * Math.cos(ta);
          const ty2 = cy + (r + 4) * Math.sin(ta);
          const lx = cx + (r + 16) * Math.cos(ta);
          const ly = cy + (r + 16) * Math.sin(ta);
          const isActive = score >= t;
          return (
            <g key={t}>
              <line
                x1={tx1} y1={ty1} x2={tx2} y2={ty2}
                stroke={isActive ? fillColor : "rgba(168,162,158,0.15)"}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <text
                x={lx} y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isActive ? fillColor : "rgba(168,162,158,0.3)"}
                fontSize="8"
                fontFamily="monospace"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Score pointer arrow at current position */}
        {score > 0 && score < 100 && (
          <motion.polygon
            points={`${px - 5},${py - 10} ${px + 5},${py - 10} ${px},${py + 2}`}
            fill={fillColor}
            initial={animated ? { opacity: 0, scale: 0 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.3, duration: 0.3, ease: "backOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${fillColor}66)` }}
          />
        )}
      </svg>

      {/* Score number + band label (with text label, not color alone) */}
      <motion.div
        className="text-center -mt-6"
        initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
      >
        <span className="font-black leading-none" style={{ fontSize: "clamp(2.5rem, 8vw, 3.5rem)", color: fillColor }}>
          {score}
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fillColor }} />
          <p className="text-[12px] font-semibold tracking-wide" style={{ color: fillColor }}>
            {label}
          </p>
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-faint)" }}>
          {score >= 61 ? "High debt — recovery needed" : score >= 41 ? "Moderate debt — pace yourself" : score >= 21 ? "Mild debt — minor adjustments" : "Low debt — body is clear"}
        </p>
      </motion.div>
    </div>
  );
}
