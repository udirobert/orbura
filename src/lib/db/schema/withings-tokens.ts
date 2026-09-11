import { bigserial, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Server-side Withings OAuth token storage.
 * Tokens are encrypted at rest by the queries layer; this table stores the
 * ciphertext only.
 */
export const withingsTokens = pgTable("withings_tokens", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  withingsUserId: varchar("withings_user_id", { length: 64 }),
  scope: varchar("scope", { length: 255 }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WithingsToken = typeof withingsTokens.$inferSelect;
export type NewWithingsToken = typeof withingsTokens.$inferInsert;
