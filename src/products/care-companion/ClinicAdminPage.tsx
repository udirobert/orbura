"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { Building2, Plus, Pill, ExternalLink, Mail, User, Inbox } from "lucide-react";

const MEDICATIONS = ["Semaglutide", "Tirzepatide", "Liraglutide", "Oral Semaglutide", "Orforglipron"] as const;
const DOSE_OPTIONS: Record<string, string[]> = {
  Semaglutide: ["2.4mg weekly"],
  Tirzepatide: ["15mg weekly"],
  Liraglutide: ["3mg daily"],
  "Oral Semaglutide": ["50mg daily"],
  Orforglipron: ["45mg daily"],
};

type Patient = {
  id: string;
  userId: string;
  clinicId: string | null;
  medication: string | null;
  currentDose: string | null;
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
  const [medication, setMedication] = useState("Semaglutide");
  const [currentDose, setCurrentDose] = useState("2.4mg weekly");
  const [enrolling, setEnrolling] = useState(false);
  const [creating, setCreating] = useState(false);

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
    try {
      const res = await fetch(`/api/care/clinics/${encodeURIComponent(selectedClinicId)}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: patientName.trim() || undefined,
          medication,
          currentDose,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to enroll patient");
      setEmail("");
      setPatientName("");
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

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <main className="min-h-svh px-5 py-8" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>
            Care Companion
          </p>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "var(--font-heading)" }}>
            Clinic admin
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Create clinics, enroll patients, and open the dashboard to track check-ins.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </div>
        )}

        <form onSubmit={createClinic} className="space-y-4">
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
          <div className="space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Enroll patient
            </h2>
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
                <select
                  value={medication}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMedication(next);
                    setCurrentDose(DOSE_OPTIONS[next]?.[0] ?? "");
                  }}
                  className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                >
                  {MEDICATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={currentDose}
                  onChange={(e) => setCurrentDose(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
                  style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                >
                  {(DOSE_OPTIONS[medication] ?? []).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <PrimaryButton type="submit" disabled={enrolling || !selectedClinicId || !email.trim()}>
                {enrolling ? "Enrolling…" : "Enroll patient"}
              </PrimaryButton>
            </form>
          </div>
        )}

        {clinics.map((clinic) => (
          <div key={clinic.id} className="space-y-4">
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
                Dashboard
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
