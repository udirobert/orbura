"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronDown, Camera, ClipboardCheck, HelpCircle } from "lucide-react";
import type { TodayAction, TodayState } from "@/lib/today/types";
import { respondToIntervention } from "@/lib/api/interventions";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { Collapse } from "@/components/ui/collapse";
import { useSquishProps } from "@/lib/motion/protocol";
import { haptic } from "@/lib/haptics";

const KIND_ICON = {
  "follow-through": HelpCircle,
  "care-action": ClipboardCheck,
  "check-in": ClipboardCheck,
  scan: Camera,
  review: ChevronDown,
} as const;

function freshnessLabel(freshness: TodayState["headline"]["freshness"]): string | null {
  if (freshness === "fresh") return "updated today";
  if (freshness === "stale") return "a few days old";
  return null;
}

function ActionButton({
  action,
  primary,
  onFollowThrough,
}: {
  action: TodayAction;
  primary?: boolean;
  onFollowThrough?: (did: boolean) => void;
}) {
  const squish = useSquishProps();
  const Icon = KIND_ICON[action.kind];

  if (action.kind === "follow-through" && action.sessionId != null && onFollowThrough) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{action.label}</p>
        {action.detail && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{action.detail}</p>
        )}
        <div className="flex gap-2">
          <PrimaryButton
            size="sm"
            fullWidth={false}
            onClick={() => onFollowThrough(true)}
            className="flex-1"
          >
            <span className="flex items-center justify-center gap-1.5">
              <Check size={14} /> Did it
            </span>
          </PrimaryButton>
          <SecondaryButton
            size="sm"
            fullWidth={false}
            onClick={() => onFollowThrough(false)}
            className="flex-1"
          >
            Skipped
          </SecondaryButton>
        </div>
      </div>
    );
  }

  const inner = (
    <span className="flex items-center justify-center gap-2">
      <Icon size={16} />
      {action.label}
    </span>
  );

  const cls = "flex items-center justify-center gap-2 font-semibold rounded-2xl w-full";
  const style = {
    minHeight: 48,
    fontSize: 14,
    backgroundColor: primary ? "var(--color-brand-primary)" : "var(--color-bg-surface)",
    color: primary ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    border: primary ? "none" : "1px solid var(--color-border-subtle)",
  } as const;

  if (action.href) {
    return (
      <Link href={action.href} className={cls} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <motion.button {...squish} className={cls} style={style} onClick={() => haptic("light")}>
      {inner}
    </motion.button>
  );
}

/**
 * Adaptive Today surface — Tier 0: state word + one action.
 * Tier 1 expands in place to show why (pattern, streak, treatment week).
 */
export function TodayScreen({ state }: { state: TodayState }) {
  const [answered, setAnswered] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  const h = state.headline;
  const fresh = freshnessLabel(h.freshness);
  const delta =
    h.deltaPct != null ? `${h.deltaPct > 0 ? "+" : ""}${h.deltaPct}% vs your baseline` : null;

  const whyBits = [
    state.context.treatmentWeek != null
      ? `Week ${state.context.treatmentWeek} of treatment`
      : null,
    state.context.openEscalation ? "Your care team is reviewing your last check-in" : null,
    ...state.context.patternLines,
    state.context.streakDays > 1 ? `${state.context.streakDays}-day streak` : null,
    fresh ? `Signal ${fresh}` : null,
  ].filter(Boolean) as string[];

  const handleFollowThrough = async (did: boolean) => {
    const action = state.primaryAction;
    if (action.sessionId == null) return;
    haptic("light");
    const ok = await respondToIntervention(action.sessionId, did ? "did" : "skipped");
    if (ok) setAnswered(true);
  };

  if (answered) {
    return (
      <div
        className="rounded-3xl p-6 flex flex-col items-center gap-2 text-center"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <Check size={28} style={{ color: "var(--color-brand-primary)" }} />
        <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Logged — that feeds your baseline.
        </p>
      </div>
    );
  }

  return (
    <section
      className="rounded-3xl p-6 flex flex-col gap-5"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      aria-label="Today"
    >
      {/* Tier 0 — state word + one action */}
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Today
        </p>
        <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {h.stateWord}
        </h2>
        {(delta || h.source) && (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {[delta, h.source === "camera" ? "camera check-in" : h.source === "wearable" ? "wearable" : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      <ActionButton
        action={state.primaryAction}
        primary
        onFollowThrough={state.primaryAction.kind === "follow-through" ? handleFollowThrough : undefined}
      />

      {state.secondaryActions.length > 0 && (
        <div className="flex flex-col gap-2">
          {state.secondaryActions.map((a) => (
            <ActionButton key={a.id} action={a} />
          ))}
        </div>
      )}

      {/* Tier 1 — why, on demand */}
      {whyBits.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium self-start"
            style={{ color: "var(--color-text-muted)" }}
            aria-expanded={whyOpen}
          >
            <ChevronDown
              size={14}
              style={{ transform: whyOpen ? "rotate(180deg)" : "none", transition: "transform var(--duration-page) var(--ease-protocol)" }}
            />
            Why this?
          </button>
          <Collapse open={whyOpen}>
            <ul className="flex flex-col gap-1.5 pl-1">
              {whyBits.map((bit) => (
                <li key={bit} className="text-xs flex gap-2" style={{ color: "var(--color-text-secondary)" }}>
                  <span aria-hidden style={{ color: "var(--color-text-muted)" }}>·</span>
                  {bit}
                </li>
              ))}
            </ul>
          </Collapse>
        </>
      )}
    </section>
  );
}
