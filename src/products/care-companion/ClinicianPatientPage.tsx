"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Pill } from "lucide-react";
import { useEazo } from "@/lib/sdk/eazo-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";

type Timeline = {
  patient: { medication?: string | null; currentDose?: string | null; startedAt?: string | null };
  observations: { id: string; checkInAt: string; symptoms: string[]; symptomSeverity: string; adherence: string; notes?: string | null }[];
  interventions: { id: string; action: string; status: string; dueAt: string; completedAt?: string | null; outcomeCode?: string | null; outcomeNote?: string | null }[];
  escalations: { id: string; reason: string; status: string; createdAt: string; resolvedAt?: string | null }[];
  auditLogs: { id: string; actionType: string; reason: string; createdAt: string }[];
};

const words = (value: string) => value.replace(/_/g, " ");
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function ClinicianPatientPage() {
  const user = useEazo((state) => state.auth.user);
  const router = useRouter();
  const params = useParams<{ patientId: string }>();
  const search = useSearchParams();
  const clinicId = search.get("clinicId");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !clinicId || !params.patientId) return;
    let cancelled = false;
    void fetch(`/api/care/clinics/${encodeURIComponent(clinicId)}/patients/${encodeURIComponent(params.patientId)}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Could not load patient record");
        if (!cancelled) setTimeline(json);
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load patient record"); });
    return () => { cancelled = true; };
  }, [clinicId, params.patientId, user]);

  if (!user) return <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)" }}><div className="mx-auto max-w-md"><AuthLockedTeaser title="Patient record" body="Sign in to review a patient’s care timeline." /></div></main>;

  return <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}><div className="mx-auto max-w-4xl space-y-6"><button type="button" onClick={() => router.push(`/care/clinician?clinicId=${encodeURIComponent(clinicId ?? "")}`)} className="min-h-11 inline-flex items-center gap-1 px-2 text-xs" style={{ color: "var(--color-text-secondary)" }}><ArrowLeft className="h-3.5 w-3.5" />Exception review</button><div><p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>Longitudinal patient record</p><h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>Care timeline</h1>{timeline?.patient.medication && <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}><Pill className="h-3.5 w-3.5" />{timeline.patient.medication}{timeline.patient.currentDose ? ` · ${timeline.patient.currentDose}` : ""}</p>}</div>{error && <p className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(220,38,38,0.08)", color: "var(--color-text-secondary)" }}>{error}</p>}{!timeline && !error && <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading patient record…</p>}{timeline && <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4" />Check-ins</h2>{timeline.observations.map((item) => <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><p className="text-xs capitalize">{item.symptoms.map(words).join(", ")} · {item.symptomSeverity}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>{date(item.checkInAt)} · {words(item.adherence)}</p>{item.notes && <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.notes}</p>}</div>)}</section><section className="space-y-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" />Actions and outcomes</h2>{timeline.interventions.map((item) => <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><p className="text-xs">{item.action}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>{item.status === "completed" ? "Completed" : item.status === "skipped" ? "Couldn’t complete" : "Pending"} · {date(item.completedAt ?? item.dueAt)}</p>{item.outcomeCode && <p className="mt-2 text-xs font-medium capitalize" style={{ color: "var(--color-text-secondary)" }}>Patient outcome: {words(item.outcomeCode)}</p>}{item.outcomeNote && <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.outcomeNote}</p>}</div>)}</section><section className="space-y-3 lg:col-span-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" />Escalation history</h2>{timeline.escalations.map((item) => <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: item.status === "open" ? "rgba(220,38,38,0.06)" : "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><p className="text-xs">{item.reason}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>{item.status.replace(/_/g, " ")} · {date(item.createdAt)}</p></div>)}</section><section className="space-y-3 lg:col-span-2"><h2 className="text-sm font-semibold">Clinical review log</h2>{timeline.auditLogs.map((item) => <div key={item.id} className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><p className="text-xs">{item.reason}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>{item.actionType.replace(/_/g, " ")} · {date(item.createdAt)}</p></div>)}</section></div>}</div></main>;
}
