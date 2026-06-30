"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { DebtOrb } from "./DebtOrb";
import { DebtGauge } from "./DebtGauge";
import { RecoveryTimeline } from "./RecoveryTimeline";
import { DonutChart, BarChartView } from "./StressorBreakdownChart";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { SystemPanels } from "@/components/SystemPanels";
import { SystemClearanceNotifier } from "@/components/SystemClearanceNotifier";
import { PersonalityPicker } from "./personality-picker";
import { DebtHistory } from "./debt-history";
import { ScoreHeatmap } from "./score-heatmap";
import { NotificationsToggle } from "@/components/notifications/notifications-toggle";
import { AgentTracePanel } from "@/components/AgentTracePanel";
import { getOrbCopy, getPersonality } from "@/lib/orbPersonality";
import { getStrings } from "@/lib/i18n";
import { bandMeta } from "@/lib/debt-band";
import { useRecoveryContext } from "@/lib/contexts/RecoveryContext";
import { ModeToggle } from "@/components/ModeToggle";
import { SquadPanel } from "./SquadScreen";
import { GuestAuthCard } from "@/components/GuestAuthCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SignalUpsellCard } from "@/components/SignalUpsellCard";
import type { DebtAnalysis, ConfidenceTier, RecoverySystem } from "@/lib/types";

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_ANALYSIS: DebtAnalysis = {
  debtScore: 0,
  verdict: "No data collected yet.",
  recoveryTime: "now",
  prescription: {
    rightNow:    "Log your stressors to get a personalized prescription.",
    thisMorning: "Take a few minutes to check in with yourself.",
    today:       "Start fresh — your body is ready.",
    avoid:       "Skipping your next check-in.",
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

const CONFIDENCE_CONFIG: Record<string, { dot: string; label: string; color: string; explanation: string }> = {
  estimated: { dot: "◐", label: "Estimated",       color: "var(--color-text-faint)", explanation: "Based on your reported stressors only. No biometric data used." },
  partial:   { dot: "◑", label: "Partial picture", color: "var(--color-text-secondary)", explanation: "Some biometric signal received. Connecting a wearable or doing a face scan would improve accuracy." },
  good:      { dot: "◕", label: "Good read",        color: "var(--color-states-warning)", explanation: "Face scan or HRV data is included. Confidence is high enough to act on." },
  accurate:  { dot: "●", label: "Accurate",         color: "var(--color-brand-primary)", explanation: "Multiple biometric signals verified. Your score reflects real physiology." },
  precise:   { dot: "●", label: "Precise",          color: "var(--color-states-success)", explanation: "Full signal coverage: stressors, face scan, and HRV. Maximum confidence." },
};

function ConfidenceSignal({ tier }: { tier?: ConfidenceTier }) {
  const [expanded, setExpanded] = useState(false);
  if (!tier || tier === "estimated") return null;
  const cfg = CONFIDENCE_CONFIG[tier] ?? CONFIDENCE_CONFIG.partial;
  return (
    <div className="flex flex-col items-center">
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="confidence-explanation"
        className="flex items-center justify-center gap-1.5 mt-1"
      >
        <span className="text-sm" style={{ color: cfg.color }}>{cfg.dot}</span>
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-[8px]" style={{ color: cfg.color }}>
          ▾
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="confidence-explanation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            role="region"
            aria-label="Confidence explanation"
          >
            <p className="text-[9px] text-center px-8 mt-1.5 leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
              {cfg.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── System icon quick-nav ────────────────────────────────────────────────────

const SYSTEM_ORDER: RecoverySystem[] = ["cardiovascular", "brain", "liver", "muscular", "gut"];
const SYSTEM_ICONS: Record<RecoverySystem, string> = {
  cardiovascular: "🫀", brain: "🧠", liver: "🫁", muscular: "💪", gut: "🦠",
};

function SystemIconRow({ systems, onTap }: {
  systems: DebtAnalysis["systemScores"];
  onTap: () => void;
}) {
  if (!systems?.length) return null;
  return (
    <div className="flex items-center justify-center gap-5 mt-4">
      {SYSTEM_ORDER.map((sys) => {
        const score = systems.find(s => s.system === sys)?.score ?? 0;
        const color = score >= 70 ? "var(--color-states-error)" : score >= 40 ? "var(--color-brand-primary)" : score >= 15 ? "var(--color-states-warning)" : "var(--color-states-success)";
        return (
          <motion.button key={sys} whileTap={{ scale: 0.85 }}
            onClick={onTap}
            className="flex flex-col items-center gap-0.5"
          >
            <span className="text-base">{SYSTEM_ICONS[sys]}</span>
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Stressor breakdown (collapsible) — replaced by DonutChart/BarChartView

// ─── Pattern layer (streak) ───────────────────────────────────────────────────

function PatternLayer({ streakDays }: { streakDays: number }) {
  if (streakDays === 0) return null;
  return (
    <div className="relative z-10 mb-6">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(74,222,128,0.15)" }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--color-states-success)" }} />
        <div>
          <span className="text-xs font-semibold" style={{ color: "var(--color-states-success)" }}>
            {streakDays} day{streakDays !== 1 ? "s" : ""} under 20
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>
            Clean streak. Your body is thanking you.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function DashboardScreen() {
  const router = useRouter();
  const {
    analysis, selectedStressors, reset, isAnalyzing,
    hrvData, faceAnalysis, zkProof,
    streakDays, confidenceTier,
    orbPersonality, agentEvents, agentProgress,
    locale,
  } = useBodyDebtStore();

  const ctx = useRecoveryContext();
  const user = useEazo((s) => s.auth.user);
  const data: DebtAnalysis = analysis ?? FALLBACK_ANALYSIS;
  const isEmpty = !analysis && selectedStressors.length === 0;
  const hasData = !!analysis || selectedStressors.length > 0;
  const isGuest = !user && hasData;

  // Animated score count-up
  const [displayScore, setDisplayScore] = useState(0);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!analysis) return;
    const target = analysis.debtScore;
    const duration = 1500;
    const steps = 40;
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

  const [personalityOpen, setPersonalityOpen] = useState(false);
  const personalityCfg = getPersonality(orbPersonality);
  const orbCopy = getOrbCopy(orbPersonality);
  const t = getStrings(locale);
  const verdictPrefix = personalityCfg.verdictPrefix || t.verdictPrefix[orbPersonality];
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
      />
    );
  }

  // ── Empty / first-run state ─────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-bg-base)" }}>
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-28 h-28 rounded-full mb-8"
          style={{ background: "radial-gradient(circle at 40% 35%, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.08) 60%, transparent 100%)" }}
        />
        <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-primary)" }}>
          Your body is waiting
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your debt can&apos;t be quantified without input. Log what hit you.
        </p>
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/wake-time")}
          className="w-full max-w-xs font-semibold rounded-2xl"
          style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-primary)", minHeight: 58, fontFamily: "var(--font-body)" }}>
          Start assessment
        </motion.button>
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-svh flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5">

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
            {/* Badges — edge AI + on-chain, compact */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              {data.agentTrace && data.agentTrace.source === "qvac-local" && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>Edge AI</span>
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
                  title={`Last verified ${zkProof.durationMs ? `${(zkProof.durationMs / 1000).toFixed(1)}s ago · on SKALE` : "on SKALE"}`}
                  aria-label="View on-chain verification on SKALE explorer"
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#60A5FA" }} />
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#60A5FA" }}>
                    On-chain
                  </span>
                </a>
              )}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowReLogConfirm(true)}
            className="text-[11px] font-medium rounded-xl flex-shrink-0"
            style={{ color: "var(--color-text-secondary)", border: "1px solid rgba(168,162,158,0.15)", backgroundColor: "rgba(0,0,0,0.4)", minHeight: 34, padding: "4px 12px" }}
            aria-label="Start new assessment">
            New assessment
          </motion.button>
        </div>

        {/* Row 2: mode toggle + controls + streak */}
        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-2.5">
            <ModeToggle />
            <div className="flex items-center gap-1.5">
              {ctx.supportsSquad && (
                <button
                  onClick={() => window.location.href = "/squad"}
                  className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  aria-label="Open squad medical room"
                >
                  Squad
                </button>
              )}
              <span className="w-px h-3.5" style={{ backgroundColor: "rgba(168,162,158,0.12)" }} />
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => setPersonalityOpen(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-emerald-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
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
            </div>
          </div>
          {streakDays > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--color-states-success)" }}>
                {streakDays}d streak
              </span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
            </div>
          )}
        </div>
        <div className="h-px w-full mt-3" style={{ backgroundColor: "rgba(168,162,158,0.1)" }} />
      </header>

      {/* ── Layer 1: Orb + Score (hero) ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center pt-2 pb-6">
        <DebtOrb score={data.debtScore} />

        <motion.div className="text-center mt-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}>

          {/* Score number */}
          <motion.div
            className="font-black leading-none debt-score-display"
            style={{ fontSize: "clamp(80px,22vw,120px)", color: scoreColor, lineHeight: 1 }}
            animate={scoreLanded ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {displayScore}
          </motion.div>

          {/* Verdict with personality prefix */}
          <h3 className="mt-2 font-normal text-center px-4" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1rem,4vw,1.25rem)", color: "var(--color-text-primary)", lineHeight: 1.3 }}>
            {verdictPrefix}{data.verdict}
          </h3>

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
          <div className="mt-2">
            <DebtGauge score={displayScore} />
          </div>

          {/* Personality tagline */}
          <p className="mt-1 text-[10px] italic px-6" style={{ color: "var(--color-text-faint)" }}>
            {personalityTagline}
          </p>

          {/* Recovery window */}
          <p className="mt-1 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
            {t.labels.recoveryAround} <span style={{ color: "var(--color-text-primary)" }}>{data.recoveryTime}</span>
          </p>

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

      {/* Recovery arc timeline */}
      <div className="relative z-10 mb-6">
        <RecoveryTimeline arc={data.recoveryArc} />
      </div>

      {/* ── Layer 2: System panels ───────────────────────────────────── */}
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

      {/* ── Layer 2b: Counterfactual insight ────────────────────────── */}
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

      {/* ── Layer 3b: Agent trace (multi-agent edge AI) ─────────────── */}
      <div ref={traceRef} className="relative z-10 mb-6">
        {data.agentTrace && <AgentTracePanel trace={data.agentTrace} />}
      </div>

      {/* ── Layer 3c: Recovery schedule (from Schedule Agent) ──────── */}
      {data.schedule && data.schedule.length > 0 && (
        <div ref={scheduleRef} className="relative z-10 mb-6">
          <AgentSchedule schedule={data.schedule} />
        </div>
      )}

      {/* ── Layer 4: Patterns ────────────────────────────────────────── */}
      <PatternLayer streakDays={streakDays} />

      {/* ── Layer 4b: Score heatmap (collapsible, auth-only) ──────── */}
      {user && <ScoreHeatmap />}

      {/* ── Layer 5: Past history (collapsible, auth-only) ─────────── */}
      {user && <DebtHistory />}

      {/* ── Layer 6: Notifications (auth-only) ──────────────────────── */}
      {user && <NotificationsToggle />}

      {/* ── Auth upgrade ───────────────────────────────────────────── */}
      {isGuest && <GuestAuthCard />}

      {/* CTAs */}
      <div className="relative z-10 flex flex-col gap-3 pb-12 mt-2">

        {/* Primary — go to prescription */}
        <PrimaryButton size="md" onClick={() => router.push("/prescription")}>
          {t.ctas.viewPrescription}
        </PrimaryButton>

        {/* Secondary — share */}
        <SecondaryButton
          size="sm"
          onClick={() => router.push("/share-card")}
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          {t.ctas.shareScore}
        </SecondaryButton>

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
      </AnimatePresence>
    </div>
  );
}

// ─── Agent Schedule (from Schedule Agent) ─────────────────────────────────────

const SYSTEM_EMOJIS: Record<string, string> = {
  cardiovascular: "🫀", brain: "🧠", liver: "🫁", muscular: "💪", gut: "🦠",
  Cardiovascular: "🫀", Brain: "🧠", Liver: "🫁", Muscular: "💪", Gut: "🦠",
};

function AgentSchedule({ schedule }: { schedule: { time: string; action: string; system: string }[] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
          Recovery Schedule
        </span>
        <span className="text-[8px] font-mono" style={{ color: "var(--color-text-faint)" }}>
          Schedule Agent · QVAC
        </span>
      </div>
      <div className="px-4 pb-3">
        {schedule.map((block, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 py-2.5"
            style={{ borderBottom: i < schedule.length - 1 ? "1px solid rgba(168,162,158,0.06)" : "none" }}>
            <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: "var(--color-brand-primary)", minWidth: 70 }}>
              {block.time}
            </span>
            <span className="text-sm flex-1" style={{ color: "var(--color-text-primary)", lineHeight: 1.4 }}>
              {block.action}
            </span>
            <span className="text-sm flex-shrink-0">
              {SYSTEM_EMOJIS[block.system] ?? "•"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
