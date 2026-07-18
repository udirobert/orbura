"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { Building2, Plus, Pill, ExternalLink, Mail, User, Inbox, CheckCircle2 } from "lucide-react";

type Patient = {
  id: string;
  userId: string;
  clinicId: string | null;
  medication: string | null;
  currentDose: string | null;
  startedAt: string | null;
  enrolledAt: string;
  userName?: string | null;
  userEmail?: string | null;
};

type Clinic = {
  id: string;
  name: string;
  createdAt: string;
  patients: Patient[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ClinicAdminPage() {
  const user = useEazo((s) => s.auth.user);
  const router = useRouter();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newClinicName, setNewClinicName] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [medication, setMedication] = useState("");
  const [currentDose, setCurrentDose] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadClinics();
  }, [user]);

  async function loadClinics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/care/clinics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load clinics");
      setClinics(json.clinics ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  }

  async function createClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!newClinicName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/care/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClinicName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create clinic");
      setNewClinicName("");
      await loadClinics();
      setSelectedClinicId(json.clinic.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clinic");
    } finally {
      setCreating(false);
    }
  }

  async function enrollPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClinicId || !email.trim()) return;
    setEnrolling(true);
    setError(null);
    setEnrollmentSuccess(null);
    try {
      const res = await fetch(`/api/care/clinics/${encodeURIComponent(selectedClinicId)}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: patientName.trim() || undefined,
          medication: medication.trim() || undefined,
          currentDose: currentDose.trim() || undefined,
          startedAt: startedAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to enroll patient");
      setEmail("");
      setPatientName("");
      setMedication("");
      setCurrentDose("");
      setStartedAt("");
      setEnrollmentSuccess(json.patient.userId ? "Patient enrolled. Their next check-in will be routed to this clinic." : "Patient enrolled.");
      await loadClinics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enroll patient");
    } finally {
      setEnrolling(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
        <div className="max-w-md mx-auto">
          <AuthLockedTeaser
            title="Clinic admin"
            body="Sign in to create clinics and enroll patients."
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Clinic admin
          </h1>
          <p className="text-xs mt-1 leading-5" style={{ color: "var(--color-text-secondary)" }}>
            Set up the care record once. Patients receive simple support; your team sees only the exceptions that need judgement.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--color-text-secondary)" }}>
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <form onSubmit={createClinic} className="space-y-4 rounded-[1.5rem] p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Create clinic
          </h2>
          <input
            type="text"
            value={newClinicName}
            onChange={(e) => setNewClinicName(e.target.value)}
            placeholder="Clinic name"
            className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
          <PrimaryButton type="submit" disabled={creating || !newClinicName.trim()}>
            {creating ? "Creating…" : "Create clinic"}
          </PrimaryButton>
        </form>

        {clinics.length > 0 && (
          <div className="space-y-4 rounded-[1.5rem] p-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Enroll patient
            </h2>
            <p className="-mt-2 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>Use the medication and dose exactly as recorded in the patient&apos;s existing clinical plan. This does not change a prescription.</p>
            <form onSubmit={enrollPatient} className="space-y-4">
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              >
                <option value="">Select a clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.patients.length} patients)
                  </option>
                ))}
              </select>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Patient email"
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              />

              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Patient name (optional)"
                className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  Medication <span style={{ color: "var(--color-text-faint)" }}>(optional)</span>
                  <input
                  type="text"
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  placeholder="As recorded"
                  className="mt-1.5 w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                />
                </label>
                <label className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                  Current dose <span style={{ color: "var(--color-text-faint)" }}>(optional)</span>
                  <input
                  type="text"
                  value={currentDose}
                  onChange={(e) => setCurrentDose(e.target.value)}
                  placeholder="As recorded"
                  className="mt-1.5 w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                />
                </label>
              </div>

              <label className="block text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                Treatment start date <span style={{ color: "var(--color-text-faint)" }}>(optional)</span>
                <input type="date" value={startedAt} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setStartedAt(e.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} />
              </label>

              <PrimaryButton type="submit" disabled={enrolling || !selectedClinicId || !email.trim()}>
                {enrolling ? "Enrolling…" : "Enroll patient"}
              </PrimaryButton>
            </form>
            {enrollmentSuccess && <p className="flex items-center gap-2 rounded-xl p-3 text-xs" style={{ backgroundColor: "rgba(74,222,128,0.08)", color: "var(--color-states-success)" }}><CheckCircle2 className="h-4 w-4" />{enrollmentSuccess}</p>}
          </div>
        )}
        </div>

        {clinics.map((clinic) => (
          <div key={clinic.id} className="space-y-4 rounded-[1.5rem] p-5" style={{ backgroundColor: "rgba(20,20,22,0.45)", border: "1px solid var(--color-border-subtle)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {clinic.name}
              </h2>
              <button
                type="button"
                onClick={() => router.push(`/care/clinician?clinicId=${encodeURIComponent(clinic.id)}`)}
                className="text-xs flex items-center gap-1 font-medium"
                style={{ color: "var(--color-brand-primary)" }}
              >
                Review exceptions
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {clinic.patients.length === 0 ? (
              <div
                className="rounded-2xl p-5 text-sm"
                style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
              >
                <div className="flex items-center gap-2" style={{ color: "var(--color-text-secondary)" }}>
                  <Inbox className="h-4 w-4" />
                  No patients enrolled yet.
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {clinic.patients.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-2xl p-4 text-sm"
                    style={{
                      backgroundColor: "var(--color-bg-surface)",
                      border: "1px solid var(--color-border-subtle)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full" style={{ backgroundColor: "rgba(234,88,12,0.1)" }}>
                        <User className="h-4 w-4" style={{ color: "var(--color-brand-primary)" }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{p.userName ?? "Unnamed patient"}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]" style={{ color: "var(--color-text-faint)" }}>
                          {p.userEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {p.userEmail}
                            </span>
                          )}
                          {p.medication && (
                            <span className="flex items-center gap-1">
                              <Pill className="h-3 w-3" />
                              {p.medication}{p.currentDose ? ` — ${p.currentDose}` : ""}
                            </span>
                          )}
                          {p.startedAt && <span>Treatment started {formatDate(p.startedAt)}</span>}
                        </div>
                        <p className="text-[10px] mt-2 font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                          Enrolled {formatDate(p.enrolledAt)} · ID {p.id}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {loading && <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>}
      </div>
    </main>
  );
}
