import { pgTable, varchar, timestamp, real, boolean, bigserial, index } from "drizzle-orm/pg-core";

/**
 * zk_credentials — durable record of on-chain-verified wellness proofs.
 *
 * A row is written only after the verify transaction is confirmed
 * (SKALE ACCEPTED / Starknet ACCEPTED_ON_L2). Raw features are never
 * stored — only the sha256 digest of the feature vector, enough for
 * audit correlation without reconstruction. See docs/zk-credentials.md.
 */
export const zkCredentials = pgTable(
  "zk_credentials",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    source: varchar("source", { length: 32 }).notNull(), // "face_scan" | "camera_vitals"
    modelId: varchar("model_id", { length: 64 }).notNull(),
    score: real("score"),
    healthy: boolean("healthy"),
    inputDigest: varchar("input_digest", { length: 80 }), // "sha256:…"
    prover: varchar("prover", { length: 16 }).notNull(), // "ezkl" | "risc0"
    chain: varchar("chain", { length: 16 }).notNull(),   // "skale" | "starknet" | "local"
    txHash: varchar("tx_hash", { length: 80 }),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("zk_credentials_user_idx").on(table.userId, table.createdAt),
  })
);

export type ZkCredential = typeof zkCredentials.$inferSelect;
export type NewZkCredential = typeof zkCredentials.$inferInsert;
