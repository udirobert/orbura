"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { auth } from "@/lib/sdk/eazo-client";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";
import { PrimaryButton } from "@/components/PrimaryButton";

/**
 * GuestAuthCard — upgrade path for guests.
 *
 * Auth.js is live: sign-in unlocks heatmap, past scores, coach memory,
 * and preference sync across devices. Guest mode still works locally.
 */
export function GuestAuthCard() {
  const handleSignIn = () => {
    const callbackUrl =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    auth.login(callbackUrl).catch(() => undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_PROTOCOL }}
      className="relative z-10 mt-6 rounded-2xl p-4"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(234,88,12,0.18)" }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Lock className="w-3 h-3" style={{ color: "var(--color-brand-primary)" }} />
        <span
          className="text-[9px] font-mono uppercase tracking-widest font-semibold"
          style={{ color: "var(--color-brand-primary)" }}
        >
          Unlock more
        </span>
      </div>
      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Sign in to keep your recovery history
      </p>
      <p className="text-[10px] leading-relaxed mb-3" style={{ color: "var(--color-text-secondary)" }}>
        Heatmap, past scores, and coach memory sync across devices. This session
        still works as a guest — signing in just unlocks depth.
      </p>
      <PrimaryButton size="sm" onClick={handleSignIn}>
        Sign in to unlock
      </PrimaryButton>
    </motion.div>
  );
}
