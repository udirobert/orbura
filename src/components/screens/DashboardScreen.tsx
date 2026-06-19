"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { auth, memory } from "@/lib/sdk/eazo-client";
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

function getVerdictMeta(score: number): { color: string } {
  if (score >= 61) return { color: "#DC2626" };
  if (score >= 41) return { color: "#EA580C" };
  if (score >= 21) return { color: "#F59E0B" };
  return { color: "#4ADE80" };
}

const CONFIDENCE_CONFIG: Record<string, { dot: string; label: string; color: string; explanation: string }> = {
  estimated: { dot: "◐", label: "Estimated",       color: "#524F4C", explanation: "Based on your reported stressors only. No biometric data used." },
  partial:   { dot: "◑", label: "Partial picture", color: "#A8A29E", explanation: "Some biometric signal received. Connecting a wearable or doing a face scan would improve accuracy." },
  good:      { dot: "◕", label: "Good read",        color: "#F59E0B", explanation: "Face scan or HRV data is included. Confidence is high enough to act on." },
  accurate:  { dot: "●", label: "Accurate",         color: "#EA580C", explanation: "Multiple biometric signals verified. Your score reflects real physiology." },
  precise:   { dot: "●", label: "Precise",          color: "#4ADE80", explanation: "Full signal coverage: stressors, face scan, and HRV. Maximum confidence." },
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[9px] text-center px-8 mt-1.5 leading-relaxed" style={{ color: "#524F4C" }}>
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
        const color = score >= 70 ? "#DC2626" : score >= 40 ? "#EA580C" : score >= 15 ? "#F59E0B" : "#4ADE80";
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
        style={{ backgroundColor: "#141416", border: "1px solid rgba(74,222,128,0.15)" }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#4ADE80" }} />
        <div>
          <span className="text-xs font-semibold" style={{ color: "#4ADE80" }}>
            {streakDays} day{streakDays !== 1 ? "s" : ""} under 20
          </span>
          <p className="text-[10px] mt-0.5" style={{ color: "#524F4C" }}>
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

  const user = useEazo((s) => s.auth.user);
  const data: DebtAnalysis = analysis ?? FALLBACK_ANALYSIS;
  const isEmpty = !analysis && selectedStressors.length === 0;
  const hasData = !!analysis || selectedStressors.length > 0;
  const isGuest = !user && hasData;

  // Animated score count-up
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreLanded, setScoreLanded] = useState(false);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!analysis) return;
    setScoreLanded(false);
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
        setScoreLanded(true);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(target >= 60 ? [10, 50, 30] : 15);
        }
      }
    }, duration / steps);
    return () => clearInterval(countRef.current!);
  }, [analysis]);

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

  const scoreColor = getVerdictMeta(data.debtScore).color;

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
        style={{ backgroundColor: "#0A0A0B" }}>
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-28 h-28 rounded-full mb-8"
          style={{ background: "radial-gradient(circle at 40% 35%, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.08) 60%, transparent 100%)" }}
        />
        <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-heading)", color: "#F5F5F4" }}>
          Your body is waiting
        </h2>
        <p className="text-sm mb-8" style={{ color: "#A8A29E" }}>
          Your debt can&apos;t be quantified without input. Log what hit you.
        </p>
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/wake-time")}
          className="w-full max-w-xs font-semibold rounded-2xl"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", minHeight: 58, fontFamily: "var(--font-body)" }}>
          Start assessment
        </motion.button>
      </div>
    );
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-svh flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5">

      {/* Header */}
      <header className="relative z-10 mt-10 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="app-name text-sm font-bold tracking-widest uppercase" style={{ color: "#F5F5F4" }}>
              BODY DEBT
            </span>
            {data.agentTrace && data.agentTrace.source === "qvac-local" && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#4ADE80" }}>Edge AI</span>
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
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "#60A5FA" }} />
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "#60A5FA" }}>
                  On-chain
                </span>
              </a>
            )}
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setPersonalityOpen(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "rgba(168,162,158,0.08)" }}
              title={`Voice: ${personalityCfg.label}`}
            >
              {personalityCfg.emoji}
            </motion.button>
            <button onClick={() => {
              const order = ["en", "es", "fr"] as const;
              const idx = order.indexOf(locale);
              const next = order[(idx + 1) % order.length];
              useBodyDebtStore.getState().setLocale(next);
            }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono"
              style={{ backgroundColor: "rgba(168,162,158,0.08)", color: "#A8A29E" }}
              title={`Language: ${locale.toUpperCase()}`}
            >
              {locale.toUpperCase()}
            </button>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#EA580C" }} />
          </div>
          <div className="flex items-center gap-3">
            {streakDays > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#4ADE80" }} />
                <span className="text-[10px] font-mono" style={{ color: "#4ADE80" }}>{streakDays}</span>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowReLogConfirm(true)}
              className="text-[11px] font-medium rounded-xl"
              style={{ color: "#A8A29E", border: "1px solid rgba(168,162,158,0.15)", backgroundColor: "rgba(0,0,0,0.4)", minHeight: 36, padding: "6px 12px" }}>
              New assessment
            </motion.button>
          </div>
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
          <h3 className="mt-2 font-normal text-center px-4" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1rem,4vw,1.25rem)", color: "#F5F5F4", lineHeight: 1.3 }}>
            {verdictPrefix}{data.verdict}
          </h3>

          {/* Refining indicator */}
          {(data as DebtAnalysis & { _layer?: string })._layer === "deterministic" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-1.5 mt-2">
              {[0, 0.2, 0.4].map(d => (
                <motion.span key={d} className="w-1 h-1 rounded-full inline-block"
                  style={{ backgroundColor: "#EA580C" }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: d }} />
              ))}
              <span className="text-[9px] font-mono uppercase tracking-widest ml-1" style={{ color: "#524F4C" }}>
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
          <p className="mt-1 text-[10px] italic px-6" style={{ color: "#524F4C" }}>
            {personalityTagline}
          </p>

          {/* Recovery window */}
          <p className="mt-1 text-xs font-mono" style={{ color: "#A8A29E" }}>
            {t.labels.recoveryAround} <span style={{ color: "#F5F5F4" }}>{data.recoveryTime}</span>
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

      {/* ── Layer 2b: Counterfactual insight ────────────────────────── */}
      {data.counterfactual && (
        <div ref={counterfactualRef} className="relative z-10 mb-6">
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)", borderLeft: "2px solid #F59E0B" }}>
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest flex-shrink-0 pt-0.5" style={{ color: "#F59E0B", minWidth: 120 }}>
              What would change this
            </span>
            <span className="text-xs leading-relaxed" style={{ color: "#A8A29E" }}>
              If you had <strong style={{ color: "#F5F5F4" }}>{data.counterfactual.leverLabel}</strong>,{" "}
              <strong style={{ color: "#F59E0B" }}>{data.counterfactual.systemLabel}</strong> debt would drop from{" "}
              <strong style={{ color: "#F5F5F4" }}>{data.counterfactual.fromScore}</strong> to{" "}
              <strong style={{ color: "#4ADE80" }}>{data.counterfactual.toScore}</strong>.
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
      {isGuest && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mb-6 rounded-2xl p-4 text-center"
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

      {/* CTAs */}
      <div className="relative z-10 flex flex-col gap-3 pb-12 mt-2">

        {/* Primary — go to prescription */}
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/prescription")}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: 56 }}>
          {t.ctas.viewPrescription}
        </motion.button>

        {/* Secondary — share */}
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/share-card")}
          className="w-full font-semibold text-xs uppercase tracking-widest rounded-2xl"
          style={{ backgroundColor: "#141416", color: "#A8A29E", border: "1px solid rgba(168,162,158,0.15)", minHeight: 48 }}>
          {t.ctas.shareScore}
        </motion.button>

        {/* Signal nudge — only at low confidence */}
        {(confidenceTier === "partial" || confidenceTier === "estimated") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.2)" }}>
            <p className="text-xs mb-1" style={{ color: "#A8A29E" }}>I can see more if you let me.</p>
            <p className="text-[10px] mb-3" style={{ color: "#524F4C" }}>
              Connect your watch and camera for a full picture.
            </p>
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/face-scan")}
              className="text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: "#EA580C", color: "#F5F5F4" }}>
              Give your orb more signal
            </motion.button>
          </motion.div>
        )}

        {/* Return-loop nudge — check back tomorrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl p-4 mt-2"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(74,222,128,0.12)" }}
        >
          <div className="flex items-start gap-3">
            <span className="text-base flex-shrink-0">⏳</span>
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#F5F5F4" }}>
                {t.labels.checkBack}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "#A8A29E" }}>
                {t.labels.checkBackSubtitle}
              </p>
              {streakDays > 0 && (
                <p className="text-[9px] font-mono mt-1.5" style={{ color: "#4ADE80" }}>
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
                    color: activeSection === s.id ? "#F5F5F4" : "#524F4C",
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
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowReLogConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-2xl p-6 w-full max-w-sm text-center"
              style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: "#F5F5F4" }}>
                Start a new assessment?
              </p>
              <p className="text-xs mb-5" style={{ color: "#A8A29E" }}>
                Your current score will be replaced. Your streak and history are preserved.
              </p>
              <div className="flex flex-col gap-2">
                <motion.button whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowReLogConfirm(false); handleReLog(); }}
                  className="w-full font-semibold text-sm rounded-xl py-3"
                  style={{ backgroundColor: "#EA580C", color: "#F5F5F4" }}>
                  {t.ctas.startFresh}
                </motion.button>
                <button onClick={() => setShowReLogConfirm(false)}
                  className="w-full text-xs font-medium py-2.5"
                  style={{ color: "#524F4C" }}>
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
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}>
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#F59E0B" }}>
          Recovery Schedule
        </span>
        <span className="text-[8px] font-mono" style={{ color: "#524F4C" }}>
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
            <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: "#EA580C", minWidth: 70 }}>
              {block.time}
            </span>
            <span className="text-sm flex-1" style={{ color: "#F5F5F4", lineHeight: 1.4 }}>
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
