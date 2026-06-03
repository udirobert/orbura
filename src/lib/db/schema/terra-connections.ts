import { pgTable, varchar, timestamp, bigserial } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

/**
 * Maps a Body Debt user_id → Terra user_id + provider
 * One row per connected wearable per user.
 */
export const terraConnections = pgTable("terra_connections", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),

  // Body Debt user — may be null for guests (identified by session token)
  userId: varchar("user_id", { length: 128 }),

  // Terra-assigned user identifier returned after OAuth
  terraUserId: varchar("terra_user_id", { length: 256 }).notNull().unique(),

  // Provider name as returned by Terra: "GARMIN", "FITBIT", "APPLE", etc.
  provider: varchar("provider", { length: 64 }).notNull(),

  // Opaque reference we passed in when generating the widget session
  // Used to reconcile the callback with the originating session
  referenceId: varchar("reference_id", { length: 256 }),

  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at"),
});

export type TerraConnection = InferSelectModel<typeof terraConnections>;
