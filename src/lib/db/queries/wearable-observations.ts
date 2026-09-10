import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "../client";
import {
  wearableObservations,
  type NewWearableObservation,
} from "../schema";

export async function createWearableObservation(data: NewWearableObservation) {
  const [obs] = await db
    .insert(wearableObservations)
    .values(data)
    .returning();
  return obs;
}

export async function upsertWearableObservation(data: NewWearableObservation) {
  const [obs] = await db
    .insert(wearableObservations)
    .values(data)
    .onConflictDoUpdate({
      target: [
        wearableObservations.userId,
        wearableObservations.source,
        wearableObservations.metricType,
        wearableObservations.recordedDate,
      ],
      set: {
        value: data.value,
        unit: data.unit,
        confidence: data.confidence,
        recordedAt: data.recordedAt,
      },
    })
    .returning();
  return obs;
}

export interface PersonalBaselineOptions {
  userId: string;
  metricType: string;
  recordedAt: Date;
  windowDays?: number;
  minSamples?: number;
}

/**
 * Returns the personal rolling average for a metric using observations from
 * the prior `windowDays` calendar days (excluding the current day). Falls back
 * to null when there are fewer than `minSamples` matching rows.
 */
export async function getPersonalBaseline({
  userId,
  metricType,
  recordedAt,
  windowDays = 28,
  minSamples = 3,
}: PersonalBaselineOptions): Promise<number | null> {
  const startOfDay = new Date(
    recordedAt.getFullYear(),
    recordedAt.getMonth(),
    recordedAt.getDate()
  );
  const cutoff = new Date(startOfDay);
  cutoff.setDate(cutoff.getDate() - windowDays);

  const [row] = await db
    .select({
      avg: sql<string | null>`avg(${wearableObservations.value})`,
      count: sql<number>`count(*)`,
    })
    .from(wearableObservations)
    .where(
      and(
        eq(wearableObservations.userId, userId),
        eq(wearableObservations.metricType, metricType),
        gte(wearableObservations.recordedAt, cutoff),
        lt(wearableObservations.recordedAt, startOfDay)
      )
    );

  if (!row || row.count < minSamples) return null;
  const avg = parseFloat(row.avg ?? "0");
  return Number.isFinite(avg) ? avg : null;
}
