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
): CareAction {
  const symptoms = input.symptoms.filter((s): s is TrackableSymptom => s !== "none");

  // 1. No symptoms reported
  if (symptoms.length === 0) {
    return { type: "intervention", action: "You're on track. Log again tomorrow." };
  }

  // 2. Hard safety signals — always escalate
  for (const redFlag of RED_FLAG_SYMPTOMS) {
    if (symptoms.includes(redFlag)) {
      return {
        type: "escalate",
        reason: `Severe safety signal reported: ${redFlag.replace(/_/g, " ")}.`,
      };
    }
  }

  // 3. Severe vomiting or abdominal pain — possible pancreatitis / gallbladder
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

  // 4. Persistent moderate+ symptom > 7 days
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

  // 5. Adherence / disengagement
  if (input.adherence === "missed_multiple" || input.adherence === "stopped") {
    return {
      type: "escalate",
      reason: "Multiple missed doses or treatment stopped — clinic follow-up required.",
    };
  }

  // 6. Evidence-based self-care intervention
  for (const symptom of symptoms) {
    const evidence = getEvidenceBasedIntervention(symptom, input.symptomSeverity);
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
