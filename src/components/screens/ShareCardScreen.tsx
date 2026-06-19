"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { auth, memory, share } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

// ─── Score colour helpers ────────────────────────────────────────────────────

function orbColor(score: number): string {
  if (score >= 61) return "#DC2626";
  if (score >= 41) return "#EA580C";
  return "#F59E0B";
}

function orbGradient(score: number): string {
  const c = orbColor(score);
  const mid = score >= 61 ? "#991B1B" : score >= 41 ? "#C2410C" : "#D97706";
  return `radial-gradient(circle at 38% 35%, ${c}, ${mid} 55%, #0A0A0B 100%)`;
}

function scoreLabel(score: number): string {
  if (score >= 81) return "Damage control";
  if (score >= 61) return "Working overtime";
  if (score >= 41) return "Elevated burden";
  if (score >= 21) return "Mild debt";
  return "Body is clear";
}

function formatTimeUntilCleared(clearedAt: string): string {
  const diff = new Date(clearedAt).getTime() - Date.now();
  if (diff <= 0) return "Already cleared";
  const hours = Math.floor(diff / 3600000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rh = hours % 24;
    return rh > 0 ? `${days}d ${rh}h to cleared` : `${days}d to cleared`;
  }
  if (hours > 0) {
    const minutes = Math.floor((diff % 3600000) / 60000);
    return minutes > 0 ? `${hours}h ${minutes}m to cleared` : `${hours}h to cleared`;
  }
  const minutes = Math.floor(diff / 60000);
  return `${minutes}m to cleared`;
}

// ─── Animated score counter ───────────────────────────────────────────────────

function CountUpScore({ target, color }: { target: number; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1400;
    const animate = (ts: number) => {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(target * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  return (
    <span style={{ color, fontFamily: "var(--font-heading)", fontSize: "clamp(5rem, 22vw, 7rem)", lineHeight: 1, letterSpacing: "-0.03em" }}>
      {displayed}
    </span>
  );
}

// ─── The share card (static visual exported as a screenshot-worthy surface) ───

function ShareCardVisual({
  score,
  verdict,
  recoveryTime,
  recoveryArc,
  revealing,
}: {
  score: number;
  verdict: string;
  recoveryTime: string;
  recoveryArc?: { dangerEnds: string; partialEnds: string; clearedAt: string };
  revealing: boolean;
}) {
  const color = orbColor(score);
  const label = scoreLabel(score);

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl flex flex-col items-center"
      style={{
        // Instagram Stories 9:16 proportion — 360×640 reference
        aspectRatio: "9/16",
        maxWidth: 360,
        backgroundColor: "#0A0A0B",
        border: "1px solid rgba(168,162,158,0.12)",
        padding: "40px 28px 36px",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 38%, ${color}22 0%, transparent 70%)`,
        }}
      />

      {/* App name */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealing ? 0 : 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="relative z-10 w-full mb-auto"
      >
        <span
          className="text-[9px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: "#524F4C" }}
        >
          BODY DEBT
        </span>
      </motion.div>

      {/* Orb — forms from a point */}
      <motion.div
        initial={{ scale: 0.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative z-10 flex-shrink-0"
        style={{ width: "52%", aspectRatio: "1" }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: orbGradient(score), filter: "blur(18px)", opacity: 0.45 }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb body */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: orbGradient(score) }}
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Inner highlight */}
        <div
          className="absolute rounded-full"
          style={{
            width: "38%", height: "28%",
            top: "16%", left: "16%",
            background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="relative z-10 mt-5 text-center"
      >
        {revealing ? (
          <span style={{ color, fontFamily: "var(--font-heading)", fontSize: "clamp(5rem, 22vw, 7rem)", lineHeight: 1, letterSpacing: "-0.03em" }}>
            —
          </span>
        ) : (
          <CountUpScore target={score} color={color} />
        )}
      </motion.div>

      {/* Score band label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: revealing ? 0 : 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="relative z-10 text-[9px] uppercase tracking-[0.18em] font-semibold mt-1"
        style={{ color }}
      >
        {label}
      </motion.p>

      {/* Separator */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: revealing ? 0 : 1, opacity: revealing ? 0 : 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="relative z-10 w-full my-4"
        style={{ height: 1, backgroundColor: "rgba(168,162,158,0.12)", transformOrigin: "left" }}
      />

      {/* Verdict */}
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: revealing ? 0 : 1, y: revealing ? 6 : 0 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="relative z-10 text-center font-normal leading-snug"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(1rem, 4.5vw, 1.25rem)",
          color: "#F5F5F4",
          maxWidth: "88%",
        }}
      >
        {verdict}
      </motion.p>

      {/* Recovery time */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: revealing ? 0 : 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="relative z-10 mt-3 text-[10px] font-mono uppercase tracking-widest"
        style={{ color: "#524F4C" }}
      >
        Cleared: {recoveryTime}
      </motion.p>

      {/* Recovery arc timeline */}
      {recoveryArc && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: revealing ? 0 : 1, scaleX: revealing ? 0 : 1 }}
          transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
          className="relative z-10 mt-4 w-full"
          style={{ transformOrigin: "left" }}
        >
          <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-wider"
            style={{ color: "#3a3835" }}>
            <span>Now</span>
            <span>Danger</span>
            <span>Recovering</span>
            <span>Cleared</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden flex"
            style={{ backgroundColor: "rgba(168,162,158,0.08)" }}>
            <motion.div
              className="h-full"
              style={{ backgroundColor: "#DC2626", width: "33%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: revealing ? 0 : 1 }}
              transition={{ delay: 1.1, duration: 0.4 }}
            />
            <motion.div
              className="h-full"
              style={{ backgroundColor: "#F59E0B", width: "33%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: revealing ? 0 : 1 }}
              transition={{ delay: 1.25, duration: 0.4 }}
            />
            <motion.div
              className="h-full"
              style={{ backgroundColor: "#4ADE80", width: "34%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: revealing ? 0 : 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            />
          </div>
          <div className="mt-1 text-[8px] font-mono text-center"
            style={{ color: "#524F4C" }}>
            {formatTimeUntilCleared(recoveryArc.clearedAt)}
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: revealing ? 0 : 1 }}
        transition={{ delay: 1.05, duration: 0.5 }}
        className="relative z-10 mt-auto pt-5 flex items-center justify-between w-full"
      >
        <span className="text-[8px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#3a3835" }}>
          bodydebt.app
        </span>
        <span className="text-[8px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#3a3835" }}>
          What&apos;s yours?
        </span>
      </motion.div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ShareCardScreen() {
  const router = useRouter();
  const { analysis, streakDays } = useBodyDebtStore();
  const user = useEazo((s) => s.auth.user);
  const isGuest = !user && !!analysis;
  const [revealing, setRevealing] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareDone, setShareDone] = useState(false);

  const score = analysis?.debtScore ?? 72;
  const verdict = analysis?.verdict ?? "Your body is working overtime right now.";
  const recoveryTime = analysis?.recoveryTime ?? "6pm tonight";

  const appId = process.env.NEXT_PUBLIC_EAZO_APP_ID ?? "";

  // "Developing" reveal — orb forms, then score counts up
  useEffect(() => {
    const t = setTimeout(() => setRevealing(false), 500);
    return () => clearTimeout(t);
  }, []);

  const handleShare = async () => {
    if (sharing || shareDone) return;
    setSharing(true);
    setShareError(null);

    const shareText = `My body debt today: ${score}. ${formatTimeUntilCleared(analysis?.recoveryArc?.clearedAt ?? new Date(Date.now() + 6 * 3600000).toISOString())} What's yours?`;
    const contextLines = [
      verdict,
      `Cleared: ${recoveryTime}`,
      "bodydebt.app",
    ].join("\n");

    try {
      await share.compose({
        text: `${shareText}\n\n${contextLines}`,
        sourceAppId: appId,
        targetPath: "/dashboard",
      });
      setShareDone(true);
      memory.reportAction({
        content: `User shared score. Score: ${score}. ${verdict}`,
        event_type: "share",
        page: "share-card",
        metadata: { type: "share_score", debt_score: score },
      }).catch(() => {});
    } catch {
      // share.compose() rejects when running outside Eazo Mobile (web fallback)
      // Use Web Share API as secondary fallback
      if (navigator.share) {
        try {
          await navigator.share({
            title: "BODY DEBT",
            text: `${shareText}\n\n${verdict}`,
            url: "https://bodydebt.app",
          });
          setShareDone(true);
        } catch {
          // User cancelled native share — not an error
          setSharing(false);
          return;
        }
      } else {
        // Clipboard fallback
        try {
          await navigator.clipboard.writeText(`${shareText}\n\n${verdict}\nbodydebt.app`);
          setShareDone(true);
        } catch {
          setShareError("Couldn't open the share sheet. Try copying manually.");
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const color = orbColor(score);

  return (
    <div
      className="relative min-h-svh flex flex-col items-center px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Background bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 20%, ${color}18 0%, transparent 65%)`,
        }}
      />

      {/* Close */}
      <div className="relative z-10 w-full flex justify-end pt-12 pb-4">
        <button
          onClick={() => router.back()}
          style={{ color: "#524F4C", minHeight: 44, minWidth: 44 }}
          className="flex items-center justify-end"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full flex justify-center flex-1">
        <ShareCardVisual
          score={score}
          verdict={verdict}
          recoveryTime={recoveryTime}
          recoveryArc={analysis?.recoveryArc}
          revealing={revealing}
        />
      </div>

      {/* Social proof + CTA */}
      <div className="relative z-10 w-full pb-10 pt-6 space-y-3 max-w-sm mx-auto">
        {/* Social proof nudge */}
        <AnimatePresence>
          {!revealing && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.4 }}
              className="text-center text-[11px]"
              style={{ color: "#524F4C" }}
            >
              {streakDays > 0
                ? `${streakDays} day${streakDays !== 1 ? "s" : ""} under 20. Keep the streak alive.`
                : "Your friends would want to know their score."}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Primary share CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: revealing ? 0 : 1, y: revealing ? 8 : 0 }}
          transition={{ delay: 1.1, duration: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          disabled={sharing}
          className="w-full font-semibold rounded-2xl flex items-center justify-center gap-2"
          style={{
            backgroundColor: shareDone ? "rgba(74,222,128,0.15)" : color,
            color: shareDone ? "#4ADE80" : "#F5F5F4",
            border: shareDone ? "1.5px solid rgba(74,222,128,0.4)" : "none",
            fontFamily: "var(--font-body)",
            minHeight: "62px",
            fontSize: "0.9rem",
            letterSpacing: "0.02em",
            transition: "background-color 0.3s, color 0.3s",
          }}
        >
          {sharing ? (
            <span className="opacity-70">Opening share sheet…</span>
          ) : shareDone ? (
            "Shared ✓"
          ) : (
            <>
              <span>Share your score</span>
              <span className="text-xs opacity-70 font-normal">
                · {score > 60 ? "They should see this" : score > 30 ? "Show them your number" : "Show someone what clean feels like"}
              </span>
            </>
          )}
        </motion.button>

        {/* Error */}
        <AnimatePresence>
          {shareError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs"
              style={{ color: "#DC2626" }}
            >
              {shareError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Auth upgrade */}
        {isGuest && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.25)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#F5F5F4" }}>
              Your data is saved on this device
            </p>
            <p className="text-[10px] mb-3" style={{ color: "#A8A29E" }}>
              Sign in to keep your history across devices and unlock AI-powered insights.
            </p>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => auth.login().catch(() => undefined)}
              className="text-xs font-semibold px-5 py-2.5 rounded-xl"
              style={{ backgroundColor: "#EA580C", color: "#F5F5F4" }}>
              Sign in to save
            </motion.button>
          </motion.div>
        )}

        {/* Recovery reminder CTA — closes the loop */}
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/prescription")}
          className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2"
          style={{
            backgroundColor: "#141416",
            color: "#F5F5F4",
            border: "1px solid rgba(234,88,12,0.2)",
            fontFamily: "var(--font-body)",
            minHeight: 52,
          }}
        >
          Set recovery reminder
        </motion.button>

        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-[10px] uppercase tracking-widest py-2 font-medium"
          style={{ color: "#3a3835" }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
