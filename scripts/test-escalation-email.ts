import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { processCheckIn } from "../src/application/care/check-in";
import { users } from "../src/lib/db/schema/users";
import { carePatients, careObservations, careEscalations } from "../src/lib/db/schema/care";
import { sendEmail } from "../src/lib/email";

// Load .env first for DATABASE_URL, then .env.local for local overrides.
config({ path: ".env" });
config({ path: ".env.local", override: true });

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";
const CARE_EMAIL = process.env.CARE_TEAM_EMAIL;

async function main() {
  if (!CARE_EMAIL) {
    console.error("CARE_TEAM_EMAIL is not set in .env.local");
    process.exit(1);
  }

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  const now = new Date();

  // Reuse or create a test patient user and care record
  const patientEmail = "test-patient@bodydebt.local";
  let [user] = await db.select().from(users).where(eq(users.email, patientEmail)).limit(1);
  if (!user) {
    user = (
      await db
        .insert(users)
        .values({ id: randomUUID(), email: patientEmail, name: "Test Patient", createdAt: now, updatedAt: now })
        .returning()
    )[0];
  }

  let [patient] = await db.select().from(carePatients).where(eq(carePatients.userId, user.id)).limit(1);
  if (!patient) {
    patient = (
      await db
        .insert(carePatients)
        .values({
          id: randomUUID(),
          userId: user.id,
          medication: "Semaglutide",
          currentDose: "2.4mg weekly",
          enrolledAt: now,
          updatedAt: now,
        })
        .returning()
    )[0];
  }

  const result = await processCheckIn(
    {
      patientId: patient.id,
      symptoms: ["vomiting"],
      symptomSeverity: "severe",
      adherence: "taken_as_prescribed",
      weightKg: null,
      fastingGlucose: null,
      notes: "SMTP escalation test",
      medication: patient.medication,
      currentDose: patient.currentDose,
    },
    {
      getPreviousObservations: async () => [],
      saveObservation: async (obs) => {
        const [row] = await db.insert(careObservations).values({
          id: obs.id,
          patientId: obs.patientId,
          checkInAt: obs.checkInAt,
          symptoms: obs.symptoms,
          symptomSeverity: obs.symptomSeverity,
          adherence: obs.adherence,
          weightKg: obs.weightKg,
          fastingGlucose: obs.fastingGlucose,
          notes: obs.notes,
        }).returning();
        return row;
      },
      saveEscalation: async (esc) => {
        const [row] = await db.insert(careEscalations).values({
          id: esc.id,
          patientId: esc.patientId,
          observationId: esc.observationId,
          reason: esc.reason,
          status: esc.status,
          createdAt: esc.createdAt,
          resolvedAt: esc.resolvedAt,
        }).returning();
        return row;
      },
      notifyEscalation: async (escalation) => {
        await sendEmail({
          to: CARE_EMAIL,
          subject: "Care Companion escalation",
          text: `A patient check-in generated an escalation.\n\nReason: ${escalation.reason}\nPatient: ${escalation.patientId}\nEscalation ID: ${escalation.id}`,
        });
      },
    },
  );

  console.log("Check-in result:", result.action);
  console.log("Escalation email sent to:", CARE_EMAIL);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
