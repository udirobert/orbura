"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface SignalUpsellCardProps {
  /** Visual treatment: "primary" (solid orange CTA) or "subtle" (bordered). */
  variant?: "primary" | "subtle";
  /** Subtitle copy override. */
  subtitle?: string;
  /** Animation delay in seconds. */
  delay?: number;
}

/**
 * SignalUpsellCard — shown when confidenceTier is "partial" or
 * "estimated". Invites the user to give their orb more signal via
 * face scan and/or wearable data. Centralizes the gate logic and
 * the CTA route so the upsell stays consistent between dashboard
 * and prescription.
 */
export function SignalUpsellCard({
  variant = "primary",
  subtitle,
  delay = 0,
}: SignalUpsellCardProps) {
  const router = useRouter();

  const isPrimary = variant === "primary";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="rounded-2xl p-4 text-center"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: isPrimary
          ? "1px solid rgba(234,88,12,0.2)"
          : "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
        {isPrimary ? "I can see more if you let me." : "“I can see more if you let me.”"}
      </p>
      <p className="text-[10px] mb-3" style={{ color: "var(--color-text-faint)" }}>
        {subtitle ?? (isPrimary
          ? "Connect your watch and camera for a full picture."
          : "Face scan + wearable data makes this prescription 3× more precise.")}
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/face-scan")}
        className="text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-xl"
        style={isPrimary
          ? { backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-primary)" }
          : {
              backgroundColor: "rgba(234,88,12,0.15)",
              color: "var(--color-brand-primary)",
              border: "1px solid rgba(234,88,12,0.3)",
            }}
      >
        Give your orb more signal
      </motion.button>
    </motion.div>
  );
}
