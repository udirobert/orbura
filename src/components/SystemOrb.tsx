"use client";

import { motion } from "framer-motion";
import type { RecoverySystem } from "@/lib/types";

/**
 * SystemOrb — morphing SVG orb for each recovery system panel.
 *
 * Each system has two path states:
 *   dormant  → smooth circle (matches the main orb aesthetic)
 *   expanded → simplified anatomical silhouette for that system
 *
 * Morphing is achieved via Framer Motion's SVG path animation.
 * All paths are normalised to a 100×100 viewBox, centred on 50,50.
 * Color follows the same red→amber→green debt scale as the main orb.
 */

type OrbState = "dormant" | "expanded";

// ─── SVG path definitions ─────────────────────────────────────────────────────
// Each system: two path strings (circle → anatomical shape)

const PATHS: Record<RecoverySystem, { circle: string; shape: string }> = {
  // Heart — simplified cardioid
  cardiovascular: {
    circle: "M50,20 C67,20 80,33 80,50 C80,67 67,80 50,80 C33,80 20,67 20,50 C20,33 33,20 50,20 Z",
    shape:  "M50,75 C50,75 20,58 20,40 C20,29 28,22 37,22 C43,22 48,26 50,30 C52,26 57,22 63,22 C72,22 80,29 80,40 C80,58 50,75 50,75 Z",
  },
  // Brain — smooth bi-lobed silhouette
  brain: {
    circle: "M50,20 C67,20 80,33 80,50 C80,67 67,80 50,80 C33,80 20,67 20,50 C20,33 33,20 50,20 Z",
    shape:  "M50,28 C50,28 38,24 30,30 C22,36 22,46 26,52 C28,56 26,62 30,66 C34,70 42,70 46,66 C48,64 50,64 50,64 C50,64 52,64 54,66 C58,70 66,70 70,66 C74,62 72,56 74,52 C78,46 78,36 70,30 C62,24 50,28 50,28 Z",
  },
  // Liver — rounded right-lobe dominant shape
  liver: {
    circle: "M50,20 C67,20 80,33 80,50 C80,67 67,80 50,80 C33,80 20,67 20,50 C20,33 33,20 50,20 Z",
    shape:  "M24,44 C22,34 28,24 40,22 C52,20 64,24 72,32 C80,40 80,54 74,62 C68,70 56,74 48,70 C40,66 38,72 34,72 C28,72 22,66 22,58 C22,52 24,48 24,44 Z",
  },
  // Muscular — simplified muscle/lightning bolt
  muscular: {
    circle: "M50,20 C67,20 80,33 80,50 C80,67 67,80 50,80 C33,80 20,67 20,50 C20,33 33,20 50,20 Z",
    shape:  "M57,20 L38,52 L50,52 L43,80 L64,46 L52,46 Z",
  },
  // Gut — intestinal loop
  gut: {
    circle: "M50,20 C67,20 80,33 80,50 C80,67 67,80 50,80 C33,80 20,67 20,50 C20,33 33,20 50,20 Z",
    shape:  "M34,22 C26,22 22,30 22,38 C22,48 30,54 30,62 C30,70 36,78 44,78 C52,78 56,72 56,66 C56,58 48,52 48,44 C48,36 54,30 62,30 C70,30 76,36 76,46 C76,56 68,62 68,68 C68,74 72,78 78,72",
  },
};

// ─── Pulse animation config per system ───────────────────────────────────────

const PULSE: Record<RecoverySystem, { duration: number; scale: [number, number] }> = {
  cardiovascular: { duration: 0.8,  scale: [1, 1.06] },  // realistic heartbeat
  brain:          { duration: 2.5,  scale: [1, 1.02] },  // slow neural wave
  liver:          { duration: 3.0,  scale: [1, 1.015] }, // very slow metabolic
  muscular:       { duration: 1.2,  scale: [1, 1.04] },  // CNS pulse
  gut:            { duration: 2.0,  scale: [1, 1.03] },  // peristaltic rhythm
};

function getOrbColor(score: number): string {
  if (score >= 70) return "var(--color-states-error)";
  if (score >= 40) return "var(--color-brand-primary)";
  if (score >= 15) return "var(--color-states-warning)";
  return "var(--color-states-success)";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SystemOrbProps {
  system: RecoverySystem;
  score: number;
  state: OrbState;
  size?: number;
}

export function SystemOrb({ system, score, state, size = 80 }: SystemOrbProps) {
  const paths = PATHS[system];
  const pulse = PULSE[system];
  const color = getOrbColor(score);
  const isCleared = score === 0;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {/* Glow layer */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 35%, ${color}30 0%, transparent 70%)`,
          filter: "blur(6px)",
        }}
        animate={{ opacity: isCleared ? 0.3 : [0.4, 0.7, 0.4] }}
        transition={{ duration: pulse.duration * 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SVG morph */}
      <motion.svg
        viewBox="0 0 100 100"
        style={{ width: size, height: size, overflow: "visible" }}
        animate={{ scale: isCleared ? 1 : [pulse.scale[0], pulse.scale[1], pulse.scale[0]] }}
        transition={{ duration: pulse.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id={`og-${system}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.4" />
          </radialGradient>
        </defs>

        <motion.path
          d={state === "expanded" ? paths.shape : paths.circle}
          fill={`url(#og-${system})`}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity="0.3"
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />

        {/* Surface shimmer line — visible at high debt */}
        {score > 40 && (
          <motion.line
            x1="30" y1="45" x2="70" y2="45"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            animate={{ opacity: [0, 0.4, 0], y1: [45, 40, 45], y2: [45, 40, 45] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.svg>
    </div>
  );
}
