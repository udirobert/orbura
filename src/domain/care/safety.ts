import type {
  CareObservation,
  CareObservationInput,
  CareAction,
  CareSymptom,
  AdherenceStatus,
} from "./types";
import { getEvidenceBasedIntervention } from "@/lib/care/evidence";

type TrackableSymptom = Exclude<CareSymptom, "none">;

/** Hard safety signals — escalate regardless of severity. */
const RED_FLAG_SYMPTOMS: TrackableSymptom[] = [
  "jaundice",
  "allergic_reaction",
  "hypoglycaemia_symptoms",
  "fever",
];

/** These symptoms are expected side effects at mild/moderate severity, but
 * severe or persistent episodes require escalation. */
const SEVERE_ACUTE_SYMPTOMS: TrackableSymptom[] = ["vomiting", "abdominal_pain"];

/**
 * Deterministic GLP-1 safety and escalation rules for the first 12 weeks.
 *
 * Interventions are sourced from the Ozarihealth GLP-1 side effects dataset
 * (CC-BY-4.0) when available, and fall back to conservative generic guidance
 * for symptoms not covered by the dataset.
 */
export function evaluateObservation(
  input: CareObservationInput,
  previousObservations: Pick<CareObservation, "symptoms" | "symptomSeverity" | "checkInAt">[],
  context: { medication?: string; currentDose?: string } = {},
): CareAction {
  // 1. Adherence / disengagement — escalate even if no symptoms reported
  if (input.adherence === "missed_multiple" || input.adherence === "stopped") {
    return {
      type: "escalate",
      reason: "Multiple missed doses or treatment stopped — clinic follow-up required.",
    };
  }

  const symptoms = input.symptoms.filter((s): s is TrackableSymptom => s !== "none");

  // 2. No symptoms reported
  if (symptoms.length === 0) {
    return { type: "intervention", action: "You're on track. Log again tomorrow." };
  }

  // 3. Hard safety signals — always escalate
  for (const redFlag of RED_FLAG_SYMPTOMS) {
    if (symptoms.includes(redFlag)) {
      return {
        type: "escalate",
        reason: `Severe safety signal reported: ${redFlag.replace(/_/g, " ")}.`,
      };
    }
  }

  // 4. Severe vomiting or abdominal pain — possible pancreatitis / gallbladder
  if (input.symptomSeverity === "severe") {
    for (const severeAcute of SEVERE_ACUTE_SYMPTOMS) {
      if (symptoms.includes(severeAcute)) {
        return {
          type: "escalate",
          reason: `Severe ${severeAcute.replace(/_/g, " ")} reported — clinic review needed.`,
        };
      }
    }
  }

  // 5. Persistent moderate+ symptom > 7 days
  const sameSymptomForDays = (symptom: CareSymptom) => {
    const matching = previousObservations.filter(
      (o) => o.symptoms.includes(symptom) && o.symptomSeverity !== "mild",
    );
    if (matching.length === 0) return 0;
    const oldest = matching.reduce((min, o) => (o.checkInAt < min ? o.checkInAt : min), matching[0].checkInAt);
    const days = (Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24);
    return days;
  };

  for (const symptom of symptoms) {
    if (input.symptomSeverity !== "mild" && sameSymptomForDays(symptom) > 7) {
      return {
        type: "escalate",
        reason: `${symptom.replace(/_/g, " ")} has persisted at moderate or severe for more than 7 days.`,
      };
    }
  }

  // 6. Physiological vital distress (tachypnea / tachycardia alongside symptoms)
  // Severe nausea or vomiting with elevated resting pulse (>100 bpm) or tachypnea (>22 br/min)
  // indicates acute autonomic distress or dehydration requiring clinical review.
  const vitals = input.vitals;
  if (vitals && (symptoms.includes("vomiting") || symptoms.includes("nausea") || symptoms.includes("dizziness"))) {
    if (vitals.pulseBpm != null && vitals.pulseBpm >= 100) {
      return {
        type: "escalate",
        reason: `Elevated heart rate (${Math.round(vitals.pulseBpm)} bpm) alongside reported ${symptoms[0].replace(/_/g, " ")} — clinic review needed for possible dehydration.`,
      };
    }
    if (vitals.breathingRate != null && vitals.breathingRate >= 24) {
      return {
        type: "escalate",
        reason: `Elevated breathing rate (${Math.round(vitals.breathingRate)} br/min) alongside reported ${symptoms[0].replace(/_/g, " ")} — clinic review needed.`,
      };
    }
  }

  // 6. Evidence-based self-care intervention
  for (const symptom of symptoms) {
    const evidence = getEvidenceBasedIntervention(
      symptom,
      input.symptomSeverity,
      context.medication,
      context.currentDose,
    );
    if (evidence) {
      return {
        type: "intervention",
        action: evidence.action,
        evidence: evidence.evidence,
      };
    }
  }

  // 7. Generic fallbacks for symptoms not in the dataset
  const generic = getGenericIntervention(symptoms);
  if (generic) return { type: "intervention", action: generic };

  // 8. Default on-track message
  return { type: "intervention", action: "You're on track. Log again tomorrow." };
}

function getGenericIntervention(symptoms: CareSymptom[]): string | undefined {
  if (symptoms.includes("reflux")) return "Avoid lying down for 2 hours after eating and elevate your head tonight.";
  if (symptoms.includes("dizziness")) return "Sit down, drink water, and do not drive until it passes.";
  if (symptoms.includes("injection_site_reaction")) return "Rotate injection sites and apply a cool compress.";
  return undefined;
}

export function missedDoseCount(adherence: AdherenceStatus): number {
  switch (adherence) {
    case "missed_one_dose":
      return 1;
    case "missed_multiple":
      return 3;
    case "stopped":
    case "not_started":
      return 0;
    case "taken_as_prescribed":
      return 0;
  }
}
