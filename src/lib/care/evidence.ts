import evidenceData from "./glp1-evidence.json";
import type { CareEvidence } from "@/domain/care/types";

export interface Glp1EvidenceEntry {
  symptom: string;
  originalSideEffect: string;
  systemOrganClass: string;
  severity: "mild" | "moderate" | "severe";
  severityClassification: string;
  medication: string;
  dose: string;
  frequencyTreatmentPct: string;
  frequencyPlaceboPct: string;
  excessFrequencyPct: string;
  onsetTiming: string;
  duration: string;
  discontinuationRatePct: string;
  managementStrategy: string;
  clinicalSignificance: string;
  trialSource: string;
  notes: string;
}

export interface EvidenceBasedIntervention {
  action: string;
  evidence: CareEvidence;
}

const DEFAULT_MEDICATION = "Semaglutide";
const DEFAULT_DOSE = "2.4mg weekly";

const entries: Glp1EvidenceEntry[] = (evidenceData.entries as Glp1EvidenceEntry[]).map((e) => ({
  ...e,
  symptom: e.symptom as Glp1EvidenceEntry["symptom"],
  severity: e.severity as Glp1EvidenceEntry["severity"],
}));

function scoreMatch(entry: Glp1EvidenceEntry, medication?: string): number {
  let score = 0;
  if (medication) {
    if (entry.medication.toLowerCase() === medication.toLowerCase()) score += 4;
    if (entry.medication.toLowerCase().includes(medication.toLowerCase())) score += 2;
  } else {
    // Prefer the most common default regimen when no medication is supplied.
    if (entry.medication === DEFAULT_MEDICATION && entry.dose === DEFAULT_DOSE) score += 3;
  }
  return score;
}

/**
 * Find the best evidence-based management strategy for a symptom and severity.
 *
 * Falls back to a less-severe entry if an exact severity match is not found.
 */
export function getEvidenceBasedIntervention(
  symptom: string,
  severity: "mild" | "moderate" | "severe",
  medication?: string,
): EvidenceBasedIntervention | undefined {
  const normalizedSymptom = symptom.toLowerCase();
  const candidates = entries.filter(
    (e) => e.symptom.toLowerCase() === normalizedSymptom && e.severity === severity,
  );

  let best: Glp1EvidenceEntry | undefined;
  let bestScore = -Infinity;
  for (const entry of candidates) {
    const score = scoreMatch(entry, medication);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best) {
    return {
      action: best.managementStrategy,
      evidence: {
        source: evidenceData.source,
        trialSource: best.trialSource,
        clinicalSignificance: best.clinicalSignificance,
      },
    };
  }

  // Fall back to the closest available severity classification.
  const severityOrder: ("mild" | "moderate" | "severe")[] =
    severity === "severe"
      ? ["moderate", "mild"]
      : severity === "moderate"
        ? ["mild", "severe"]
        : ["moderate", "severe"];
  for (const fallbackSeverity of severityOrder) {
    const fallback = getEvidenceBasedIntervention(symptom, fallbackSeverity, medication);
    if (fallback) return fallback;
  }

  return undefined;
}

export function getAllEvidence(): readonly Glp1EvidenceEntry[] {
  return entries;
}
