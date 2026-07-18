"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { AlertTriangle, CheckCircle2, Clock, User, Mail, Pill, Inbox, Building2, ArrowRight } from "lucide-react";

function resolveEscalation(id: string, clinicId: string, status: "resolved" | "clinic_reviewed", reason: string) {
  return fetch(`/api/care/escalations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, clinicId, reason }),
  });
}

type Escalation = {
  id: string;
  patientId: string;
  observationId?: string;
  reason: string;
  status: string;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
  patient?: { medication?: string | null; currentDose?: string | null };
  observation?: {
    symptoms: string[];
    symptomSeverity: string;
    adherence: string;
    checkInAt: string;
    notes?: string | null;
  } | null;
};

type Intervention = {
  id: string;
  patientId: string;
  observationId?: string;
  action: string;
  status: string;
  dueAt: string;
  completedAt?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  patient?: { medication?: string | null; currentDose?: string | null };
};

type Clinic = { id: string; name: string };

function formatRelative(date: string) {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function humanise(value: string) {
  return value.replace(/_/g, " ");
}

function PatientMeta({ item }: { item: Escalation | Intervention }) {
  const name = item.userName ?? "Unknown";
  const email = item.userEmail;
  const med = item.patient?.medication;
  const dose = item.patient?.currentDose;
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "var(--color-text-faint)" }}>
      <span className="flex items-center gap-1">
        <User className="h-3 w-3" />
        {name}
      </span>
      {email && (
        <span className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {email}
        </span>
      )}
      {med && (
        <span className="flex items-center gap-1">
          <Pill className="h-3 w-3" />
          {med}{dose ? ` — ${dose}` : ""}
        </span>
      )}
    </div>
  );
}

export function ClinicianPage() {
  const user = useEazo((s) => s.auth.user);
  const params = useSearchParams();
  const router = useRouter();
  const clinicId = params.get("clinicId");

  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [recentOutcomes, setRecentOutcomes] = useState<Intervention[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<{ id: string; status: "resolved" | "clinic_reviewed" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadClinics = async () => {
      setClinicsLoading(true);
      try {
        const res = await fetch("/api/care/clinics");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load your clinics");
        if (!cancelled) setClinics(json.clinics ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your clinics");
      } finally {
        if (!cancelled) setClinicsLoading(false);
      }
    };
    void loadClinics();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!clinicId || !user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/care/summary?clinicId=${encodeURIComponent(clinicId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load summary");
        if (!cancelled) {
          setEscalations(json.openEscalations ?? []);
          setInterventions(json.pendingInterventions ?? []);
          setRecentOutcomes(json.recentOutcomes ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const id = setTimeout(load, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [clinicId, user]);

  async function handleResolveEscalation(id: string, status: "resolved" | "clinic_reviewed", reason: string) {
    if (!clinicId) return;
    setUpdating(id);
    try {
      const res = await resolveEscalation(id, clinicId, status, reason);
      if (!res.ok) throw new Error("Failed to update escalation");
      setEscalations((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update escalation");
    } finally {
      setUpdating(null);
      setReviewPrompt(null);
      setReviewNote("");
    }
  }

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser
            title="Clinic dashboard"
            body="Sign in to view patient escalations and pending interventions."
          />
        </div>
      </main>
    );
  }

  if (!clinicId) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
              Care Companion
            </p>
            <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
              Clinic dashboard
            </h1>
            <p className="text-xs mt-1 leading-5" style={{ color: "var(--color-text-secondary)" }}>
              Review only the patients who need human judgement—not every routine check-in.
            </p>
          </div>
          {clinicsLoading ? <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading your clinics…</p> : clinics.length === 0 ? (
            <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
              <p className="text-sm font-semibold">No clinic access yet</p>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>Ask a clinic administrator to add you, or create a clinic before enrolling patients.</p>
              <button type="button" onClick={() => router.push("/care/admin")} className="mt-4 min-h-11 inline-flex items-center gap-1.5 px-2 text-xs font-semibold" style={{ color: "var(--color-brand-primary)" }}>Open clinic admin <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
          ) : <div className="space-y-2">{clinics.map((clinic) => <button key={clinic.id} type="button" onClick={() => router.replace(`/care/clinician?clinicId=${encodeURIComponent(clinic.id)}`)} className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><span className="flex items-center gap-3 text-sm font-medium"><Building2 className="h-4 w-4" style={{ color: "var(--color-brand-primary)" }} />{clinic.name}</span><ArrowRight className="h-4 w-4" style={{ color: "var(--color-text-faint)" }} /></button>)}</div>}
        </div>
      </main>
    );
  }

  const clinicName = clinics.find((clinic) => clinic.id === clinicId)?.name ?? "Your clinic";

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Exception review
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {clinicName} · the patients who need a human response today.
          </p>
          </div>
          <button type="button" onClick={() => router.replace("/care/clinician")} className="min-h-11 flex items-center px-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>Switch clinic</button>
        </div>

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--color-text-secondary)" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.16)" }}><p className="text-2xl" style={{ fontFamily: "var(--font-heading)", color: "var(--color-states-error)" }}>{escalations.length}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Need review</p></div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><p className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>{interventions.length}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Patient actions open</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <AlertTriangle className="h-4 w-4" />
            Needs review
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-faint)" }}
            >
              {escalations.length}
            </span>
          </h2>
          {escalations.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-sm"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                <Inbox className="h-4 w-4" />
                No open escalations. New severe or red-flag check-ins will appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {escalations.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: "rgba(220,38,38,0.12)" }}>
                      <AlertTriangle className="h-5 w-5" style={{ color: "var(--color-states-error)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{e.reason}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full px-2 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ backgroundColor: "rgba(220,38,38,0.12)", color: "var(--color-states-error)" }}>Awaiting review</span>
                        {e.observation && <span className="rounded-full px-2 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ backgroundColor: e.observation.symptomSeverity === "severe" ? "rgba(220,38,38,0.12)" : "rgba(234,88,12,0.1)", color: e.observation.symptomSeverity === "severe" ? "var(--color-states-error)" : "var(--color-brand-primary)" }}>{e.observation.symptomSeverity} symptoms</span>}
                      </div>
                      <div className="mt-2">
                        <PatientMeta item={e} />
                      </div>
                      <p className="text-[10px] mt-2 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatRelative(e.createdAt)}
                      </p>
                      {e.observation && <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "rgba(10,10,11,0.38)", border: "1px solid rgba(220,38,38,0.12)" }}>
                        <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>Reported at this check-in</p>
                        <p className="mt-1.5 text-xs capitalize">{e.observation.symptoms.map(humanise).join(", ")} · {e.observation.symptomSeverity}</p>
                        <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>Treatment: {humanise(e.observation.adherence)}</p>
                        {e.observation.notes && <p className="mt-2 border-l-2 pl-2 text-[11px] leading-4" style={{ borderColor: "rgba(220,38,38,0.35)", color: "var(--color-text-secondary)" }}>{e.observation.notes}</p>}
                      </div>}
                      {reviewPrompt?.id === e.id ? <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}><p className="text-xs font-semibold">Add a review note</p><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} rows={2} placeholder="What did you review or decide?" className="mt-2 min-h-11 w-full resize-none rounded-lg px-2.5 py-2 text-xs" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} /><div className="mt-2 flex gap-2"><button type="button" disabled={!reviewNote.trim() || updating === e.id} onClick={() => handleResolveEscalation(e.id, reviewPrompt.status, reviewNote)} className="min-h-11 rounded-full px-3 py-1.5 text-[11px] font-medium disabled:opacity-50" style={{ backgroundColor: "var(--color-states-error)", color: "var(--color-text-primary)" }}>{reviewPrompt.status === "resolved" ? "Resolve escalation" : "Save review"}</button><button type="button" onClick={() => { setReviewPrompt(null); setReviewNote(""); }} className="min-h-11 px-2 text-[11px]" style={{ color: "var(--color-text-secondary)" }}>Cancel</button></div></div> : <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={() => router.push(`/care/clinician/patient/${encodeURIComponent(e.patientId)}?clinicId=${encodeURIComponent(clinicId)}`)} className="min-h-11 text-[11px] px-3 py-1.5 rounded-full border" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>Patient timeline</button>
                        <button
                          type="button"
                          disabled={updating === e.id}
                          onClick={() => setReviewPrompt({ id: e.id, status: "clinic_reviewed" })}
                          className="min-h-11 text-[11px] px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                          style={{ backgroundColor: "var(--color-states-error)", color: "var(--color-text-primary)" }}
                        >
                          Mark reviewed
                        </button>
                        <button
                          type="button"
                          disabled={updating === e.id}
                          onClick={() => setReviewPrompt({ id: e.id, status: "resolved" })}
                          className="min-h-11 text-[11px] px-3 py-1.5 rounded-full border bg-transparent disabled:opacity-50"
                          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                        >
                          Resolve
                        </button>
                      </div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <CheckCircle2 className="h-4 w-4" />
            Pending actions
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-faint)" }}
            >
              {interventions.length}
            </span>
          </h2>
          {interventions.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-sm"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
            >
              <div className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                <Inbox className="h-4 w-4" />
                No pending interventions. Patients see their next steps in the app.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {interventions.map((i) => (
                <div
                  key={i.id}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: "var(--color-bg-surface)",
                    border: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: "rgba(74,222,128,0.12)" }}>
                      <CheckCircle2 className="h-5 w-5" style={{ color: "var(--color-states-success)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{i.action}</p>
                      <div className="mt-2">
                        <PatientMeta item={i} />
                      </div>
                      <p className="text-[10px] mt-2 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        due {formatRelative(i.dueAt)}
                      </p>
                      <button type="button" onClick={() => router.push(`/care/clinician/patient/${encodeURIComponent(i.patientId)}?clinicId=${encodeURIComponent(clinicId)}`)} className="mt-3 min-h-11 px-2 text-[11px]" style={{ color: "var(--color-brand-primary)" }}>Open patient timeline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </div>

        {(recentOutcomes.length > 0 || !loading) && <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
            <CheckCircle2 className="h-4 w-4" />
            Recent patient outcomes
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-faint)" }}>{recentOutcomes.length}</span>
          </h2>
          {recentOutcomes.length === 0 ? (
            <div className="rounded-2xl p-4 text-xs" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-secondary)" }}>When patients complete or cannot complete a recommended action, that outcome appears here.</div>
          ) : <div className="grid gap-2 md:grid-cols-2">{recentOutcomes.slice(0, 8).map((outcome) => {
            const completed = outcome.status === "completed";
            return <div key={outcome.id} className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: completed ? "var(--color-states-success)" : "var(--color-text-faint)" }} /><div><p className="text-xs">{outcome.action}</p><p className="mt-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>{outcome.userName ?? "Patient"} · {completed ? "completed" : "couldn’t complete"}{outcome.completedAt ? ` · ${formatRelative(outcome.completedAt)}` : ""}</p></div></div></div>;
          })}</div>}
        </section>}
      </div>
    </main>
  );
}
