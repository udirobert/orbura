import {
  bigserial,
  date,
  index,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Canonical longitudinal observation store for wearable/file-derived metrics.
 * One row per user, source, metric, and calendar day. Stored values are daily
 * aggregates (e.g., nightly HRV average, resting HR, sleep-stage minutes) so
 * personal baselines can be computed without parsing raw time-series on every
 * request.
 */
export const wearableObservations = pgTable(
  "wearable_observations",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    metricType: varchar("metric_type", { length: 64 }).notNull(),
    recordedAt: timestamp("recorded_at").notNull(),
    recordedDate: date("recorded_date", { mode: "date" }).notNull(),
    value: real("value").notNull(),
    unit: varchar("unit", { length: 32 }),
    confidence: varchar("confidence", { length: 16 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userSourceMetricDateIdx: uniqueIndex(
      "wearable_observations_user_source_metric_date_idx"
    ).on(table.userId, table.source, table.metricType, table.recordedDate),
    userMetricRecordedIdx: index(
      "wearable_observations_user_metric_recorded_idx"
    ).on(table.userId, table.metricType, table.recordedAt),
  })
);

export type WearableObservation = typeof wearableObservations.$inferSelect;
export type NewWearableObservation = typeof wearableObservations.$inferInsert;
