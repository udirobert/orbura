"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, MessageCircleHeart } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CareCheckInResult, type CareCheckInResponse } from "./CareCheckInResult";

const SYMPTOMS = [
  ["nausea", "Nausea"], ["vomiting", "Vomiting"], ["diarrhoea", "Diarrhoea"],
  ["constipation", "Constipation"], ["abdominal_pain", "Stomach pain"], ["reflux", "Reflux"],
  ["headache", "Headache"], ["fatigue", "Fatigue"], ["dizziness", "Dizziness"],
  ["hypoglycaemia_symptoms", "Low blood sugar symptoms"], ["injection_site_reaction", "Injection-site reaction"],
  ["fever", "Fever"], ["jaundice", "Yellowing skin or eyes"], ["allergic_reaction", "Allergic reaction"],
] as const;

const ADHERENCE = [
  { value: "taken_as_prescribed", label: "Yes, as planned" },
  { value: "missed_one_dose", label: "I missed one dose" },
  { value: "missed_multiple", label: "I missed more than one dose" },
  { value: "stopped", label: "I stopped taking it" },
  { value: "not_started", label: "I have not started yet" },
];

export function CareCheckInForm() {
  const [step, setStep] = useState<"symptoms" | "treatment" | "details">("symptoms");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [adherence, setAdherence] = useState("taken_as_prescribed");
  const [notes, setNotes] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [weightKg, setWeightKg] = useState("");
  const [fastingGlucose, setFastingGlucose] = useState("");
  const [fastingGlucoseUnit, setFastingGlucoseUnit] = useState("");
  const [result, setResult] = useState<CareCheckInResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noSymptoms = symptoms.includes("none");
  const hasSymptoms = symptoms.length > 0;
  const needsUrgentAttention =
    symptoms.includes("jaundice") ||
    symptoms.includes("allergic_reaction") ||
    (severity === "severe" && (symptoms.includes("vomiting") || symptoms.includes("abdominal_pain")));

  const selectNoSymptoms = () => setSymptoms(["none"]);
  const toggleSymptom = (symptom: string) => {
    setSymptoms((previous) => previous.includes(symptom)
      ? previous.filter((item) => item !== symptom)
      : [...previous.filter((item) => item !== "none"), symptom]);
  };

  async function handleSubmit() {
    if (fastingGlucose && !fastingGlucoseUnit) {
      setError("Choose the unit used for your fasting glucose result.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/care/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          symptomSeverity: noSymptoms ? "mild" : severity,
          adherence,
          weightKg: weightKg ? Number(weightKg) : null,
          fastingGlucose: fastingGlucose ? Number(fastingGlucose) : null,
          fastingGlucoseUnit: fastingGlucose ? fastingGlucoseUnit : null,
          notes: notes.trim() || null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "We could not save your check-in. Please try again.");
      setResult(json);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not save your check-in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) return <CareCheckInResult result={result} />;

  const progress = step === "symptoms" ? 1 : step === "treatment" ? 2 : 3;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2" aria-label={`Step ${progress} of 3`}>
        {[1, 2, 3].map((item) => <span key={item} className="h-1 flex-1 rounded-full" style={{ backgroundColor: item <= progress ? "var(--color-brand-primary)" : "var(--color-bg-elevated)" }} />)}
      </div>

      {step === "symptoms" && (
        <div className="space-y-5">
          <div>
            <p className="text-base font-semibold">Any symptoms today?</p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>Select all that apply. You can tell us more only if it is useful.</p>
          </div>
          <button type="button" onClick={selectNoSymptoms} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm" style={{ backgroundColor: noSymptoms ? "rgba(74,222,128,0.1)" : "var(--color-bg-elevated)", border: `1px solid ${noSymptoms ? "rgba(74,222,128,0.35)" : "var(--color-border-subtle)"}` }}>
            <span>I&apos;m feeling okay today</span>{noSymptoms && <Check className="h-4 w-4" style={{ color: "var(--color-states-success)" }} />}
          </button>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map(([value, label]) => {
              const selected = symptoms.includes(value);
              return <button key={value} type="button" onClick={() => toggleSymptom(value)} aria-pressed={selected} className="rounded-full px-3 py-2 text-[11px] transition-colors" style={{ backgroundColor: selected ? "rgba(234,88,12,0.12)" : "transparent", color: selected ? "var(--color-brand-primary)" : "var(--color-text-secondary)", border: `1px solid ${selected ? "rgba(234,88,12,0.45)" : "var(--color-border-subtle)"}` }}>{label}</button>;
            })}
          </div>
          {!noSymptoms && hasSymptoms && <div><p className="mb-2 text-xs font-semibold">How much is it getting in the way?</p><div className="grid grid-cols-3 gap-2">{(["mild", "moderate", "severe"] as const).map((value) => <button key={value} type="button" onClick={() => setSeverity(value)} className="rounded-xl py-2.5 text-[11px] capitalize" style={{ color: severity === value ? "var(--color-brand-primary)" : "var(--color-text-secondary)", backgroundColor: severity === value ? "rgba(234,88,12,0.1)" : "transparent", border: `1px solid ${severity === value ? "rgba(234,88,12,0.4)" : "var(--color-border-subtle)"}` }}>{value}</button>)}</div></div>}
          {needsUrgentAttention && <div role="alert" className="rounded-2xl p-4" style={{ backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.24)" }}><div className="flex gap-2.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-states-error)" }} /><div><p className="text-xs font-semibold">Please don&apos;t wait for an app reply</p><p className="mt-1 text-[11px] leading-4" style={{ color: "var(--color-text-secondary)" }}>If you feel seriously unwell or your symptoms are worsening, seek urgent medical help now. You can still complete this check-in so your care team has the context.</p></div></div></div>}
          <PrimaryButton onClick={() => setStep("treatment")} disabled={!hasSymptoms}>Continue <ArrowRight className="ml-1 inline h-4 w-4" /></PrimaryButton>
        </div>
      )}

      {step === "treatment" && <div className="space-y-5"><div><p className="text-base font-semibold">Did your treatment go to plan?</p><p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>This helps us offer the right kind of support. Your clinic manages your medication details.</p></div><div className="space-y-2">{ADHERENCE.map((item) => <button key={item.value} type="button" onClick={() => setAdherence(item.value)} className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm" style={{ backgroundColor: adherence === item.value ? "rgba(234,88,12,0.1)" : "transparent", border: `1px solid ${adherence === item.value ? "rgba(234,88,12,0.4)" : "var(--color-border-subtle)"}` }}><span>{item.label}</span>{adherence === item.value && <Check className="h-4 w-4" style={{ color: "var(--color-brand-primary)" }} />}</button>)}</div><div className="flex gap-3"><button type="button" onClick={() => setStep("symptoms")} className="px-2 text-xs" style={{ color: "var(--color-text-secondary)" }}><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Back</button><PrimaryButton onClick={() => setStep("details")}>Continue <ArrowRight className="ml-1 inline h-4 w-4" /></PrimaryButton></div></div>}

      {step === "details" && <div className="space-y-5"><div><p className="text-base font-semibold">Anything else we should know?</p><p className="mt-1 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>A short note is enough. You can skip this.</p></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="For example: I could only manage a few bites at dinner." className="w-full resize-none rounded-2xl px-3.5 py-3 text-sm outline-none placeholder:text-[#8A8480]" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} /><button type="button" onClick={() => setShowOptional((value) => !value)} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Add optional measurements <ChevronDown className={`ml-1 inline h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} /></button>{showOptional && <div className="grid grid-cols-2 gap-3"><label className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>Weight (kg)<input inputMode="decimal" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} /></label><label className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>Fasting glucose<input inputMode="decimal" value={fastingGlucose} onChange={(event) => setFastingGlucose(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }} /><select value={fastingGlucoseUnit} onChange={(event) => setFastingGlucoseUnit(event.target.value)} className="mt-2 w-full rounded-xl px-3 py-2.5 text-xs" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-primary)" }}><option value="">Unit</option><option value="mmol/L">mmol/L</option><option value="mg/dL">mg/dL</option></select></label></div>} {error && <p className="rounded-xl p-3 text-xs" style={{ color: "var(--color-states-error)", backgroundColor: "rgba(220,38,38,0.08)" }}>{error}</p>}<div className="flex gap-3"><button type="button" onClick={() => setStep("treatment")} className="px-2 text-xs" style={{ color: "var(--color-text-secondary)" }}><ArrowLeft className="mr-1 inline h-3.5 w-3.5" />Back</button><PrimaryButton onClick={handleSubmit} disabled={loading}>{loading ? "Saving your check-in…" : <>Share check-in <MessageCircleHeart className="ml-1 inline h-4 w-4" /></>}</PrimaryButton></div></div>}
    </div>
  );
}
