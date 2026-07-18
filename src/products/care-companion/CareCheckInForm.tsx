"use client";

import { useState, useEffect } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CareCheckInResult, type CareCheckInResponse } from "./CareCheckInResult";

const SYMPTOMS = [
  "nausea",
  "vomiting",
  "diarrhoea",
  "constipation",
  "abdominal_pain",
  "reflux",
  "headache",
  "fatigue",
  "dizziness",
  "hypoglycaemia_symptoms",
  "injection_site_reaction",
  "fever",
  "jaundice",
  "allergic_reaction",
  "none",
];

const SEVERITY = ["mild", "moderate", "severe"] as const;

const MEDICATIONS = ["Semaglutide", "Tirzepatide", "Liraglutide", "Oral Semaglutide", "Orforglipron"] as const;
const DOSE_OPTIONS: Record<string, string[]> = {
  Semaglutide: ["2.4mg weekly"],
  Tirzepatide: ["15mg weekly"],
  Liraglutide: ["3mg daily"],
  "Oral Semaglutide": ["50mg daily"],
  Orforglipron: ["45mg daily"],
};

const ADHERENCE = [
  { value: "taken_as_prescribed", label: "Taken as prescribed" },
  { value: "missed_one_dose", label: "Missed one dose" },
  { value: "missed_multiple", label: "Missed multiple doses" },
  { value: "stopped", label: "Stopped taking it" },
  { value: "not_started", label: "Not started yet" },
];

export function CareCheckInForm() {
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [adherence, setAdherence] = useState("taken_as_prescribed");
  const [weightKg, setWeightKg] = useState("");
  const [fastingGlucose, setFastingGlucose] = useState("");
  const [notes, setNotes] = useState("");
  const [medication, setMedication] = useState("Semaglutide");
  const [currentDose, setCurrentDose] = useState("2.4mg weekly");
  const [result, setResult] = useState<CareCheckInResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/care/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms,
        symptomSeverity: severity,
        adherence,
        weightKg: weightKg ? Number(weightKg) : null,
        fastingGlucose: fastingGlucose ? Number(fastingGlucose) : null,
        notes,
        medication,
        currentDose,
      }),
    });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Symptoms today
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <label
              key={s}
              className="cursor-pointer text-[11px] px-2.5 py-1.5 rounded-full border"
              style={{
                borderColor: symptoms.includes(s)
                  ? "var(--color-brand-primary)"
                  : "var(--color-border-subtle)",
                backgroundColor: symptoms.includes(s) ? "rgba(234,88,12,0.12)" : "transparent",
                color: symptoms.includes(s) ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
              }}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={symptoms.includes(s)}
                onChange={() => toggleSymptom(s)}
              />
              {s.replace(/_/g, " ")}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          How severe are they?
        </p>
        <div className="flex gap-2">
          {SEVERITY.map((s) => (
            <label
              key={s}
              className="flex-1 text-center text-[11px] py-2 rounded-xl border cursor-pointer"
              style={{
                borderColor: severity === s ? "var(--color-brand-primary)" : "var(--color-border-subtle)",
                backgroundColor: severity === s ? "rgba(234,88,12,0.08)" : "transparent",
                color: severity === s ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
              }}
            >
              <input
                type="radio"
                name="severity"
                value={s}
                className="sr-only"
                checked={severity === s}
                onChange={() => setSeverity(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Medication adherence
        </p>
        <select
          value={adherence}
          onChange={(e) => setAdherence(e.target.value)}
          className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
        >
          {ADHERENCE.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Medication
        </p>
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
      </div>

      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Dose
        </p>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Weight (kg)
          </p>
          <input
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="optional"
            className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
            Fasting glucose
          </p>
          <input
            type="number"
            value={fastingGlucose}
            onChange={(e) => setFastingGlucose(e.target.value)}
            placeholder="optional"
            className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
          Notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-xl px-3 py-2.5 border bg-transparent"
          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
        />
      </div>

      <PrimaryButton type="submit" disabled={loading}>
        {loading ? "Checking in…" : "Check in"}
      </PrimaryButton>

      {result && <CareCheckInResult result={result} />}
    </form>
  );
}
