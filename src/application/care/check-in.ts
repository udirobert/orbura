import { evaluateObservation } from "@/domain/care/safety";
import type {
  CareObservationInput,
  CareObservation,
  CheckInResult,
  CareIntervention,
  CareEscalation,
  CareAction,
} from "@/domain/care/types";
import { randomUUID } from "node:crypto";

function newId(): string {
  return randomUUID();
}

function inputToObservation(input: CareObservationInput): CareObservation {
  return {
    id: newId(),
    patientId: input.patientId,
    checkInAt: new Date(),
    symptoms: input.symptoms,
    symptomSeverity: input.symptomSeverity,
    adherence: input.adherence,
    weightKg: input.weightKg ?? null,
    fastingGlucose: input.fastingGlucose ?? null,
    fastingGlucoseUnit: input.fastingGlucoseUnit ?? null,
    notes: input.notes ?? null,
  };
}

export interface CheckInDependencies {
  getPreviousObservations: (
    patientId: string,
  ) => Promise<Pick<CareObservation, "symptoms" | "symptomSeverity" | "checkInAt">[]>;
  saveObservation: (obs: CareObservation) => Promise<CareObservation>;
  saveIntervention?: (intervention: CareIntervention) => Promise<CareIntervention>;
  saveEscalation?: (escalation: CareEscalation) => Promise<CareEscalation>;
  notifyEscalation?: (
    escalation: CareEscalation,
    observation: CareObservation,
  ) => Promise<void>;
  explainIntervention?: (
    input: CareObservationInput,
    action: Extract<CareAction, { type: "intervention" }>,
  ) => Promise<string>;
}

/**
 * Process a patient check-in.
 *
 * 1. Run deterministic safety rules.
 * 2. Persist the observation.
 * 3. Persist an intervention or escalation based on the rule result.
 * 4. Return the action so the UI can show the next step.
 */
export async function processCheckIn(
  input: CareObservationInput,
  deps: CheckInDependencies,
): Promise<CheckInResult> {
  const previous = await deps.getPreviousObservations(input.patientId);
  const observation = await deps.saveObservation(inputToObservation(input));
  let action = evaluateObservation(input, previous, {
    medication: input.medication ?? undefined,
    currentDose: input.currentDose ?? undefined,
  });

  if (action.type === "intervention" && deps.explainIntervention) {
    try {
      const explanation = await deps.explainIntervention(input, action);
      action = { ...action, explanation };
    } catch {
      // Fall back to the deterministic action text if explanation fails.
    }
  }

  const result: CheckInResult = { observation, action };

  if (action.type === "escalate") {
    const escalation: CareEscalation = {
      id: newId(),
      patientId: observation.patientId,
      observationId: observation.id,
      reason: action.reason,
      status: "open",
      createdAt: new Date(),
      resolvedAt: null,
    };
    result.escalation = deps.saveEscalation ? await deps.saveEscalation(escalation) : escalation;
    if (deps.notifyEscalation) {
      deps.notifyEscalation(result.escalation, observation).catch(() => undefined);
    }
  } else {
    const intervention: CareIntervention = {
      id: newId(),
      patientId: observation.patientId,
      observationId: observation.id,
      action: action.action,
      status: "pending",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: null,
    };
    result.intervention = deps.saveIntervention ? await deps.saveIntervention(intervention) : intervention;
  }

  return result;
}
