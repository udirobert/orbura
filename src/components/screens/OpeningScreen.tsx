"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, Tv } from "lucide-react";
import { SIGNAL_ICONS } from "@/lib/signal-icons";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory, auth } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { getWearableTrend, getLatestIntervention, respondToIntervention } from "@/lib/api";
import type { PendingIntervention, InterventionOutcome } from "@/lib/api";
import { useMemoryContext } from "@/hooks/useMemoryContext";
import { UserBadge } from "@/components/user-profile/user-badge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Collapse } from "@/components/ui/collapse";
import type { RecoveryMode } from "@/lib/types";
import { EASE_PROTOCOL, useSquishProps } from "@/lib/motion/protocol";
import { haptic } from "@/lib/haptics";

const DORMANT_FRAMES = [
  "52% 48% 50% 50% / 50% 52% 48% 50%",
  "50% 50% 52% 48% / 52% 48% 50% 50%",
  "48% 52% 50% 50% / 50% 50% 52% 48%",
  "50% 50% 48% 52% / 48% 52% 50% 50%",
];

const SECONDARY_MODES: { mode: RecoveryMode; label: string; blurb: string; Icon: typeof Trophy }[] = [
  { mode: "football", label: "Match Fit", blurb: "Squad match-day readiness", Icon: Trophy },
  { mode: "fan", label: "Fan Recovery", blurb: "Post-match wind-down", Icon: Tv },
];

export function OpeningScreen() {
  const router = useRouter();
  const { analysis, setHasSeenOpening, setMode, hasSeenOpening, lastWakeTime, lastBedTime, streakDays } =
    useBodyDebtStore();
  const { data: memoryData } = useMemoryContext("user body debt recovery patterns and habits");
  const user = useEazo((s) => s.auth.user);
  const [orbVisible, setOrbVisible] = useState(false);
  const [copyVisible, setCopyVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [trendSignal, setTrendSignal] = useState<string | null>(null);
  const [trendChecked, setTrendChecked] = useState(false);
  const [intervention, setIntervention] = useState<PendingIntervention | null>(null);
  const [interventionOutcome, setInterventionOutcome] = useState<InterventionOutcome | null>(null);
  const [interventionChecked, setInterventionChecked] = useState(false);
  const [interventionAnswered, setInterventionAnswered] = useState<"did" | "skipped" | null>(null);
  const [modesOpen, setModesOpen] = useState(false);
  const squish = useSquishProps();

  // Strip the [YYYY-MM-DD] stamps Supermemory adds to stored events, then drop
  // action-log noise — both "User did X" lines and passive variants like
  // "Personal check-in was started from the welcome screen." Only durable
  // facts and preferences should render here.
  const stripStamp = (m: string) => m.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "").trim();
  const isNoise = (m: string) =>
    !m ||
    m.includes("anonymousId") ||
    m.includes("memory_migration") ||
    m.startsWith("User ") ||
    /check-in|welcome screen|\bwas (started|logged|recorded|opened|initiated|completed|connected|viewed)\b|from the \w+ screen/i.test(
      m,
    );
  const rawMemories = memoryData?.memories ?? [];
  const usefulMemories = rawMemories.map(stripStamp).filter((m) => !isNoise(m));
  const profileFacts = (memoryData?.profile ?? "")
    .split("\n")
    .map(stripStamp)
    .filter((m) => !isNoise(m));
  const memoryReturning =
    memoryData?.enabled && (profileFacts.length > 0 || usefulMemories.length > 0);
  const localReturning = hasSeenOpening || streakDays > 0 || !!(lastWakeTime && lastBedTime);
  const isReturning = memoryReturning || localReturning;
  const memorySummary = memoryReturning
    ? (profileFacts[0] || usefulMemories[0] || "").trim()
    : "";
  const sleepHabit =
    lastWakeTime && lastBedTime ? `${lastBedTime} → ${lastWakeTime}` : null;

  // One context line, chosen by priority — never a stack of competing captions.
  // The icon carries the domain so the text can stay short. A pending
  // follow-through card outranks the line entirely — it IS the signal.
  const showIntervention = isReturning && !!user && !!intervention;
  const signalLine = !isReturning || (user && !interventionChecked) || showIntervention
    ? null
    : trendSignal
      ? {
          Icon: streakDays > 0 ? SIGNAL_ICONS.streak : SIGNAL_ICONS.hrv,
          text: streakDays > 0 ? `${streakDays}d streak · ${trendSignal}` : trendSignal,
        }
      : memorySummary
        ? { Icon: SIGNAL_ICONS.memory, text: memorySummary, coachLink: true }
        : user && trendChecked
          ? { Icon: SIGNAL_ICONS.wearable, text: "No wearable history yet · connect a device during check-in" }
          : sleepHabit
            ? { Icon: SIGNAL_ICONS.sleep, text: `Usual sleep · ${sleepHabit}` }
            : streakDays > 0
              ? { Icon: SIGNAL_ICONS.streak, text: `${streakDays}d streak · keep the chain going`, success: true }
              : null;

  useEffect(() => {
    if (analysis) {
      router.replace("/dashboard");
      return;
    }
    router.prefetch("/wake-time");
    router.prefetch("/intake");
    const t1 = setTimeout(() => setOrbVisible(true), 120);
    const t2 = setTimeout(() => setCopyVisible(true), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [analysis, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getWearableTrend(7)
      .then((res) => {
        if (cancelled) return;
        const hrvNights = res.trend.filter((p) => p.hrv != null);
        const last = hrvNights[hrvNights.length - 1];
        if (!last?.hrv) return;
        if (hrvNights.length < 3) {
          setTrendSignal(
            `Baseline building · ${hrvNights.length}/3 nights · HRV ${last.hrv} ms last night`,
          );
          return;
        }
        const prior = hrvNights.slice(0, -1);
        const avg = prior.length
          ? Math.round(prior.reduce((a, p) => a + (p.hrv ?? 0), 0) / prior.length)
          : null;
        if (avg) {
          const delta = Math.round(((last.hrv - avg) / avg) * 100);
          const dir = delta <= -5 ? "below" : delta >= 5 ? "above" : "near";
          setTrendSignal(
            `HRV ${last.hrv} ms · ${Math.abs(delta)}% ${dir} your ${hrvNights.length}-night avg`,
          );
        } else {
          setTrendSignal(
            `Last night: HRV ${last.hrv} ms${last.restingHr ? ` · resting HR ${last.restingHr} bpm` : ""}`,
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTrendChecked(true);
      });
    getLatestIntervention()
      .then((res) => {
        if (cancelled) return;
        setIntervention(res.intervention);
        setInterventionOutcome(res.outcome);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setInterventionChecked(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  const answerIntervention = (adherence: "did" | "skipped") => {
    if (!intervention) return;
    haptic("light");
    setInterventionAnswered(adherence);
    respondToIntervention(intervention.sessionId, adherence).catch(() => {});
    memory.reportAction({
      content: `User ${adherence === "did" ? "followed" : "skipped"} yesterday's recovery action: ${intervention.action}`,
      event_type: "create",
      page: "opening",
      metadata: { type: "intervention_response", adherence, sessionId: intervention.sessionId },
    }).catch(() => {});
  };

  const handleSelectMode = (mode: RecoveryMode) => {
    setMode(mode);
    setHasSeenOpening(true);
    setExiting(true);
    router.prefetch("/wake-time");
    memory
      .reportAction({
        content: `Started a ${mode === "personal" ? "personal" : mode === "football" ? "Match Fit" : "Fan Recovery"} check-in from the welcome screen.`,
        event_type: "start",
        page: "opening",
        metadata: { type: "start_session", mode },
      })
      .catch(() => {});
    router.push("/wake-time");
  };

  return (
    <motion.div
      className="relative min-h-svh flex flex-col items-center overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.38 }}
    >
      {/* Full-bleed amber glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "32%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "480px",
          height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="absolute top-4 right-4 z-20">
        <UserBadge />
      </div>

      {/* Hero: brand + orb + hook */}
      <div
        className="relative z-10 w-full flex flex-col items-center px-8"
        style={{ paddingTop: "18vh" }}
      >
        <AnimatePresence>
          {orbVisible && (
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: EASE_PROTOCOL }}
              className="relative flex items-center justify-center mb-8"
              style={{ width: "42vw", maxWidth: 168, height: "42vw", maxHeight: 168 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 80px 28px rgba(245,158,11,0.15)" }}
                animate={{ opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: "74%",
                  height: "74%",
                  background:
                    "radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 55%, #1a0800 100%)",
                  boxShadow: "0 0 50px 12px rgba(245,158,11,0.2)",
                }}
                animate={{ borderRadius: DORMANT_FRAMES, scale: [1, 1.025, 1] }}
                transition={{
                  borderRadius: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "46%",
                  height: "46%",
                  background:
                    "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.13), transparent 65%)",
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {copyVisible && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_PROTOCOL }}
              className="text-center max-w-sm"
            >
              <h1
                className="tracking-[0.22em] font-semibold uppercase mb-5"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.35rem, 5.5vw, 1.65rem)",
                  color: "var(--color-text-primary)",
                  letterSpacing: "0.18em",
                }}
              >
                Orbura
              </h1>
              <p
                className="leading-snug"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.05rem, 4vw, 1.25rem)",
                  color: "var(--color-text-secondary)",
                  letterSpacing: "0.01em",
                }}
              >
                {isReturning
                  ? "Welcome back. Ready to check today's recovery?"
                  : "Your body keeps the score."}
              </p>
              {!isReturning && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Connect a wearable or import your health data. Get one safe action, calibrated to your own baseline.
                </p>
              )}
              {!isReturning && (
                <button
                  type="button"
                  onClick={() => router.push("/coach-memory")}
                  className="mt-4 text-[10px] font-mono tracking-wide underline-offset-2 hover:underline"
                  style={{ color: "var(--color-system-muscular)" }}
                >
                  How your coach learns over time →
                </button>
              )}
              {!isReturning && (
                <button
                  type="button"
                  onClick={() => router.push("/preview")}
                  className="mt-2 text-[9px] font-mono"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  See a full example session →
                </button>
              )}
              {isReturning && user && intervention && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE_PROTOCOL }}
                  className="mt-3 w-full rounded-2xl px-4 py-3 text-left"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {interventionAnswered ? (
                    <p
                      className="text-[10px] font-mono"
                      style={{ color: "var(--color-states-success)" }}
                    >
                      ✓ Logged{interventionAnswered === "did" ? " — nice follow-through" : " — your coach will adjust"}
                    </p>
                  ) : (
                    <>
                      <p
                        className="text-[9px] font-mono uppercase tracking-widest"
                        style={{ color: "var(--color-text-faint)" }}
                      >
                        {(() => {
                          const days = Math.round(
                            (new Date().setHours(0, 0, 0, 0) -
                              new Date(`${intervention.date}T00:00:00`).getTime()) / 86400000,
                          );
                          return days <= 1 ? "Yesterday's plan" : `Plan from ${days}d ago`;
                        })()} · score {intervention.debtScore}
                      </p>
                      <p
                        className="text-xs mt-1 leading-snug"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {intervention.action}
                      </p>
                      {interventionOutcome && (
                        <p
                          className="text-[10px] font-mono mt-1.5 flex items-center gap-1.5"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <SIGNAL_ICONS.hrv className="w-3 h-3" aria-hidden />
                          HRV {interventionOutcome.hrvBefore ?? "?"} → {interventionOutcome.hrvAfter} ms
                        </p>
                      )}
                      <div className="flex gap-2 mt-2.5">
                        <motion.button
                          {...squish}
                          type="button"
                          onClick={() => answerIntervention("did")}
                          className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--color-states-success) 12%, transparent)",
                            color: "var(--color-states-success)",
                            border: "1px solid color-mix(in srgb, var(--color-states-success) 25%, transparent)",
                          }}
                        >
                          Did it
                        </motion.button>
                        <motion.button
                          {...squish}
                          type="button"
                          onClick={() => answerIntervention("skipped")}
                          className="flex-1 rounded-xl py-2 text-[11px] font-semibold"
                          style={{
                            backgroundColor: "var(--color-bg-base)",
                            color: "var(--color-text-secondary)",
                            border: "1px solid var(--color-border-subtle)",
                          }}
                        >
                          Skipped
                        </motion.button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
              {isReturning && signalLine && (
                <>
                  <p
                    className="mt-3 text-[11px] font-mono leading-relaxed flex items-center justify-center gap-1.5"
                    style={{
                      color: signalLine.success
                        ? "var(--color-states-success)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    <signalLine.Icon className="w-3 h-3 flex-shrink-0" aria-hidden />
                    <span>
                      {signalLine.text.length > 110
                        ? signalLine.text.slice(0, 110) + "…"
                        : signalLine.text}
                    </span>
                  </p>
                  {signalLine.coachLink && (
                    <button
                      type="button"
                      onClick={() => router.push("/coach-memory")}
                      className="mt-1.5 text-[9px] font-mono flex items-center gap-1 mx-auto"
                      style={{ color: "var(--color-system-muscular)" }}
                    >
                      <SIGNAL_ICONS.memory className="w-2.5 h-2.5" aria-hidden />
                      How your coach uses this →
                    </button>
                  )}
                </>
              )}
              {isReturning && !user && (
                <button
                  type="button"
                  onClick={() => auth.login().catch(() => undefined)}
                  className="mt-3 text-[10px] font-mono underline-offset-2 hover:underline flex items-center justify-center gap-1.5"
                  style={{ color: "var(--color-system-muscular)" }}
                >
                  <SIGNAL_ICONS.auth className="w-3 h-3" aria-hidden />
                  Sign in to keep your history and build a personal baseline →
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary path + quiet mode links */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-end px-6 pb-10">
        <AnimatePresence>
          {copyVisible && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12, ease: EASE_PROTOCOL }}
              className="flex flex-col gap-5"
            >
              <PrimaryButton
                size="lg"
                shimmer
                onClick={() => handleSelectMode("personal")}
              >
                {isReturning ? "Check today's recovery" : "Check my recovery"}
              </PrimaryButton>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setModesOpen((v) => !v);
                  }}
                  aria-expanded={modesOpen}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: "var(--color-text-faint)", minHeight: 32 }}
                >
                  Different context?
                  <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{
                      transform: modesOpen ? "rotate(180deg)" : "none",
                      transitionDuration: "var(--duration-collapse)",
                    }}
                  />
                </button>
                <Collapse open={modesOpen} className="w-full">
                  <div className="flex flex-col gap-1.5 pt-1">
                    {SECONDARY_MODES.map((m) => (
                      <motion.button
                        key={m.mode}
                        type="button"
                        {...squish}
                        onPointerDown={() => haptic("light")}
                        onClick={() => handleSelectMode(m.mode)}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left"
                        style={{
                          backgroundColor: "var(--color-bg-surface)",
                          border: "1px solid var(--color-border-subtle)",
                        }}
                      >
                        <span
                          className="flex items-center gap-2 text-[12px] font-medium"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <m.Icon
                            className="w-3.5 h-3.5"
                            style={{ color: "var(--color-text-faint)" }}
                            aria-hidden
                          />
                          {m.label}
                        </span>
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: "var(--color-text-faint)" }}
                        >
                          {m.blurb}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </Collapse>
              </div>

              <p
                className="text-center text-[10px] tracking-widest uppercase font-mono"
                style={{ color: "var(--color-text-faint)" }}
              >
                {isReturning
                  ? "Self-hosted QVAC · Your memory, your control"
                  : "No account required · Your score is computed locally first"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
