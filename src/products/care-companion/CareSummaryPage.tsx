"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEazo } from "@/lib/sdk/eazo-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { CheckCircle2, AlertTriangle, Clock, ClipboardList, ArrowRight, Plus, Activity } from "lucide-react";

function updateInterventionStatus(id: string, status: "completed" | "skipped") {
  return fetch(`/api/care/interventions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

type Observation = {
  id: string;
  checkInAt: string;
  symptoms: string[];
  symptomSeverity: string;
  adherence: string;
  weightKg?: number | null;
  fastingGlucose?: number | null;
  notes?: string | null;
};

type Intervention = {
  id: string;
  action: string;
  status: string;
  dueAt: string;
};

type Escalation = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
};

type Summary = {
  observations: Observation[];
  pendingInterventions: Intervention[];
  openEscalations: Escalation[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function symptomLabel(s: string) {
  return s.replace(/_/g, " ");
}

function severityColor(severity: string): string {
  if (severity === "severe") return "#dc2626";
  if (severity === "moderate") return "#ea580c";
  return "#16a34a";
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 text-sm"
      style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
    >
      <p style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
      {children}
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-faint)" }}
      >
        {count}
      </span>
    </h2>
  );
}

export function CareSummaryPage() {
  const user = useEazo((s) => s.auth.user);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/care/patient/summary");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load summary");
        if (!cancelled) setSummary(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = setTimeout(load, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [user]);

  async function handleInterventionStatus(id: string, status: "completed" | "skipped") {
    setUpdating(id);
    try {
      const res = await updateInterventionStatus(id, status);
      if (!res.ok) throw new Error("Failed to update intervention");
      setSummary((prev) =>
        prev
          ? { ...prev, pendingInterventions: prev.pendingInterventions.filter((i) => i.id !== id) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update intervention");
    } finally {
      setUpdating(null);
    }
  }

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser title="Your care summary" body="Sign in to view your check-ins and next steps." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Here&apos;s what&apos;s happening with your care plan and what to do next.
          </p>
        </div>

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <section className="space-y-3">
          <SectionTitle count={summary?.pendingInterventions.length ?? 0}>
            <ClipboardList className="h-4 w-4" />
            Next step
          </SectionTitle>
          {(summary?.pendingInterventions.length ?? 0) === 0 ? (
            <EmptyState
              message="No pending actions. You’re up to date — check in again tomorrow or if anything changes."
              action={
                <Link
                  href="/care"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: "var(--color-brand-primary)" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New check-in
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {summary?.pendingInterventions.map((i) => (
                <div
                  key={i.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5" style={{ color: "#16a34a" }} />
                    <div className="flex-1">
                      <p className="text-sm">{i.action}</p>
                      <p className="text-[10px] mt-1 font-mono uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-faint)" }}>
                        <Clock className="h-3 w-3" />
                        Due {formatDate(i.dueAt)}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          disabled={updating === i.id}
                          onClick={() => handleInterventionStatus(i.id, "completed")}
                          className="text-[11px] px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                          style={{ backgroundColor: "#16a34a", color: "white" }}
                        >
                          Mark done
                        </button>
                        <button
                          type="button"
                          disabled={updating === i.id}
                          onClick={() => handleInterventionStatus(i.id, "skipped")}
                          className="text-[11px] px-3 py-1.5 rounded-full border bg-transparent disabled:opacity-50"
                          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle count={summary?.openEscalations.length ?? 0}>
            <AlertTriangle className="h-4 w-4" />
            Open escalations
          </SectionTitle>
          {(summary?.openEscalations.length ?? 0) === 0 ? (
            <EmptyState message="No open escalations. If you report severe or red-flag symptoms, your care team will be notified and it will appear here." />
          ) : (
            <div className="space-y-3">
              {summary?.openEscalations.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 mt-0.5" style={{ color: "#dc2626" }} />
                    <div>
                      <p className="text-sm">{e.reason}</p>
                      <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                        Opened {formatDate(e.createdAt)}
                      </p>
                      <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>
                        A clinician has been notified. If your symptoms worsen, seek urgent or emergency care.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle count={summary?.observations.length ?? 0}>
            <Activity className="h-4 w-4" />
            Recent check-ins
          </SectionTitle>
          {(summary?.observations.length ?? 0) === 0 ? (
            <EmptyState
              message="No check-ins yet. Your first check-in builds your care history and helps us give you better guidance."
              action={
                <Link
                  href="/care"
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
                  style={{ backgroundColor: "var(--color-brand-primary)", color: "white" }}
                >
                  Start your first check-in
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {summary?.observations.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm capitalize">
                      {o.symptoms.map(symptomLabel).join(", ")}
                    </p>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: `${severityColor(o.symptomSeverity)}20`,
                        color: severityColor(o.symptomSeverity),
                      }}
                    >
                      {o.symptomSeverity}
                    </span>
                  </div>
                  <p className="text-[10px] mt-1 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    {formatDate(o.checkInAt)} at {formatTime(o.checkInAt)} · {o.adherence.replace(/_/g, " ")}
                    {o.weightKg ? ` · ${o.weightKg}kg` : ""}
                    {o.fastingGlucose ? ` · ${o.fastingGlucose}mg/dL` : ""}
                  </p>
                  {o.notes && <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>{o.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
