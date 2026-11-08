"use client";

import type { AdaptiveScenario } from "@/lib/today/fixtures";
import { TodayScreen } from "@/components/screens/TodayScreen";
import { ClipboardList, AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";

/**
 * Clinician density — same TodayState, longitudinal context.
 * Exception-first: pending actions, outcomes, open escalations.
 */
export function ClinicianDensity({ scenario }: { scenario: AdaptiveScenario }) {
  const c = scenario.clinician;
  const s = scenario.state;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-4 flex flex-col gap-1"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Clinician view
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {c.patientLabel}
        </p>
        {c.medication && (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{c.medication}</p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          Rule fired: <code>{s.rule}</code> · headline “{s.headline.stateWord}”
        </p>
      </div>

      {c.openEscalationReason && (
        <div
          className="rounded-2xl p-4 flex gap-3"
          style={{ backgroundColor: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
        >
          <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#f87171" }}>Open escalation</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
              {c.openEscalationReason}
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <ClipboardList size={12} /> Pending actions
        </p>
        {c.pendingActions.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>None</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.pendingActions.map((a) => (
              <li key={a.action} className="text-xs flex justify-between gap-2" style={{ color: "var(--color-text-secondary)" }}>
                <span>{a.action}</span>
                <span style={{ color: "var(--color-text-muted)" }}>due {a.dueAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Recent outcomes
        </p>
        {c.recentOutcomes.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No recorded outcomes</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.recentOutcomes.map((o) => (
              <li key={`${o.action}-${o.date}`} className="text-xs flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                {o.status === "completed"
                  ? <CheckCircle2 size={13} style={{ color: "var(--color-states-success)" }} />
                  : <CircleSlash size={13} style={{ color: "var(--color-text-muted)" }} />}
                <span className="flex-1">{o.action}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{o.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Same decision, patient density — for side-by-side comparison */}
      <div className="opacity-90">
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
          Same decision · patient density
        </p>
        <TodayScreen state={s} />
      </div>
    </div>
  );
}
