import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import {
  careObservations,
  careInterventions,
  careEscalations,
  carePatients,
  careClinicians,
  type CareObservationRow,
  type CareInterventionRow,
  type CareEscalationRow,
  type CarePatient,
  type CareClinician,
} from "../schema/care";

export async function getCarePatientByUserId(userId: string): Promise<CarePatient | undefined> {
  const rows = await db.select().from(carePatients).where(eq(carePatients.userId, userId)).limit(1);
  return rows[0];
}

export async function getCareObservationsForPatient(
  patientId: string,
  limit = 30,
): Promise<CareObservationRow[]> {
  return db
    .select()
    .from(careObservations)
    .where(eq(careObservations.patientId, patientId))
    .orderBy(desc(careObservations.checkInAt))
    .limit(limit);
}

export async function createCareObservation(
  data: typeof careObservations.$inferInsert,
): Promise<CareObservationRow> {
  const rows = await db.insert(careObservations).values(data).returning();
  return rows[0];
}

export async function createCareIntervention(
  data: typeof careInterventions.$inferInsert,
): Promise<CareInterventionRow> {
  const rows = await db.insert(careInterventions).values(data).returning();
  return rows[0];
}

export async function createCareEscalation(
  data: typeof careEscalations.$inferInsert,
): Promise<CareEscalationRow> {
  const rows = await db.insert(careEscalations).values(data).returning();
  return rows[0];
}

export async function getOpenEscalationsForClinic(
  clinicId: string,
  limit = 50,
): Promise<(CareEscalationRow & { patient: CarePatient })[]> {
  return db
    .select({
      id: careEscalations.id,
      patientId: careEscalations.patientId,
      observationId: careEscalations.observationId,
      reason: careEscalations.reason,
      status: careEscalations.status,
      createdAt: careEscalations.createdAt,
      resolvedAt: careEscalations.resolvedAt,
      patient: carePatients,
    })
    .from(careEscalations)
    .innerJoin(carePatients, eq(carePatients.id, careEscalations.patientId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careEscalations.status, "open")))
    .orderBy(desc(careEscalations.createdAt))
    .limit(limit) as unknown as (CareEscalationRow & { patient: CarePatient })[];
}

export async function getPendingInterventionsForPatient(
  patientId: string,
): Promise<CareInterventionRow[]> {
  return db
    .select()
    .from(careInterventions)
    .where(and(eq(careInterventions.patientId, patientId), eq(careInterventions.status, "pending")))
    .orderBy(desc(careInterventions.dueAt));
}

export async function getOpenEscalationsForPatient(
  patientId: string,
): Promise<CareEscalationRow[]> {
  return db
    .select()
    .from(careEscalations)
    .where(and(eq(careEscalations.patientId, patientId), eq(careEscalations.status, "open")))
    .orderBy(desc(careEscalations.createdAt));
}

export async function getPendingInterventionsForClinic(
  clinicId: string,
  limit = 50,
): Promise<(CareInterventionRow & { patient: CarePatient })[]> {
  return db
    .select({
      id: careInterventions.id,
      patientId: careInterventions.patientId,
      observationId: careInterventions.observationId,
      action: careInterventions.action,
      status: careInterventions.status,
      dueAt: careInterventions.dueAt,
      completedAt: careInterventions.completedAt,
      patient: carePatients,
    })
    .from(careInterventions)
    .innerJoin(carePatients, eq(carePatients.id, careInterventions.patientId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careInterventions.status, "pending")))
    .orderBy(desc(careInterventions.dueAt))
    .limit(limit) as unknown as (CareInterventionRow & { patient: CarePatient })[];
}

export async function getCareInterventionById(id: string): Promise<CareInterventionRow | undefined> {
  const rows = await db.select().from(careInterventions).where(eq(careInterventions.id, id)).limit(1);
  return rows[0];
}

export async function updateCareInterventionStatus(
  id: string,
  status: "completed" | "skipped",
): Promise<CareInterventionRow> {
  const rows = await db
    .update(careInterventions)
    .set({
      status,
      completedAt: status === "completed" || status === "skipped" ? new Date() : null,
    })
    .where(eq(careInterventions.id, id))
    .returning();
  return rows[0];
}

export async function getCareEscalationById(id: string): Promise<CareEscalationRow | undefined> {
  const rows = await db.select().from(careEscalations).where(eq(careEscalations.id, id)).limit(1);
  return rows[0];
}

export async function getCareEscalationWithPatientById(
  id: string,
): Promise<(CareEscalationRow & { patient: CarePatient }) | undefined> {
  const rows = await db
    .select({
      id: careEscalations.id,
      patientId: careEscalations.patientId,
      observationId: careEscalations.observationId,
      reason: careEscalations.reason,
      status: careEscalations.status,
      createdAt: careEscalations.createdAt,
      resolvedAt: careEscalations.resolvedAt,
      patient: carePatients,
    })
    .from(careEscalations)
    .innerJoin(carePatients, eq(carePatients.id, careEscalations.patientId))
    .where(eq(careEscalations.id, id))
    .limit(1);
  return rows[0] as (CareEscalationRow & { patient: CarePatient }) | undefined;
}

export async function updateCareEscalationStatus(
  id: string,
  status: "resolved" | "clinic_reviewed",
): Promise<CareEscalationRow> {
  const rows = await db
    .update(careEscalations)
    .set({ status, resolvedAt: new Date() })
    .where(eq(careEscalations.id, id))
    .returning();
  return rows[0];
}

export async function getCareClinician(
  userId: string,
  clinicId: string,
): Promise<CareClinician | undefined> {
  const rows = await db
    .select()
    .from(careClinicians)
    .where(and(eq(careClinicians.userId, userId), eq(careClinicians.clinicId, clinicId)))
    .limit(1);
  return rows[0];
}
