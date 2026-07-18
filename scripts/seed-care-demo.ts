import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { users } from "../src/lib/db/schema/users";
import {
  careClinics,
  careClinicians,
  carePatients,
  careObservations,
  careInterventions,
} from "../src/lib/db/schema/care";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";

const CLINIC_NAME = "Body Debt Demo Clinic";
const CLINICIAN_EMAIL = "demo-clinician@bodydebt.local";
const PATIENT_EMAIL = "demo-patient@bodydebt.local";

async function findOrCreateUser(email: string, name: string) {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    console.log(`  User already exists: ${email}`);
    return existing[0].id;
  }
  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`  Created user: ${email} (${id})`);
  return id;
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 1 });
  db = drizzle(sql);

  console.log("Seeding Care Companion demo data...");

  const now = new Date();

  // Clinic
  const existingClinic = await db.select().from(careClinics).where(eq(careClinics.name, CLINIC_NAME)).limit(1);
  let clinicId: string;
  if (existingClinic[0]) {
    clinicId = existingClinic[0].id;
    console.log(`Clinic already exists: ${CLINIC_NAME} (${clinicId})`);
  } else {
    clinicId = randomUUID();
    await db.insert(careClinics).values({ id: clinicId, name: CLINIC_NAME, createdAt: now });
    console.log(`Created clinic: ${CLINIC_NAME} (${clinicId})`);
  }

  // Clinician
  const clinicianUserId = await findOrCreateUser(CLINICIAN_EMAIL, "Demo Clinician");
  const existingClinician = await db
    .select()
    .from(careClinicians)
    .where(eq(careClinicians.userId, clinicianUserId))
    .limit(1);
  if (!existingClinician[0]) {
    await db.insert(careClinicians).values({
      id: randomUUID(),
      userId: clinicianUserId,
      clinicId,
      role: "admin",
      createdAt: now,
    });
    console.log("  Added clinician to clinic");
  }

  // Patient
  const patientUserId = await findOrCreateUser(PATIENT_EMAIL, "Demo Patient");
  const existingPatient = await db
    .select()
    .from(carePatients)
    .where(eq(carePatients.userId, patientUserId))
    .limit(1);
  let patientId: string;
  if (existingPatient[0]) {
    patientId = existingPatient[0].id;
    console.log(`Patient already exists: ${PATIENT_EMAIL} (${patientId})`);
  } else {
    patientId = randomUUID();
    await db.insert(carePatients).values({
      id: patientId,
      userId: patientUserId,
      clinicId,
      medication: "Semaglutide",
      enrolledAt: now,
      updatedAt: now,
    });
    console.log(`Created patient: ${PATIENT_EMAIL} (${patientId})`);
  }

  // Pre-populate a check-in with mild nausea so the dashboards are not empty
  const existingObservations = await db
    .select()
    .from(careObservations)
    .where(eq(careObservations.patientId, patientId))
    .limit(1);

  if (!existingObservations[0]) {
    const observationId = randomUUID();
    await db.insert(careObservations).values({
      id: observationId,
      patientId,
      checkInAt: now,
      symptoms: ["nausea"],
      symptomSeverity: "mild",
      adherence: "taken_as_prescribed",
      weightKg: null,
      fastingGlucose: null,
      notes: null,
    });

    await db.insert(careInterventions).values({
      id: randomUUID(),
      patientId,
      observationId,
      action: "Take with food; slow dose escalation; small meals",
      status: "pending",
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      completedAt: null,
    });

    console.log("  Seeded a mild nausea check-in and pending intervention");
  }

  console.log("\nDemo ready. Sign in as:");
  console.log(`  Clinician: ${CLINICIAN_EMAIL}`);
  console.log(`  Patient:   ${PATIENT_EMAIL}`);
  console.log(`  Clinic ID: ${clinicId}`);
  console.log(`  Clinician dashboard: /care/clinician?clinicId=${clinicId}`);

  await sql.end();
}

let db: ReturnType<typeof drizzle>;

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
