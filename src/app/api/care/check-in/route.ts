import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { notifications } from "@/lib/sdk/eazo-server";
import { ai } from "@/lib/sdk/eazo-client";
import { sendEmail } from "@/lib/email";
import { processCheckIn } from "@/application/care/check-in";
import { careObservations, careInterventions, careEscalations, carePatients } from "@/lib/db/schema/care";
import { db } from "@/lib/db/client";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { CareObservation, CareIntervention, CareEscalation, CareObservationInput } from "@/domain/care/types";

export const maxDuration = 30;

/**
 * POST /api/care/check-in
 *
 * Accepts a GLP-1 patient check-in, runs deterministic safety rules,
 * persists the observation, and returns either the next allowed
 * intervention or an escalation to the clinic.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as {
    symptoms: string[];
    symptomSeverity: "mild" | "moderate" | "severe";
    adherence: string;
    weightKg?: number | null;
    fastingGlucose?: number | null;
    notes?: string | null;
  };

  if (!Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return NextResponse.json({ error: "symptoms are required" }, { status: 400 });
  }
  if (!["mild", "moderate", "severe"].includes(body.symptomSeverity)) {
    return NextResponse.json({ error: "invalid symptomSeverity" }, { status: 400 });
  }
  if (!body.adherence) {
    return NextResponse.json({ error: "adherence is required" }, { status: 400 });
  }

  // Find or create the care patient for this user.
  let [patient] = await db.select().from(carePatients).where(eq(carePatients.userId, auth.user.id)).limit(1);
  if (!patient) {
    const [created] = await db
      .insert(carePatients)
      .values({
        id: randomUUID(),
        userId: auth.user.id,
        enrolledAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    patient = created;
  }

  const input: CareObservationInput = {
    patientId: patient.id,
    symptoms: body.symptoms as CareObservationInput["symptoms"],
    symptomSeverity: body.symptomSeverity,
    adherence: body.adherence as CareObservationInput["adherence"],
    weightKg: body.weightKg ?? null,
    fastingGlucose: body.fastingGlucose ?? null,
    notes: body.notes ?? null,
  };

  const result = await processCheckIn(input, {
    getPreviousObservations: async (patientId) => {
      return db
        .select({
          symptoms: careObservations.symptoms,
          symptomSeverity: careObservations.symptomSeverity,
          checkInAt: careObservations.checkInAt,
        })
        .from(careObservations)
        .where(eq(careObservations.patientId, patientId))
        .orderBy(desc(careObservations.checkInAt));
    },
    saveObservation: async (obs) => {
      const [row] = await db
        .insert(careObservations)
        .values({
          id: obs.id,
          patientId: obs.patientId,
          checkInAt: obs.checkInAt,
          symptoms: obs.symptoms,
          symptomSeverity: obs.symptomSeverity,
          adherence: obs.adherence,
          weightKg: obs.weightKg,
          fastingGlucose: obs.fastingGlucose,
          notes: obs.notes,
        })
        .returning();
      return row as CareObservation;
    },
    saveIntervention: async (intervention) => {
      const [row] = await db.insert(careInterventions).values(intervention).returning();
      return row as CareIntervention;
    },
    saveEscalation: async (escalation) => {
      const [row] = await db.insert(careEscalations).values(escalation).returning();
      return row as CareEscalation;
    },
    notifyEscalation: async (escalation) => {
      const careTeamEmail = process.env.CARE_TEAM_EMAIL;
      if (careTeamEmail) {
        try {
          await sendEmail({
            to: careTeamEmail,
            subject: "Care Companion escalation",
            text: `A patient check-in generated an escalation.\n\nReason: ${escalation.reason}\nPatient: ${escalation.patientId}\nEscalation ID: ${escalation.id}`,
          });
        } catch (err) {
          console.error("[care/escalation] email failed", err);
        }
        return;
      }

      if (notifications.available) {
        try {
          await notifications.publish({
            title: "Care escalation",
            body: escalation.reason,
            data: { escalationId: escalation.id, patientId: escalation.patientId },
            audience: "care-team",
          });
        } catch {
          // Never block check-in on notification failure.
        }
      } else {
        console.log("[care/escalation] notification suppressed (no CARE_TEAM_EMAIL or push config)", escalation.id);
      }
    },
    explainIntervention: async (_input, action) => {
      const prompt = `Rephrase the following care instruction in a warm, patient-friendly way. Do not add new medical advice, do not change the meaning, and keep it under 30 words.\n\nInstruction: ${action.action}`;
      try {
        const response = await ai.chat({
          model: "anthropic.claude-3-5-haiku",
          messages: [{ role: "user", content: prompt }],
        });
        const content = response.choices[0]?.message?.content?.trim();
        return content || action.action;
      } catch {
        return action.action;
      }
    },
  });

  return NextResponse.json({
    ok: true,
    observation: result.observation,
    action: result.action,
    intervention: result.intervention,
    escalation: result.escalation,
  });
}
