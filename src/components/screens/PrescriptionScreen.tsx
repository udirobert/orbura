"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { ChevronLeft, Clock } from "lucide-react";
import { getOrbCopy } from "@/lib/orbPersonality";
import { GuestAuthCard } from "@/components/GuestAuthCard";
import { MiniOrb } from "@/components/MiniOrb";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { SignalUpsellCard } from "@/components/SignalUpsellCard";
import { DebtGauge } from "./DebtGauge";
import { RecoveryTimeline } from "./RecoveryTimeline";
import { DonutChart, BarChartView } from "./StressorBreakdownChart";
import { AgentTracePanel } from "@/components/AgentTracePanel";

// ─── Config ────────────────────────────────────────────────────────────────────

const COMMAND_BLOCKS = [
  { key: "rightNow"    as const, label: "RIGHT NOW",    icon: "💧", labelColor: "var(--color-states-error)" },
  { key: "thisMorning" as const, label: "THIS MORNING", icon: "☕", labelColor: "var(--color-brand-primary)" },
  { key: "today"       as const, label: "TODAY",        icon: "🎯", labelColor: "var(--color-states-warning)" },
  { key: "avoid"       as const, label: "AVOID TODAY",  icon: "🚫", labelColor: "var(--color-states-error)" },
];

const FALLBACK_PRESCRIPTION = {
  rightNow:    "Drink 500ml of water with electrolytes. Your cells are dehydrated.",
  thisMorning: "No caffeine until 10am — it'll spike cortisol on an already stressed system.",
  today:       "Your one real focus window is 11am–1pm. Protect it.",
  avoid:       "Intense training. You'll create more debt, not fitness.",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PrescriptionScreen() {
  const router = useRouter();
  const { analysis, confidenceTier, orbPersonality } = useBodyDebtStore();
  const user = useEazo((s) => s.auth.user);
  const isGuest = !user && !!analysis;
  const personalityCopy = getOrbCopy(orbPersonality);
  const rx = analysis?.prescription ?? FALLBACK_PRESCRIPTION;
  const score = analysis?.debtScore ?? 0;
  const breakdown = analysis?.stressorBreakdown ?? [];

  const reportedView = useRef(false);

  // Report prescription view once
  useEffect(() => {
    if (reportedView.current) return;
    reportedView.current = true;
    memory.reportAction({
      content: `User viewed prescription. Score: ${score}.`,
      event_type: "page_view",
      page: "prescription",
      metadata: { type: "view_prescription", debt_score: score },
    }).catch(() => {});
  }, [score]);

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "var(--color-text-secondary)", minHeight: "44px" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Score
        </button>
        <MiniOrb score={score} size={28} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 mt-4 mb-2"
      >
        <div className="flex items-center gap-2">
          <h1 className="font-black uppercase tracking-widest"
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.1rem,5vw,1.4rem)", color: "var(--color-text-primary)", letterSpacing: "0.08em" }}>
            {personalityCopy.prescriptionHeader}
          </h1>
          {analysis?.agentTrace?.source === "qvac-local" && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
              <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>Edge AI</span>
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
          {analysis?.agentTrace?.source === "qvac-local"
            ? "Generated on your device by 3 QVAC AI agents. No cloud calls."
            : "Based on your current body state. Specific. Actionable."}
        </p>
      </motion.div>

      {/* Score gauge + Recovery timeline */}
      <div className="relative z-10 mb-4">
        <DebtGauge score={score} />
      </div>
      {analysis?.recoveryArc && (
        <div className="relative z-10 mb-4">
          <RecoveryTimeline arc={analysis.recoveryArc} />
        </div>
      )}

      {/* Stressor breakdown charts */}
      {breakdown.length > 0 && (
        <div className="relative z-10 mb-4 space-y-4">
          <DonutChart items={breakdown} />
          <BarChartView items={breakdown} />
        </div>
      )}

      {/* Directive blocks — always fully expanded */}
      <div className="relative z-10 flex flex-col gap-3">
        {COMMAND_BLOCKS.map(({ key, label, icon, labelColor }, i) => (
          <motion.div key={key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}
          >
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-1">
              <span className="text-base flex-shrink-0">{icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: labelColor }}>
                {label}
              </span>
            </div>
            <p className="px-4 pb-4 text-sm leading-relaxed font-medium" style={{ color: "var(--color-text-primary)" }}>
              {rx[key]}
            </p>
          </motion.div>
        ))}

        {/* Reminder prompt */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="rounded-2xl px-4 py-4 text-center"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.12)" }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Clock className="w-3 h-3" style={{ color: "var(--color-states-warning)" }} />
            <span
              className="text-[9px] font-mono uppercase tracking-widest font-semibold"
              style={{ color: "var(--color-states-warning)" }}
            >
              Coming soon
            </span>
          </div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Reminders need a backend
          </p>
          <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
            Push notifications and calendar invites require
            server-side infrastructure (Zapier-style integration).
            Until then, use the prescription as-is.
          </p>
        </motion.div>

        {/* Upsell — only at low confidence */}
        {(confidenceTier === "partial" || confidenceTier === "estimated") && (
          <SignalUpsellCard variant="subtle" delay={0.7} />
        )}
      </div>

      {/* Agent trace — show the multi-agent pipeline */}
      {analysis?.agentTrace && (
        <div className="relative z-10 mt-2 mb-2">
          <AgentTracePanel trace={analysis.agentTrace} />
        </div>
      )}

      {/* Auth upgrade */}
      {isGuest && <GuestAuthCard />}

      {/* Bottom CTAs */}
      <div className="relative z-10 pb-10 pt-6 flex flex-col gap-2">
        <PrimaryButton size="md" onClick={() => router.push("/share-card")}>
          Share my score
        </PrimaryButton>
        <SecondaryButton size="sm" onClick={() => router.push("/dashboard")}>
          ← Back to score
        </SecondaryButton>
      </div>
    </div>
  );
}
