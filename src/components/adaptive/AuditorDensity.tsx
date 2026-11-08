"use client";

import type { AdaptiveScenario } from "@/lib/today/fixtures";
import type { TodayProvenance } from "@/lib/today/types";
import { ShieldCheck, Link2 } from "lucide-react";

function Row({ k, v }: { k: string; v: string | number | boolean | null }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-1" style={{ borderBottom: "1px solid rgba(168,162,158,0.08)" }}>
      <span style={{ color: "var(--color-text-muted)" }}>{k}</span>
      <span className="text-right font-mono" style={{ color: "var(--color-text-secondary)" }}>
        {v === null ? "—" : String(v)}
      </span>
    </div>
  );
}

/**
 * Auditor density — the decision's provenance: which rule fired, every input
 * it saw, and the ZK credential when the signal was verified on-chain.
 */
export function AuditorDensity({ scenario }: { scenario: AdaptiveScenario }) {
  const s = scenario.state;
  const p: TodayProvenance = s.provenance;
  // Live credential wins; fixture proof is the demo fallback.
  const cred = s.latestCredential;
  const proof = cred
    ? {
        modelId: cred.modelId,
        score: cred.score ?? 0,
        healthy: cred.healthy ?? false,
        inputDigest: cred.inputDigest ?? "—",
        chain: cred.chain as "skale" | "starknet",
        txRef: cred.txHash ?? "local verification",
      }
    : scenario.proof;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-4 flex flex-col gap-1"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
          <ShieldCheck size={12} /> Auditor view
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Decision provenance
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Deterministic rule engine — no LLM in the decision path.
        </p>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
          Rule
        </p>
        <Row k="rule id" v={s.rule} />
        <Row k="surface" v={s.surface} />
        <Row k="primary action" v={`${s.primaryAction.kind}: ${s.primaryAction.label}`} />
        <Row k="headline" v={s.headline.stateWord} />
        <Row k="freshness" v={s.headline.freshness} />
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--color-text-muted)" }}>
          Inputs seen
        </p>
        <Row k="care started" v={p.careStartedAt?.slice(0, 10) ?? null} />
        <Row k="open escalation" v={p.openEscalation} />
        <Row k="pending care action" v={p.pendingCareActionId} />
        <Row k="follow-through session" v={p.pendingFollowThroughSessionId} />
        <Row k="last vitals" v={p.lastVitalsAt?.slice(0, 16).replace("T", " ") ?? null} />
        <Row k="vitals Δ vs baseline" v={p.vitalsDeltaPct != null ? `${p.vitalsDeltaPct}%` : null} />
        <Row k="last wearable" v={p.lastWearableAt?.slice(0, 16).replace("T", " ") ?? null} />
        <Row k="wearable Δ vs baseline" v={p.wearableDeltaPct != null ? `${p.wearableDeltaPct}%` : null} />
        <Row k="last check-in" v={p.lastCheckInAt?.slice(0, 10) ?? null} />
        <Row k="latest debt score" v={p.latestDebtScore} />
        <Row k="streak days" v={p.streakDays} />
      </div>

      {proof ? (
        <div
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ backgroundColor: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.25)" }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: "#60A5FA" }}>
            <Link2 size={12} /> ZK credential
          </p>
          <Row k="model" v={proof.modelId} />
          <Row k="score" v={proof.score} />
          <Row k="healthy" v={proof.healthy} />
          <Row k="input digest" v={proof.inputDigest} />
          <Row k="verified on" v={proof.chain} />
          <p className="text-[10px] font-mono break-all mt-1" style={{ color: "var(--color-text-muted)" }}>
            tx {proof.txRef}
          </p>
        </div>
      ) : (
        <p className="text-xs px-1" style={{ color: "var(--color-text-muted)" }}>
          No ZK credential attached to this decision — no verified signal was an input.
        </p>
      )}
    </div>
  );
}
