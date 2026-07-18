"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { AlertTriangle, CheckCircle2, Clock, User, Mail, Pill, Inbox } from "lucide-react";

function resolveEscalation(id: string, clinicId: string, status: "resolved" | "clinic_reviewed") {
  return fetch(`/api/care/escalations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, clinicId }),
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
};

type Intervention = {
  id: string;
  patientId: string;
  observationId?: string;
  action: string;
  status: string;
  dueAt: string;
  userName?: string | null;
  userEmail?: string | null;
  patient?: { medication?: string | null; currentDose?: string | null };
};

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

function ClinicSelector({ onSelect }: { onSelect: (clinicId: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSelect(value.trim());
      }}
      className="max-w-md mx-auto space-y-4"
    >
      <label className="block text-xs font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
        Clinic ID
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. demo-clinic"
        className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
        style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
      />
      <PrimaryButton type="submit">Open dashboard</PrimaryButton>
    </form>
  );
}

export function ClinicianPage() {
  const user = useEazo((s) => s.auth.user);
  const params = useSearchParams();
  const router = useRouter();
  const clinicId = params.get("clinicId");

  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

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

  async function handleResolveEscalation(id: string, status: "resolved" | "clinic_reviewed") {
    if (!clinicId) return;
    setUpdating(id);
    try {
      const res = await resolveEscalation(id, clinicId, status);
      if (!res.ok) throw new Error("Failed to update escalation");
      setEscalations((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update escalation");
    } finally {
      setUpdating(null);
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
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Enter a clinic ID to review open escalations and pending patient actions.
            </p>
          </div>
          <ClinicSelector onSelect={(id) => router.replace(`/care/clinician?clinicId=${encodeURIComponent(id)}`)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--color-heading)" }}>
            Clinic dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Clinic: <span className="font-mono">{clinicId}</span>
          </p>
        </div>

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

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
                    backgroundColor: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.15)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
                      <AlertTriangle className="h-5 w-5" style={{ color: "#dc2626" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{e.reason}</p>
                      <div className="mt-2">
                        <PatientMeta item={e} />
                      </div>
                      <p className="text-[10px] mt-2 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatRelative(e.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          disabled={updating === e.id}
                          onClick={() => handleResolveEscalation(e.id, "clinic_reviewed")}
                          className="text-[11px] px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
                          style={{ backgroundColor: "#dc2626", color: "white" }}
                        >
                          Mark reviewed
                        </button>
                        <button
                          type="button"
                          disabled={updating === e.id}
                          onClick={() => handleResolveEscalation(e.id, "resolved")}
                          className="text-[11px] px-3 py-1.5 rounded-full border bg-transparent disabled:opacity-50"
                          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
                        >
                          Resolve
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
                    <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
                      <CheckCircle2 className="h-5 w-5" style={{ color: "#16a34a" }} />
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
