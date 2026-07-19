"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";
import { memory } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { DebtOrb } from "./DebtOrb";
import { MiniOrb } from "@/components/MiniOrb";
import { DebtGauge } from "./DebtGauge";
import { RecoveryTimeline } from "./RecoveryTimeline";
import { DonutChart, BarChartView } from "./StressorBreakdownChart";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { orburaPresence } from "@/lib/mira/orbura-mapping";
import type { MiraPresence } from "@/lib/mira/contract";
import { SystemPanels } from "@/components/SystemPanels";
import { SystemClearanceNotifier } from "@/components/SystemClearanceNotifier";
import { PersonalityPicker } from "./personality-picker";
import { DebtHistory } from "./debt-history";
import { ScoreHeatmap } from "./score-heatmap";
import { NotificationsToggle } from "@/components/notifications/notifications-toggle";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { getOrbCopy, getPersonality } from "@/lib/orbPersonality";
import { getStrings } from "@/lib/i18n";
import { bandMeta, bandLabel } from "@/lib/debt-band";
import { useRecoveryContext } from "@/lib/contexts/RecoveryContext";
import { ModeToggle } from "@/components/ModeToggle";
import { SquadPanel } from "./SquadScreen";
import { GuestAuthCard } from "@/components/GuestAuthCard";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SignalUpsellCard } from "@/components/SignalUpsellCard";
import { generateRecoveryIcs, downloadIcs } from "@/lib/ics";
import { RecoverySchedule } from "@/components/screens/RecoverySchedule";
import { ConfidenceSignal } from "./dashboard/ConfidenceSignal";
import { VerdictCard } from "./dashboard/VerdictCard";
import { SystemIconRow } from "./dashboard/SystemIconRow";
import { PatternLayer } from "./dashboard/PatternLayer";
import { AgentSchedule } from "./dashboard/AgentSchedule";
import { MemoryCard } from "./dashboard/MemoryCard";
import { useMemoryContext } from "@/hooks/useMemoryContext";
import { useMemoryContainerTag } from "@/hooks/useMemoryContainerTag";
import type { DebtAnalysis, ConfidenceTier } from "@/lib/types";

const IS_TEST_ENV = process.env.NODE_ENV === "test";

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_ANALYSIS: DebtAnalysis = {
  debtScore: 0,
  verdict: "Your debt orb is dormant — no check-in to read yet.",
  recoveryTime: "now",
  prescription: {
    rightNow:    "Start a check-in to wake the orb and get a recovery plan.",
    thisMorning: "Two minutes of input beats guessing your recovery.",
    today:       "A clear baseline starts with one honest log.",
    avoid:       "Skipping your check-in means flying blind today.",
  },
  stressorBreakdown: [],
  recoveryArc: {
    dangerEnds:  new Date().toISOString(),
    partialEnds: new Date().toISOString(),
    clearedAt:   new Date().toISOString(),
  },
  confidenceLevel: "low",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// (ConfidenceSignal, VerdictCard moved to dashboard/ subdirectory)

// ─── Verdict card — imported from dashboard/ subdirectory

// ─── System icon quick-nav — imported from dashboard/ subdirectory

// ─── Stressor breakdown (collapsible) — replaced by DonutChart/BarChartView

// ─── Pattern layer (streak) — imported from dashboard/ subdirectory

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function DashboardScreen() {
  const router = useRouter();
  const {
    analysis, selectedStressors, reset, isAnalyzing,
    hrvData, faceAnalysis, zkProof,
    streakDays, confidenceTier,
    orbPersonality, agentEvents, agentProgress, memoryRecall,
    previewMode, exitPreview,
    locale,
  } = useBodyDebtStore();

  const ctx = useRecoveryContext();
  const user = useEazo((s) => s.auth.user);
  const { data: memoryData, refetch: refetchMemory } = useMemoryContext();
  const memoryContainerTag = useMemoryContainerTag();
  const data: DebtAnalysis = analysis ?? FALLBACK_ANALYSIS;
  const isEmpty = !analysis && selectedStressors.length === 0;
  const hasData = !!analysis || selectedStressors.length > 0;
  const isGuest = !user && hasData;

  // Entry animation — subtle scale morph on first render (from analysis loader)
  const [entryPhase, setEntryPhase] = useState<"entering" | "settled">("entering");
  useEffect(() => {
    if (IS_TEST_ENV) return;
    const t = setTimeout(() => setEntryPhase("settled"), 400);
    return () => clearTimeout(t);
  }, []);

  // Animated score count-up
  const [displayScore, setDisplayScore] = useState(0);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (IS_TEST_ENV || !analysis) return;
    const target = analysis.debtScore;
    const duration = 800;
    const steps = 32;
    const increment = target / steps;
    let current = 0;
    countRef.current = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayScore(Math.round(current));
      if (current >= target) {
        clearInterval(countRef.current!);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(target >= 60 ? [10, 50, 30] : 15);
        }
      }
    }, duration / steps);
    return () => clearInterval(countRef.current!);
  }, [analysis]);
  // Derived — the landing animation fires once displayScore reaches
  // the target. Keeping this out of state avoids a cascading render
  // (setState inside effect → re-render → effect re-runs → ...).
  const scoreLanded = !!analysis && displayScore >= analysis.debtScore;

  // ── Mira presence ──────────────────────────────────────────────────────────
  // The orb transforms into Mira mode when the prescription is ready and
  // the score has landed. It stays in Mira mode while the user is on the
  // dashboard with an active analysis — the orb is Mira speaking, not just
  // a gauge. When the user starts a new assessment (analysis cleared), the
  // orb returns to debt mode.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!analysis) return;
    const id = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [analysis]);
  const miraPresence: MiraPresence | null = (() => {
    if (!analysis || !scoreLanded) return null;
    const hasPrescription = !!analysis.prescription;
    const clearedAt = new Date(analysis.recoveryArc.clearedAt).getTime();
    const isCleared = clearedAt <= nowTs;
    if (isCleared) return orburaPresence("cleared");
    if (hasPrescription) return orburaPresence("prescription");
    return orburaPresence("recovering");
  })();

  const [personalityOpen, setPersonalityOpen] = useState(false);
  const personalityCfg = getPersonality(orbPersonality);
  const orbCopy = getOrbCopy(orbPersonality);
  const t = getStrings(locale);
  // A mode's own verdict framing ("Manager's call:", "Full-time:") takes
  // priority over the personality-voice prefix — it identifies who's
  // speaking (the manager, the full-time whistle), which matters more than
  // tone once you're in a specialized mode. Personal mode has no context
  // prefix, so it keeps the existing personality-driven behavior untouched.
  const contextVerdictPrefix = ctx.agentPrompts?.verdictPrefix;
  const verdictPrefix = contextVerdictPrefix
    ? `${contextVerdictPrefix} `
    : personalityCfg.verdictPrefix || t.verdictPrefix[orbPersonality];
  const personalityTagline = data.debtScore > 40 ? orbCopy.highDebt : orbCopy.lowDebt;

  // Memory report
  useEffect(() => {
    if (!analysis) return;
    try {
      memory.reportAction({
        content: `Viewed body debt dashboard. Score: ${analysis.debtScore}. Recovery: ${analysis.recoveryTime}. ${analysis.verdict}`,
        event_type: "page_view",
        page: "dashboard",
        metadata: { debt_score: analysis.debtScore, confidence: analysis.confidenceLevel },
      });
    } catch { /* non-blocking */ }
  }, [analysis]);

  const [showReLogConfirm, setShowReLogConfirm] = useState(false);

  const handleReLog = () => {
    // Preserve streak and personality across resets
    const preservedStreak = useBodyDebtStore.getState().streakDays;
    const preservedLastStreak = useBodyDebtStore.getState().lastStreakDate;
    const preservedPersonality = useBodyDebtStore.getState().orbPersonality;
    const preservedSeen = useBodyDebtStore.getState().hasSeenOpening;
    reset();
    useBodyDebtStore.setState({
      streakDays: preservedStreak,
      lastStreakDate: preservedLastStreak,
      orbPersonality: preservedPersonality,
      hasSeenOpening: preservedSeen,
    });
    router.push("/wake-time");
  };

  const scoreColor = bandMeta(data.debtScore).color;

  const systemsRef = useRef<HTMLDivElement>(null);
  const counterfactualRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const scrollToSystems = () => {
    systemsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Track scroll position to show/hide sticky nav
  const [showStickyNav, setShowStickyNav] = useState(false);
  const [activeSection, setActiveSection] = useState("score");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const sc = scrollContainerRef.current;
      if (!sc) return;
      const scrollTop = sc.scrollTop;
      setShowStickyNav(scrollTop > 400);

      // Determine active section
      const sections = [
        { id: "score", ref: null, threshold: 0 },
        { id: "systems", ref: systemsRef, threshold: 0 },
        { id: "counterfactual", ref: counterfactualRef, threshold: 0 },
        { id: "breakdown", ref: breakdownRef, threshold: 0 },
        { id: "trace", ref: traceRef, threshold: 0 },
        { id: "schedule", ref: scheduleRef, threshold: 0 },
      ];
      for (let i = sections.length - 1; i >= 0; i--) {
        const ref = sections[i].ref;
        if (ref?.current && ref.current.getBoundingClientRect().top < 200) {
          setActiveSection(sections[i].id);
          return;
        }
      }
      setActiveSection("score");
    };
    const sc = scrollContainerRef.current;
    if (sc) sc.addEventListener("scroll", onScroll, { passive: true });
    return () => { if (sc) sc.removeEventListener("scroll", onScroll); };
  }, [systemsRef, counterfactualRef, breakdownRef, traceRef, scheduleRef]);

  const scrollToSection = (id: string) => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      score: null as never,
      systems: systemsRef,
      counterfactual: counterfactualRef,
      breakdown: breakdownRef,
      trace: traceRef,
      schedule: scheduleRef,
    };
    const ref = refs[id];
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isAnalyzing) {
    return (
      <AnalysisLoader
        hasFaceScan={!!faceAnalysis}
        hasHRV={!!hrvData}
        agentEvents={agentEvents}
        agentProgress={agentProgress}
        memoryRecall={memoryRecall}
      />
    );
  }

  // ── Empty / first-run state ─────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div
        className="min-h-svh flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: "var(--color-bg-base)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_PROTOCOL }}
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div className="flex justify-center mb-5">
            <div style={{ opacity: 0.55 }}>
              <MiniOrb score={0} size={80} />
            </div>
          </div>
          <p
            className="text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: "var(--color-text-faint)" }}
          >
            Orbura
          </p>
          <h2
            className="text-xl font-normal mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-primary)" }}
          >
            Your debt orb is dormant
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
            Last night hasn&apos;t been logged yet. Two minutes of input wakes the orb and gives you a recovery plan.
          </p>
          <PrimaryButton size="lg" onClick={() => router.push("/wake-time")}>
            Start assessment
          </PrimaryButton>
          <button
            type="button"
            onClick={() => router.push("/preview")}
            className="w-full text-center text-[11px] py-3 mt-2 font-medium"
            style={{ color: "var(--color-text-faint)" }}
          >
            See a full example session
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={entryPhase === "entering" ? { opacity: 0.85, scale: 0.98 } : { opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative min-h-svh flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-5">

      {/* Header — diet version: two compact rows */}
      <header className="relative z-10 mt-8 mb-4" role="banner" aria-label="Dashboard controls">
        {/* Row 1: app name + contextual badges | new assessment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="app-name text-sm font-bold tracking-widest uppercase flex-shrink-0"
              style={{ color: "var(--color-text-primary)" }}
            >
              {ctx.vocabulary.appName}
            </span>
            {/* Status badges — each explains a layer of how Orbura works */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              {data.agentTrace && data.agentTrace.source === "qvac-local" && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  title="Your prescription was generated by the app's self-hosted QVAC runtime"
                  style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>QVAC</span>
                </span>
              )}
              {memoryData?.enabled && (memoryData.profile || memoryData.memories.length > 0) && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  title="Your coach remembers past sessions and shapes advice from your history"
                  style={{ backgroundColor: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#a855f7" }} />
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#a855f7" }}>Remembers you</span>
                </span>
              )}
              {zkProof && zkProof.onChainStatus === "verified" && zkProof.txHash && (
                <a
                  href={`https://juicy-low-small-testnet.explorer.skalenodes.com/tx/${zkProof.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)" }}
                  title="Face scan proved locally with zero-knowledge math — your photo never left this device. Only the proof was logged on-chain."
                  aria-label="View zero-knowledge proof verification on SKALE explorer"
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#60A5FA" }} />
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#60A5FA" }}>
                    ZK verified
                  </span>
                </a>
              )}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
            if (previewMode) {
              exitPreview();
              router.push("/wake-time");
              return;
            }
            setShowReLogConfirm(true);
          }}
            className="text-[11px] font-medium rounded-xl flex-shrink-0"
            style={{ color: "var(--color-text-secondary)", border: "1px solid rgba(168,162,158,0.15)", backgroundColor: "rgba(0,0,0,0.4)", minHeight: 34, padding: "4px 12px" }}
            aria-label={previewMode ? "Start your own check-in" : "Start new assessment"}>
            {previewMode ? "Start my check-in" : "New assessment"}
          </motion.button>
        </div>

        {/* Row 2: mode toggle + nav controls (wraps on narrow screens) */}
        <div className="flex items-center flex-wrap gap-y-2 justify-between mt-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <ModeToggle />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ctx.supportsSquad && (
                <button
                  onClick={() => window.location.href = "/squad"}
                  className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  aria-label="Open squad medical room"
                >
                  Squad
                </button>
              )}
              <button
                onClick={() => router.push("/evidence")}
                className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                style={{ color: "var(--color-text-faint)" }}
                aria-label="View evidence and science"
              >
                Evidence
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-px h-3.5" style={{ backgroundColor: "rgba(168,162,158,0.12)" }} />
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => setPersonalityOpen(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs [@media(hover:hover)]:hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              style={{ backgroundColor: "rgba(168,162,158,0.06)" }}
              aria-label={`Voice: ${personalityCfg.label}`}
            >
              {personalityCfg.emoji}
            </motion.button>
            <button onClick={() => {
              const order = ["en", "es", "fr"] as const;
              const idx = order.indexOf(locale);
              const next = order[(idx + 1) % order.length];
              useBodyDebtStore.getState().setLocale(next);
            }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              style={{ backgroundColor: "rgba(168,162,158,0.06)", color: "var(--color-text-secondary)" }}
              aria-label={`Switch language from ${locale.toUpperCase()}`}
            >
              {locale.toUpperCase()}
            </button>
            {streakDays > 0 && (
              <>
                <span className="w-px h-3.5" style={{ backgroundColor: "rgba(168,162,158,0.12)" }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--color-states-success)" }}>
                    {streakDays}d streak
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="h-px w-full mt-3" style={{ backgroundColor: "rgba(168,162,158,0.1)" }} />
      </header>

      {/* ── Layer 1: Orb + Score (hero) ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center pt-2 pb-6">
        <DebtOrb score={data.debtScore} presence={miraPresence} />

        {/* Mira label — appears when the orb is in Mira mode */}
        <AnimatePresence>
          {miraPresence && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE_PROTOCOL }}
              className="text-center -mt-2 mb-2"
            >
              <p
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--color-text-faint)" }}
              >
                Mira · {miraPresence.label}
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {miraPresence.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="text-center mt-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}>

          {/* Score eyebrow */}
          <p
            className="text-[10px] font-mono uppercase tracking-widest mb-1"
            style={{ color: "var(--color-text-faint)" }}
          >
            Debt score
          </p>

          {/* Score number */}
          <motion.div
            className="font-black leading-none debt-score-display"
            style={{ fontSize: "clamp(80px,22vw,120px)", color: scoreColor, lineHeight: 1 }}
            animate={scoreLanded ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {displayScore}
          </motion.div>

          {/* Band pill */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="flex items-center justify-center gap-1.5 mt-3"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: scoreColor }}>
              {bandLabel(data.debtScore)}
            </span>
          </motion.div>

          {/* Verdict card — unified verdict + tagline + recovery time */}
          <VerdictCard
            verdict={verdictPrefix + data.verdict}
            tagline={personalityTagline}
            recoveryTime={data.recoveryTime}
            recoveryLabel={t.labels.recoveryAround}
          />

          {/* Refining indicator */}
          {(data as DebtAnalysis & { _layer?: string })._layer === "deterministic" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-1.5 mt-2">
              {[0, 0.2, 0.4].map(d => (
                <motion.span key={d} className="w-1 h-1 rounded-full inline-block"
                  style={{ backgroundColor: "var(--color-brand-primary)" }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d }} />
              ))}
              <span className="text-[9px] font-mono uppercase tracking-widest ml-1" style={{ color: "var(--color-text-faint)" }}>
                Refining with AI
              </span>
            </motion.div>
          )}

          <ConfidenceSignal tier={(data as DebtAnalysis & { confidenceTier?: ConfidenceTier }).confidenceTier ?? confidenceTier} />

          {/* Debt gauge */}
          <DebtGauge score={displayScore} />

          {/* SKALE on-chain verification anchor */}
          {zkProof && zkProof.onChainStatus === "verified" && zkProof.txHash && (
            <motion.a
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              href={`https://juicy-low-small-testnet.explorer.skalenodes.com/tx/${zkProof.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(96,165,250,0.06)",
                border: "1px solid rgba(96,165,250,0.15)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#60A5FA" }} />
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#60A5FA" }}>
                Last verified on SKALE
              </span>
              <span className="text-[8px]" style={{ color: "#60A5FA" }}>↗</span>
            </motion.a>
          )}
        </motion.div>

        {/* System icon row — tap to scroll to panels */}
        <SystemIconRow systems={data.systemScores} onTap={scrollToSystems} />
      </div>

      {/* ── Memory card — "Your coach remembers" ─────────────────────── */}
      {memoryData?.enabled && (memoryData.profile || memoryData.memories.length > 0) && (
        <div className="relative z-10 mb-6">
          <MemoryCard
            profile={memoryData.profile}
            memories={memoryData.memories}
            containerTag={memoryContainerTag}
            onForget={previewMode ? undefined : refetchMemory}
            readOnly={previewMode}
          />
        </div>
      )}

      {/* Recovery arc timeline */}
      <div className="relative z-10 mb-6">
        <RecoveryTimeline arc={data.recoveryArc} />
        {/* Add to Calendar — ICS download */}
        <button
          onClick={() => {
            const ics = generateRecoveryIcs({
              verdict: data.verdict,
              recoveryTime: data.recoveryTime,
              recoveryArc: data.recoveryArc,
              appName: ctx.vocabulary.appName,
            });
            downloadIcs(ics);
          }}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-colors"
          style={{
            color: "var(--color-text-faint)",
            border: "1px dashed rgba(168,162,158,0.15)",
          }}
          aria-label="Add recovery window to your calendar"
        >
          <span>📅</span>
          <span>Add to Calendar</span>
        </button>
      </div>

      {/* ── Prescription schedule — time-banded plan ──────────────── */}
      {analysis?.prescription && (
        <div className="relative z-10 mb-6">
          <RecoverySchedule
            prescription={analysis.prescription}
            scheduleLabel={ctx.vocabulary.scheduleLabel}
          />
        </div>
      )}

      {/* ── Primary CTA (actionable — moved up for primary-first) ──── */}
      <div className="relative z-10 flex flex-col gap-3 mb-6">
        <PrimaryButton size="md" onClick={() => router.push("/prescription")}>
          {t.ctas.viewPrescription}
        </PrimaryButton>
        <SecondaryButton
          size="sm"
          onClick={() => router.push("/share-card")}
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {t.ctas.shareScore}
        </SecondaryButton>
      </div>

      {/* ── Layer 2: Counterfactual insight (actionable) ──────────── */}
      {data.counterfactual && (
        <div ref={counterfactualRef} className="relative z-10 mb-6">
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)", borderLeft: "2px solid var(--color-states-warning)" }}>
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest flex-shrink-0 pt-0.5" style={{ color: "var(--color-states-warning)", minWidth: 120 }}>
              What would change this
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              If you had <strong style={{ color: "var(--color-text-primary)" }}>{data.counterfactual.leverLabel}</strong>,{" "}
              <strong style={{ color: "var(--color-states-warning)" }}>{data.counterfactual.systemLabel}</strong> debt would drop from{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{data.counterfactual.fromScore}</strong> to{" "}
              <strong style={{ color: "var(--color-states-success)" }}>{data.counterfactual.toScore}</strong>.
            </span>
          </div>
        </div>
      )}

      {/* ── Layer 3: Stressor breakdown chart ──────────────────────── */}
      <div ref={breakdownRef} className="relative z-10 mb-6 space-y-4">
        <DonutChart items={data.stressorBreakdown} />
        <BarChartView items={data.stressorBreakdown} />
      </div>

      {/* ── Layer 3b: Recovery schedule (actionable) ───────────────── */}
      {data.schedule && data.schedule.length > 0 && (
        <div ref={scheduleRef} className="relative z-10 mb-6">
          <AgentSchedule schedule={data.schedule} />
        </div>
      )}

      {/* ── Layer 4: System panels (detailed breakdown) ────────────── */}
      {data.systemScores && data.systemScores.length > 0 && (
        <div ref={systemsRef} className="relative z-10 mb-8">
          <SystemPanels systems={data.systemScores} />
          <SystemClearanceNotifier systems={data.systemScores} analysisId={data.sessionId} />
        </div>
      )}

      {/* ── Squad readiness board (football mode only) ──────────────── */}
      {ctx.supportsSquad && (
        <div className="relative z-10 mb-8">
          <SquadPanel onSelect={() => router.push("/squad")} />
        </div>
      )}

      {/* ── Layer 4b: Agent trace (technical detail) ───────────────── */}
      <div ref={traceRef} className="relative z-10 mb-6">
        {data.agentTrace && <AgentTracePanel trace={data.agentTrace} />}
      </div>

      {/* ── Layer 5: Patterns ────────────────────────────────────────── */}
      <PatternLayer streakDays={streakDays} />

      {/* ── Layer 5b: Score heatmap (auth) / locked teaser (guest) ─── */}
      {user ? (
        <ScoreHeatmap />
      ) : (
        <AuthLockedTeaser
          title="Heatmap"
          body="Sign in to see your 30-day debt heatmap across sessions."
        />
      )}

      {/* ── Layer 6: Past history (auth) / locked teaser (guest) ───── */}
      {user ? (
        <DebtHistory />
      ) : (
        <AuthLockedTeaser
          title="Past scores"
          body="Sign in to keep a recoverable history of verdicts and stressors."
        />
      )}

      {/* ── Layer 7: Notifications (auth-only) ──────────────────────── */}
      {user && <NotificationsToggle />}

      {/* ── Auth upgrade ───────────────────────────────────────────── */}
      {isGuest && <GuestAuthCard />}

      {/* Bottom CTAs */}
      <div className="relative z-10 flex flex-col gap-3 pb-12 mt-2">

        {/* Signal nudge — only at low confidence */}
        {(confidenceTier === "partial" || confidenceTier === "estimated") && (
          <SignalUpsellCard delay={1.2} />
        )}

        {/* Return-loop nudge — check back tomorrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl p-4 mt-2"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(74,222,128,0.12)" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-base flex-shrink-0">⏳</span>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--color-text-primary)" }}>
                {t.labels.checkBack}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {t.labels.checkBackSubtitle}
              </p>
              {streakDays > 0 && (
                <p className="text-[9px] font-mono mt-1.5" style={{ color: "var(--color-states-success)" }}>
                  {t.labels.streakChain(streakDays)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      </div>

      {/* Personality picker */}
      <PersonalityPicker
        open={personalityOpen}
        onClose={() => setPersonalityOpen(false)}
      />

      {/* Sticky section navigator */}
      <AnimatePresence>
        {showStickyNav && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-3"
            style={{ pointerEvents: "none" }}
          >
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-full"
              style={{
                backgroundColor: "rgba(20,20,22,0.92)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(168,162,158,0.12)",
                pointerEvents: "auto",
              }}>
              {[
                { id: "score", label: "Score" },
                { id: "systems", label: "Systems" },
                ...(data.counterfactual ? [{ id: "counterfactual", label: "Lever" }] : []),
                { id: "breakdown", label: "Breakdown" },
                ...(data.agentTrace ? [{ id: "trace", label: "Agents" }] : []),
                ...(data.schedule?.length ? [{ id: "schedule", label: "Schedule" }] : []),
              ].map((s) => (
                <button key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider transition-colors"
                  style={{
                    color: activeSection === s.id ? "var(--color-text-primary)" : "var(--color-text-faint)",
                    backgroundColor: activeSection === s.id ? "rgba(234,88,12,0.15)" : "transparent",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Re-log confirmation */}
      <AnimatePresence>
        {showReLogConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm new assessment"
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowReLogConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-2xl p-6 w-full max-w-sm text-center"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
                Start a new assessment?
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>
                Your current score will be replaced. Your streak and history are preserved.
              </p>
              <div className="flex flex-col gap-2">
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowReLogConfirm(false); handleReLog(); }}
                  className="w-full font-semibold text-sm rounded-xl py-3"
                  style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-primary)" }}>
                  {t.ctas.startFresh}
                </motion.button>
                <button onClick={() => setShowReLogConfirm(false)}
                  className="w-full text-xs font-medium py-2.5"
                  style={{ color: "var(--color-text-faint)" }}>
                  {t.ctas.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      </motion.div>
    );
}

// ─── Agent Schedule — imported from dashboard/ subdirectory
