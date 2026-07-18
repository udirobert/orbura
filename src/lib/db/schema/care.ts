import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const careSymptomEnum = pgEnum("care_symptom", [
  "nausea",
  "vomiting",
  "diarrhoea",
  "constipation",
  "abdominal_pain",
  "reflux",
  "headache",
  "fatigue",
  "dizziness",
  "hypoglycaemia_symptoms",
  "injection_site_reaction",
  "fever",
  "jaundice",
  "allergic_reaction",
  "none",
]);

export const careSeverityEnum = pgEnum("care_severity", ["mild", "moderate", "severe"]);

export const careAdherenceEnum = pgEnum("care_adherence", [
  "taken_as_prescribed",
  "missed_one_dose",
  "missed_multiple",
  "stopped",
  "not_started",
]);

export const careInterventionStatusEnum = pgEnum("care_intervention_status", [
  "pending",
  "completed",
  "skipped",
]);

export const careEscalationStatusEnum = pgEnum("care_escalation_status", [
  "open",
  "resolved",
  "clinic_reviewed",
]);

export const careClinicianRoleEnum = pgEnum("care_clinician_role", ["clinician", "admin"]);

export const careClinics = pgTable("care_clinics", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const carePatients = pgTable("care_patients", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  clinicId: varchar("clinic_id", { length: 128 }),
  medication: text("medication"),
  currentDoseMg: integer("current_dose_mg"),
  startedAt: timestamp("started_at"),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const careObservations = pgTable("care_observations", {
  id: varchar("id", { length: 128 }).primaryKey(),
  patientId: varchar("patient_id", { length: 128 }).notNull(),
  checkInAt: timestamp("check_in_at").notNull().defaultNow(),
  symptoms: careSymptomEnum("symptoms").array().notNull(),
  symptomSeverity: careSeverityEnum("symptom_severity").notNull(),
  adherence: careAdherenceEnum("adherence").notNull(),
  weightKg: integer("weight_kg"),
  fastingGlucose: integer("fasting_glucose"),
  notes: text("notes"),
});

export const careInterventions = pgTable("care_interventions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  patientId: varchar("patient_id", { length: 128 }).notNull(),
  observationId: varchar("observation_id", { length: 128 }),
  action: text("action").notNull(),
  status: careInterventionStatusEnum("status").notNull().default("pending"),
  dueAt: timestamp("due_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const careEscalations = pgTable("care_escalations", {
  id: varchar("id", { length: 128 }).primaryKey(),
  patientId: varchar("patient_id", { length: 128 }).notNull(),
  observationId: varchar("observation_id", { length: 128 }),
  reason: text("reason").notNull(),
  status: careEscalationStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const careClinicians = pgTable("care_clinicians", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  clinicId: varchar("clinic_id", { length: 128 }).notNull(),
  role: careClinicianRoleEnum("role").notNull().default("clinician"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CarePatient = InferSelectModel<typeof carePatients>;
export type NewCarePatient = InferInsertModel<typeof carePatients>;
export type CareObservationRow = InferSelectModel<typeof careObservations>;
export type NewCareObservation = InferInsertModel<typeof careObservations>;
export type CareInterventionRow = InferSelectModel<typeof careInterventions>;
export type NewCareIntervention = InferInsertModel<typeof careInterventions>;
export type CareEscalationRow = InferSelectModel<typeof careEscalations>;
export type NewCareEscalation = InferInsertModel<typeof careEscalations>;
export type CareClinician = InferSelectModel<typeof careClinicians>;
export type NewCareClinician = InferInsertModel<typeof careClinicians>;
export type CareClinic = InferSelectModel<typeof careClinics>;
export type NewCareClinic = InferInsertModel<typeof careClinics>;
