import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processCheckIn } from "@/application/care/check-in";
import type {
  CareObservationInput,
  CareObservation,
  CareIntervention,
  CareEscalation,
  CareAction,
} from "@/domain/care/types";

function makeInput(overrides: Partial<CareObservationInput> = {}): CareObservationInput {
  return {
    patientId: "patient-1",
    symptoms: ["nausea"],
    symptomSeverity: "mild",
    adherence: "taken_as_prescribed",
    weightKg: null,
    fastingGlucose: null,
    notes: null,
    ...overrides,
  };
}

function makeDeps() {
  const observations: CareObservation[] = [];
  const interventions: CareIntervention[] = [];
  const escalations: CareEscalation[] = [];

  return {
    observations,
    interventions,
    escalations,
    getPreviousObservations: vi.fn(async () => observations.map((o) => ({
      symptoms: o.symptoms,
      symptomSeverity: o.symptomSeverity,
      checkInAt: o.checkInAt,
    }))),
    saveObservation: vi.fn(async (obs: CareObservation) => {
      observations.push(obs);
      return obs;
    }),
    saveIntervention: vi.fn(async (intervention: CareIntervention) => {
      interventions.push(intervention);
      return intervention;
    }),
    saveEscalation: vi.fn(async (escalation: CareEscalation) => {
      escalations.push(escalation);
      return escalation;
    }),
    notifyEscalation: vi.fn(async () => undefined),
    explainIntervention: vi.fn(async (_input, action) => `Explained: ${(action as CareAction & { type: "intervention" }).action}`),
  };
}

function getInterventionAction(action: CareAction) {
  expect(action.type).toBe("intervention");
  return action as CareAction & { type: "intervention" };
}

function getEscalateAction(action: CareAction) {
  expect(action.type).toBe("escalate");
  return action as CareAction & { type: "escalate" };
}

describe("processCheckIn", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T06:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an evidence-based intervention for mild nausea", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "mild" }), deps);
    const action = getInterventionAction(result.action);

    expect(action.action).toBe("Take with food; slow dose escalation; small meals");
    expect(action.evidence).toBeDefined();
    expect(result.intervention).toBeDefined();
    expect(result.escalation).toBeUndefined();
    expect(deps.saveObservation).toHaveBeenCalledTimes(1);
    expect(deps.saveIntervention).toHaveBeenCalledTimes(1);
    expect(deps.saveEscalation).not.toHaveBeenCalled();
    expect(deps.notifyEscalation).not.toHaveBeenCalled();
  });

  it("returns an on-track intervention when no symptoms are reported", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["none"], symptomSeverity: "mild" }), deps);
    const action = getInterventionAction(result.action);

    expect(action.action).toBe("You're on track. Log again tomorrow.");
    expect(result.intervention).toBeDefined();
    expect(result.escalation).toBeUndefined();
  });

  it("escalates when a red-flag safety signal is reported", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["jaundice"], symptomSeverity: "moderate" }), deps);
    const action = getEscalateAction(result.action);

    expect(action.reason).toBe("Severe safety signal reported: jaundice.");
    expect(result.escalation).toBeDefined();
    expect(result.intervention).toBeUndefined();
    expect(deps.saveEscalation).toHaveBeenCalledTimes(1);
    expect(deps.notifyEscalation).toHaveBeenCalledTimes(1);
    expect(deps.notifyEscalation).toHaveBeenCalledWith(result.escalation);
  });

  it("escalates when vomiting is reported as severe", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["vomiting"], symptomSeverity: "severe" }), deps);
    const action = getEscalateAction(result.action);

    expect(action.reason).toBe("Severe vomiting reported — clinic review needed.");
    expect(result.escalation).toBeDefined();
    expect(result.intervention).toBeUndefined();
  });

  it("escalates when adherence is stopped or multiple doses are missed", async () => {
    const deps = makeDeps();
    const stopped = await processCheckIn(makeInput({ adherence: "stopped" }), deps);
    const stoppedAction = getEscalateAction(stopped.action);
    expect(stoppedAction.reason).toBe("Multiple missed doses or treatment stopped — clinic follow-up required.");

    const missed = await processCheckIn(makeInput({ adherence: "missed_multiple" }), deps);
    getEscalateAction(missed.action);
  });

  it("escalates when a moderate+ symptom persists for more than 7 days", async () => {
    const deps = makeDeps();
    const eightDaysAgo = new Date("2026-05-26T06:00:00.000Z");
    deps.observations.push({
      id: "obs-1",
      patientId: "patient-1",
      checkInAt: eightDaysAgo,
      symptoms: ["nausea"],
      symptomSeverity: "moderate",
      adherence: "taken_as_prescribed",
      weightKg: null,
      fastingGlucose: null,
      notes: null,
    } as CareObservation);

    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "moderate" }), deps);
    const action = getEscalateAction(result.action);

    expect(action.reason).toBe("nausea has persisted at moderate or severe for more than 7 days.");
  });

  it("returns an evidence-based intervention for moderate nausea", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput({ symptoms: ["nausea"], symptomSeverity: "moderate" }), deps);
    const action = getInterventionAction(result.action);

    expect(action.action).toBe("Take with food; slow dose escalation; small meals");
    expect(action.evidence).toBeDefined();
  });

  it("sets the intervention dueAt to 24 hours after creation", async () => {
    const deps = makeDeps();
    const now = new Date("2026-06-03T06:00:00.000Z");
    const result = await processCheckIn(makeInput(), deps);

    expect(result.intervention).toBeDefined();
    expect(result.intervention!.dueAt.getTime()).toBe(now.getTime() + 24 * 60 * 60 * 1000);
  });

  it("explains the intervention but keeps the raw action in the intervention record", async () => {
    const deps = makeDeps();
    const result = await processCheckIn(makeInput(), deps);
    const action = getInterventionAction(result.action);

    expect(action.explanation).toBe("Explained: Take with food; slow dose escalation; small meals");
    expect(result.intervention!.action).toBe("Take with food; slow dose escalation; small meals");
    expect(deps.explainIntervention).toHaveBeenCalledTimes(1);
  });
});
