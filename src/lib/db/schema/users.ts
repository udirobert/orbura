import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    email: varchar("email", { length: 256 }).unique(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    /** Auth.js-compatible image/avatar URL. */
    image: text("image"),
    emailVerified: timestamp("email_verified"),
    /** Guest anonymousId that was used as Supermemory containerTag before
     *  sign-in. Set on first authentication to bridge guest → user memory. */
    anonymousId: varchar("anonymous_id", { length: 128 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    anonymousIdIdx: uniqueIndex("users_anonymous_id_idx").on(table.anonymousId),
  })
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
