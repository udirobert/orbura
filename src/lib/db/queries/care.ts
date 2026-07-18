import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import {
  careObservations,
  careInterventions,
  careEscalations,
  carePatients,
  careClinicians,
  careClinics,
  type CareObservationRow,
  type CareInterventionRow,
  type CareEscalationRow,
  type CarePatient,
  type CareClinician,
  type CareClinic,
  type NewCareClinic,
  type NewCareClinician,
  type NewCarePatient,
} from "../schema/care";
import { users, type User } from "../schema/users";

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
): Promise<(CareEscalationRow & { patient: CarePatient; userName: string | null; userEmail: string | null })[]> {
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
      userName: users.name,
      userEmail: users.email,
    })
    .from(careEscalations)
    .innerJoin(carePatients, eq(carePatients.id, careEscalations.patientId))
    .innerJoin(users, eq(users.id, carePatients.userId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careEscalations.status, "open")))
    .orderBy(desc(careEscalations.createdAt))
    .limit(limit) as unknown as (CareEscalationRow & { patient: CarePatient; userName: string | null; userEmail: string | null })[];
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
): Promise<(CareInterventionRow & { patient: CarePatient; userName: string | null; userEmail: string | null })[]> {
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
      userName: users.name,
      userEmail: users.email,
    })
    .from(careInterventions)
    .innerJoin(carePatients, eq(carePatients.id, careInterventions.patientId))
    .innerJoin(users, eq(users.id, carePatients.userId))
    .where(and(eq(carePatients.clinicId, clinicId), eq(careInterventions.status, "pending")))
    .orderBy(desc(careInterventions.dueAt))
    .limit(limit) as unknown as (CareInterventionRow & { patient: CarePatient; userName: string | null; userEmail: string | null })[];
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

export async function getClinicsForUser(userId: string): Promise<CareClinic[]> {
  const rows = await db
    .select({
      id: careClinics.id,
      name: careClinics.name,
      createdAt: careClinics.createdAt,
    })
    .from(careClinics)
    .innerJoin(careClinicians, eq(careClinicians.clinicId, careClinics.id))
    .where(eq(careClinicians.userId, userId));
  return rows as CareClinic[];
}

export async function getPatientsForClinic(clinicId: string): Promise<CarePatient[]> {
  return db.select().from(carePatients).where(eq(carePatients.clinicId, clinicId));
}

export async function getCareClinicById(id: string): Promise<CareClinic | undefined> {
  const rows = await db.select().from(careClinics).where(eq(careClinics.id, id)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0];
}

export async function createUser(input: { email: string; name?: string | null }): Promise<User> {
  const now = new Date();
  const [row] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function createCareClinic(name: string): Promise<CareClinic> {
  const [row] = await db
    .insert(careClinics)
    .values({ id: crypto.randomUUID(), name, createdAt: new Date() })
    .returning();
  return row;
}

export async function createCareClinician(input: NewCareClinician): Promise<CareClinician> {
  const [row] = await db.insert(careClinicians).values(input).returning();
  return row;
}

export async function createCarePatient(input: NewCarePatient): Promise<CarePatient> {
  const [row] = await db.insert(carePatients).values(input).returning();
  return row;
}

export async function updateCarePatientClinic(
  patientId: string,
  clinicId: string,
): Promise<CarePatient> {
  const [row] = await db
    .update(carePatients)
    .set({ clinicId, updatedAt: new Date() })
    .where(eq(carePatients.id, patientId))
    .returning();
  return row;
}

export async function updateCarePatient(
  patientId: string,
  input: Partial<Pick<CarePatient, "clinicId" | "medication" | "currentDose">>,
): Promise<CarePatient> {
  const [row] = await db
    .update(carePatients)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(carePatients.id, patientId))
    .returning();
  return row;
}
