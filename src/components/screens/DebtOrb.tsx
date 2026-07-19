"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DEBT_BAND_META, debtBand } from "@/lib/debt-band";
import { MIRA_POSTURE_PALETTE } from "@/lib/mira/posture-palette";
import type { MiraPresence } from "@/lib/mira/contract";

interface DebtOrbProps {
  score: number; // 0-100
  /** When present, the orb transforms into Mira mode (posture-driven). */
  presence?: MiraPresence | null;
}

// ─── Debt mode: turbulence frames based on score ─────────────────────────────

function getTurbulenceFrames(score: number): string[] {
  if (score >= 75) {
    return [
      "58% 42% 52% 48% / 48% 54% 46% 52%",
      "44% 56% 62% 38% / 56% 44% 58% 42%",
      "52% 48% 44% 56% / 42% 60% 40% 58%",
      "60% 40% 52% 48% / 54% 46% 56% 44%",
      "48% 52% 58% 42% / 50% 52% 44% 56%",
      "58% 42% 52% 48% / 48% 54% 46% 52%",
    ];
  }
  if (score >= 50) {
    return [
      "56% 44% 52% 48% / 50% 54% 46% 50%",
      "48% 52% 56% 44% / 54% 46% 52% 48%",
      "52% 48% 46% 54% / 48% 56% 50% 50%",
      "56% 44% 52% 48% / 50% 54% 46% 50%",
    ];
  }
  // Low debt — gentle, almost circular
  return [
    "52% 48% 52% 48% / 50% 50% 50% 50%",
    "50% 50% 50% 50% / 52% 48% 52% 48%",
    "52% 48% 52% 48% / 50% 50% 50% 50%",
  ];
}

// ─── Mira mode: turbulence frames based on posture intensity ─────────────────

function getMiraTurbulenceFrames(intensity: "calm" | "gentle" | "active"): string[] {
  if (intensity === "active") {
    return [
      "54% 46% 50% 50% / 50% 52% 48% 50%",
      "48% 52% 54% 46% / 52% 48% 52% 48%",
      "52% 48% 48% 52% / 48% 54% 46% 52%",
      "54% 46% 50% 50% / 50% 52% 48% 50%",
    ];
  }
  if (intensity === "gentle") {
    return [
      "52% 48% 50% 50% / 50% 50% 50% 50%",
      "50% 50% 52% 48% / 51% 49% 51% 49%",
      "52% 48% 50% 50% / 50% 50% 50% 50%",
    ];
  }
  // calm — nearly circular, very slow morph
  return [
    "51% 49% 51% 49% / 50% 50% 50% 50%",
    "50% 50% 50% 50% / 51% 49% 51% 49%",
    "51% 49% 51% 49% / 50% 50% 50% 50%",
  ];
}

// ─── Main orb ────────────────────────────────────────────────────────────────

export function DebtOrb({ score, presence }: DebtOrbProps) {
  const reducedMotion = useReducedMotion();
  const isMiraMode = !!presence;
  const miraPalette = presence ? MIRA_POSTURE_PALETTE[presence.posture] : null;

  // ── Debt mode values ──
  const debtColors = DEBT_BAND_META[debtBand(score)];
  const debtGlow =
    score >= 61 ? "rgba(220,38,38,0.25)" :
    score >= 41 ? "rgba(234,88,12,0.22)" :
                  "rgba(245,158,11,0.18)";
  const debtSize = 220 + Math.round((score / 100) * 32); // 220–252px
  const debtTurbulence = getTurbulenceFrames(score);
  const debtTurbulenceDur = score >= 75 ? 5 : score >= 50 ? 7 : 10;
  const debtPulseDur = score >= 75 ? 2.5 : score >= 50 ? 3.5 : 5;
  const debtPulseDepth = score >= 75 ? 1.08 : score >= 50 ? 1.05 : 1.03;
  const debtGlowIntensity = Math.min(0.18 + (score / 100) * 0.35, 0.53);

  // ── Mira mode values ──
  const miraSize = 232; // fixed — Mira doesn't scale with score
  const miraTurbulence = miraPalette ? getMiraTurbulenceFrames(miraPalette.turbulence) : [];
  const miraTurbulenceDur = miraPalette ? miraPalette.breathMs / 1000 * 1.5 : 9;
  const miraPulseDur = miraPalette ? miraPalette.breathMs / 1000 : 5;
  const miraPulseDepth = 1.04;
  const miraGlowIntensity = 0.22;

  // ── Active mode values ──
  const orbSize = isMiraMode ? miraSize : debtSize;
  const colors = isMiraMode && miraPalette
    ? { color: miraPalette.core, colorSecondary: miraPalette.coreSecondary }
    : debtColors;
  const orbGlow = isMiraMode && miraPalette ? miraPalette.glow : debtGlow;
  const turbulenceFrames = isMiraMode ? miraTurbulence : debtTurbulence;
  const turbulenceDuration = isMiraMode ? miraTurbulenceDur : debtTurbulenceDur;
  const pulseDuration = isMiraMode ? miraPulseDur : debtPulseDur;
  const pulseDepth = isMiraMode ? miraPulseDepth : debtPulseDepth;
  const glowIntensity = isMiraMode ? miraGlowIntensity : debtGlowIntensity;
  const ringColor = isMiraMode && miraPalette ? miraPalette.ringColor : `${colors.color}22`;

  // ── Reduced motion: static form ──
  if (reducedMotion) {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: orbSize, height: orbSize }}
        role="img"
        aria-label={isMiraMode && presence ? `${presence.label}: ${presence.message}` : `Debt score ${score}`}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `0 0 ${50 + (isMiraMode ? 20 : score)}px ${15 + (isMiraMode ? 8 : score * 0.3)}px ${orbGlow}`,
            borderRadius: "50%",
            opacity: glowIntensity,
          }}
        />
        {/* Orb body — static */}
        <div
          className="absolute"
          style={{
            width: "72%",
            height: "72%",
            borderRadius: "52% 48% 50% 50%",
            background: `radial-gradient(circle at 35% 35%, ${colors.colorSecondary}, ${colors.color} 55%, #050505 100%)`,
            boxShadow: `0 0 ${30 + (isMiraMode ? 15 : score * 0.5)}px ${8 + (isMiraMode ? 4 : score * 0.1)}px ${orbGlow}`,
          }}
        />
        {/* Telemetry labels */}
        <div
          className="absolute top-2 font-mono tracking-widest text-center w-full"
          style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
        >
          {isMiraMode && miraPalette ? miraPalette.label : "AUTONOMIC PATHWAYS"}
        </div>
        <div
          className="absolute bottom-2 font-mono tracking-widest text-center w-full"
          style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
        >
          {isMiraMode && presence ? presence.message.slice(0, 32).toUpperCase() :
           score >= 61 ? "STRESS LOAD CRITICAL" : score >= 41 ? "STRESS LOAD ELEVATED" : "STRESS LOAD NOMINAL"}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: orbSize, height: orbSize }}
      role="img"
      aria-label={isMiraMode && presence ? `${presence.label}: ${presence.message}` : `Debt score ${score}`}
    >
      {/* Ambient glow (outer) — intensity tracks score in debt mode, posture in Mira mode */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 ${50 + (isMiraMode ? 20 : score)}px ${15 + (isMiraMode ? 8 : score * 0.3)}px ${orbGlow}`,
          borderRadius: "50%",
        }}
        animate={{ opacity: [glowIntensity * 0.5, glowIntensity, glowIntensity * 0.5] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer ring — breathes at mode-dependent rate */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${ringColor}` }}
        animate={{ scale: [1, 1 + (pulseDepth - 1) * 1.6, 1], opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: pulseDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Mid ring — offset phase, chaotic at high debt, calm in Mira mode */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: "8%",
          border: `1px solid ${isMiraMode ? ringColor : `${colors.color}15`}`,
        }}
        animate={{
          scale: [1, 1 + (pulseDepth - 1) * 1.3, 1],
          opacity: [0.12, 0.45, 0.12],
          rotate: isMiraMode ? [0, 1, -1, 0] : score >= 75 ? [0, 5, -5, 0] : [0, 2, -2, 0],
        }}
        transition={{
          scale: { duration: pulseDuration, repeat: Infinity, ease: "easeInOut", delay: pulseDuration * 0.25 },
          opacity: { duration: pulseDuration, repeat: Infinity, ease: "easeInOut", delay: pulseDuration * 0.25 },
          rotate: { duration: pulseDuration * 2, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* High-debt heartbeat spike layer — debt mode only */}
      {!isMiraMode && score >= 61 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${colors.color}40`,
          }}
          animate={{
            scale: [1, 1.25, 1.45, 1],
            opacity: [0, 0.4, 0, 0],
          }}
          transition={{
            duration: pulseDuration * 1.2,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.15, 0.3, 1],
          }}
        />
      )}

      {/* Mira offering radiating dots — Mira mode only */}
      {isMiraMode && presence?.posture === "offering" && (
        <>
          {[0, 120, 240].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                backgroundColor: miraPalette?.coreSecondary,
                boxShadow: `0 0 8px ${miraPalette?.glow}`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0.5],
                x: [0, Math.cos((angle * Math.PI) / 180) * (orbSize * 0.55), Math.cos((angle * Math.PI) / 180) * (orbSize * 0.7)],
                y: [0, Math.sin((angle * Math.PI) / 180) * (orbSize * 0.55), Math.sin((angle * Math.PI) / 180) * (orbSize * 0.7)],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Main orb body — morphs based on turbulence level */}
      <motion.div
        className="absolute"
        style={{
          width: "72%",
          height: "72%",
          background: `radial-gradient(circle at 35% 35%, ${colors.colorSecondary}, ${colors.color} 55%, #050505 100%)`,
          boxShadow: `0 0 ${30 + (isMiraMode ? 15 : score * 0.5)}px ${8 + (isMiraMode ? 4 : score * 0.1)}px ${orbGlow}`,
        }}
        animate={{
          borderRadius: turbulenceFrames,
          scale: [1, pulseDepth, 1],
        }}
        transition={{
          borderRadius: {
            duration: turbulenceDuration,
            repeat: Infinity,
            ease: "easeInOut",
          },
          scale: {
            duration: pulseDuration,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
      />

      {/* Inner light shimmer */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "50%",
          height: "50%",
          background:
            "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.1), transparent 70%)",
          mixBlendMode: "screen",
        }}
        animate={{ opacity: [0.3, 0.8, 0.3], rotate: [0, 360] }}
        transition={{
          opacity: { duration: pulseDuration * 0.8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: isMiraMode ? 18 : score >= 75 ? 8 : 14, repeat: Infinity, ease: "linear" },
        }}
      />

      {/* Telemetry labels */}
      <div
        className="absolute top-2 font-mono tracking-widest text-center w-full"
        style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
      >
        {isMiraMode && miraPalette ? miraPalette.label : "AUTONOMIC PATHWAYS"}
      </div>
      <motion.div
        className="absolute bottom-2 font-mono tracking-widest text-center w-full"
        style={{ fontSize: "6px", color: "rgba(168,162,158,0.25)" }}
        animate={{ opacity: !isMiraMode && score >= 61 ? [0.3, 0.7, 0.3] : 0.25 }}
        transition={{ duration: pulseDuration * 0.7, repeat: Infinity, ease: "easeInOut" }}
      >
        {isMiraMode && presence ? presence.message.slice(0, 32).toUpperCase() :
         score >= 61 ? "STRESS LOAD CRITICAL" : score >= 41 ? "STRESS LOAD ELEVATED" : "STRESS LOAD NOMINAL"}
      </motion.div>
    </div>
  );
}
