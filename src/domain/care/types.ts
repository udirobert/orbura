/**
 * Care Companion domain types.
 *
 * These are plain TypeScript types used by the application and delivery
 * layers. The Drizzle schema lives in src/lib/db/schema/care.ts and maps
 * to/from these shapes at the repository boundary.
 */

export type CareSymptom =
  | "nausea"
  | "vomiting"
  | "diarrhoea"
  | "constipation"
  | "abdominal_pain"
  | "reflux"
  | "headache"
  | "fatigue"
  | "dizziness"
  | "hypoglycaemia_symptoms"
  | "injection_site_reaction"
  | "fever"
  | "jaundice"
  | "allergic_reaction"
  | "none";

export type AdherenceStatus =
  | "taken_as_prescribed"
  | "missed_one_dose"
  | "missed_multiple"
  | "stopped"
  | "not_started";

export type GlucoseUnit = "mmol/L" | "mg/dL";

export interface CareObservationInput {
  patientId: string;
  symptoms: CareSymptom[];
  symptomSeverity: "mild" | "moderate" | "severe";
  adherence: AdherenceStatus;
  weightKg?: number | null;
  fastingGlucose?: number | null;
  fastingGlucoseUnit?: GlucoseUnit | null;
  notes?: string | null;
  medication?: string | null;
  currentDose?: string | null;
}

export interface CareObservation {
  id: string;
  patientId: string;
  checkInAt: Date;
  symptoms: CareSymptom[];
  symptomSeverity: "mild" | "moderate" | "severe";
  adherence: AdherenceStatus;
  weightKg: number | null;
  fastingGlucose: number | null;
  fastingGlucoseUnit: string | null;
  notes: string | null;
}

export interface CareIntervention {
  id: string;
  patientId: string;
  observationId: string | null;
  action: string;
  status: "pending" | "completed" | "skipped";
  dueAt: Date;
  completedAt: Date | null;
}

export interface CareEscalation {
  id: string;
  patientId: string;
  observationId: string | null;
  reason: string;
  status: "open" | "resolved" | "clinic_reviewed";
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface CareEvidence {
  source: string;
  trialSource: string;
  clinicalSignificance: string;
}

export type CareAction =
  | { type: "escalate"; reason: string }
  | { type: "intervention"; action: string; explanation?: string; evidence?: CareEvidence };

export interface CheckInResult {
  observation: CareObservation;
  action: CareAction;
  intervention?: CareIntervention;
  escalation?: CareEscalation;
}
