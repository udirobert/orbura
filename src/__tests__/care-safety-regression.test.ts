import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { evaluateObservation } from "@/domain/care/safety";
import { processCheckIn, type CheckInDependencies } from "@/application/care/check-in";
import type {
  CareObservationInput,
  CareObservation,
  CareEscalation,
  CareIntervention,
  CareAction,
} from "@/domain/care/types";

function makeInput(overrides: Partial<CareObservationInput> = {}): CareObservationInput {
  return {
    patientId: "patient-safety-reg",
    symptoms: ["none"],
    symptomSeverity: "mild",
    adherence: "taken_as_prescribed",
    weightKg: 82.5,
    fastingGlucose: null,
    fastingGlucoseUnit: null,
    notes: null,
    medication: "Semaglutide",
    currentDose: "0.25mg",
    ...overrides,
  };
}

function makeMockDeps(initialEscalations: CareEscalation[] = []): CheckInDependencies & {
  observations: CareObservation[];
  interventions: CareIntervention[];
  escalations: CareEscalation[];
  notified: Array<{ escalation: CareEscalation; observation: CareObservation }>;
} {
  const observations: CareObservation[] = [];
  const interventions: CareIntervention[] = [];
  const escalations: CareEscalation[] = [...initialEscalations];
  const notified: Array<{ escalation: CareEscalation; observation: CareObservation }> = [];

  return {
    observations,
    interventions,
    escalations,
    notified,
    getPreviousObservations: vi.fn(async () =>
      observations.map((o) => ({
        symptoms: o.symptoms,
        symptomSeverity: o.symptomSeverity,
        checkInAt: o.checkInAt,
      }))
    ),
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
    getOpenEscalations: vi.fn(async () =>
      escalations.filter((e) => e.status === "open")
    ),
    notifyEscalation: vi.fn(async (escalation, observation) => {
      notified.push({ escalation, observation });
    }),
    explainIntervention: vi.fn(async (_input, action) =>
      `Explained: ${(action as CareAction & { type: "intervention" }).action}`
    ),
  };
}

function getEscalate(action: CareAction) {
  expect(action.type).toBe("escalate");
  return action as Extract<CareAction, { type: "escalate" }>;
}

describe("Care Safety & Escalation Regression Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. Red-Flag Symptoms (Hard Safety Signals)", () => {
    const RED_FLAGS = [
      ["jaundice", "jaundice"],
      ["allergic_reaction", "allergic reaction"],
      ["hypoglycaemia_symptoms", "hypoglycaemia symptoms"],
      ["fever", "fever"],
    ] as const;

    RED_FLAGS.forEach(([symptom, label]) => {
      it(`escalates for ${symptom} regardless of mild severity`, async () => {
        const action = evaluateObservation(
          makeInput({ symptoms: [symptom], symptomSeverity: "mild" }),
          []
        );
        expect(action.type).toBe("escalate");
        expect(getEscalate(action).reason).toContain(label);
      });
    });
  });

  describe("2. Acute Severe Symptoms (Pancreatitis / Gallbladder flags)", () => {
    it("escalates immediately when vomiting is marked severe", () => {
      const action = evaluateObservation(
        makeInput({ symptoms: ["vomiting"], symptomSeverity: "severe" }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Severe vomiting reported");
    });

    it("escalates immediately when abdominal_pain is marked severe", () => {
      const action = evaluateObservation(
        makeInput({ symptoms: ["abdominal_pain"], symptomSeverity: "severe" }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Severe abdominal pain reported");
    });

    it("does NOT escalate when vomiting is mild/moderate without vital distress", () => {
      const action = evaluateObservation(
        makeInput({ symptoms: ["vomiting"], symptomSeverity: "moderate" }),
        []
      );
      expect(action.type).toBe("intervention");
    });
  });

  describe("3. Vital-Distress Escalation Thresholds (SmartSpectra Camera Integration)", () => {
    it("escalates when pulse is exactly 100 bpm (threshold boundary) with nausea", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["nausea"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 16, pulseBpm: 100 },
        }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Elevated heart rate (100 bpm)");
    });

    it("escalates when pulse is 125 bpm (tachycardia) with vomiting", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["vomiting"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 14, pulseBpm: 125 },
        }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Elevated heart rate (125 bpm)");
    });

    it("does NOT escalate when pulse is 99 bpm (below tachycardia boundary) with mild nausea", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["nausea"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 16, pulseBpm: 99 },
        }),
        []
      );
      expect(action.type).toBe("intervention");
    });

    it("escalates when breathing rate is exactly 24 br/min (tachypnea boundary) with dizziness", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["dizziness"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 24, pulseBpm: 72 },
        }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Elevated breathing rate (24 br/min)");
    });

    it("escalates when breathing rate is 28 br/min (tachypneic distress) with nausea", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["nausea"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 28, pulseBpm: 80 },
        }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Elevated breathing rate (28 br/min)");
    });

    it("does NOT escalate when breathing rate is 23 br/min with mild nausea", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["nausea"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 23, pulseBpm: 75 },
        }),
        []
      );
      expect(action.type).toBe("intervention");
    });

    it("does NOT escalate when vitals are elevated but patient reports 'none' for symptoms", () => {
      const action = evaluateObservation(
        makeInput({
          symptoms: ["none"],
          symptomSeverity: "mild",
          vitals: { breathingRate: 26, pulseBpm: 110 },
        }),
        []
      );
      // Vital load without symptoms does not trigger acute care escalation
      expect(action.type).toBe("intervention");
    });
  });

  describe("4. Longitudinal Persistence & Adherence Disengagement", () => {
    it("escalates when multiple doses are missed", () => {
      const action = evaluateObservation(
        makeInput({ adherence: "missed_multiple" }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("Multiple missed doses");
    });

    it("escalates when treatment is stopped", () => {
      const action = evaluateObservation(
        makeInput({ adherence: "stopped" }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("treatment stopped");
    });

    it("keeps the red-flag reason when disengagement coincides with a safety signal", () => {
      const action = evaluateObservation(
        makeInput({ symptoms: ["jaundice"], adherence: "missed_multiple" }),
        []
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("safety signal");
    });

    it("escalates when moderate nausea persists for more than 7 days", () => {
      const previous = [
        {
          symptoms: ["nausea" as const],
          symptomSeverity: "moderate" as const,
          checkInAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        },
      ];
      const action = evaluateObservation(
        makeInput({ symptoms: ["nausea"], symptomSeverity: "moderate" }),
        previous
      );
      expect(action.type).toBe("escalate");
      expect(getEscalate(action).reason).toContain("persisted at moderate or severe for more than 7 days");
    });
  });

  describe("5. Escalation Deduplication & Queue Protection", () => {
    it("creates an escalation and notifies clinic when no existing escalation is open", async () => {
      const deps = makeMockDeps([]);
      const input = makeInput({
        symptoms: ["nausea"],
        vitals: { breathingRate: 15, pulseBpm: 105 },
      });

      const result = await processCheckIn(input, deps);
      expect(result.action.type).toBe("escalate");
      expect(deps.escalations).toHaveLength(1);
      expect(deps.notified).toHaveLength(1);
      expect(result.escalation?.id).toBe(deps.escalations[0].id);
    });

    it("deduplicates and does NOT spawn a new escalation if a matching one is already open", async () => {
      const existingOpen: CareEscalation = {
        id: "esc-existing-open",
        patientId: "patient-safety-reg",
        observationId: "obs-prev-1",
        reason: "Elevated heart rate (102 bpm) alongside reported nausea — clinic review needed for possible dehydration.",
        status: "open",
        createdAt: new Date(Date.now() - 3600000),
        resolvedAt: null,
      };

      const deps = makeMockDeps([existingOpen]);
      const input = makeInput({
        symptoms: ["nausea"],
        vitals: { breathingRate: 15, pulseBpm: 108 },
      });

      const result = await processCheckIn(input, deps);
      expect(result.action.type).toBe("escalate");
      // Does not insert new record
      expect(deps.saveEscalation).not.toHaveBeenCalled();
      // Returns existing open escalation for context
      expect(result.escalation?.id).toBe("esc-existing-open");
      // Does not spam care team with duplicate alerts
      expect(deps.notifyEscalation).not.toHaveBeenCalled();
      expect(deps.notified).toHaveLength(0);
    });

    it("creates a new escalation if previous matching escalation was already resolved", async () => {
      const existingResolved: CareEscalation = {
        id: "esc-past-resolved",
        patientId: "patient-safety-reg",
        observationId: "obs-prev-0",
        reason: "Elevated heart rate (105 bpm) alongside reported nausea — clinic review needed for possible dehydration.",
        status: "resolved",
        createdAt: new Date(Date.now() - 86400000),
        resolvedAt: new Date(Date.now() - 3600000),
      };

      const deps = makeMockDeps([existingResolved]);
      const input = makeInput({
        symptoms: ["nausea"],
        vitals: { breathingRate: 15, pulseBpm: 104 },
      });

      const result = await processCheckIn(input, deps);
      expect(result.action.type).toBe("escalate");
      expect(deps.saveEscalation).toHaveBeenCalledTimes(1);
      expect(deps.escalations).toHaveLength(2);
      expect(deps.notified).toHaveLength(1);
      expect(result.escalation?.id).not.toBe("esc-past-resolved");
    });
  });
});
