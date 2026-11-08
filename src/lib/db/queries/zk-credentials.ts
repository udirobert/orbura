import { db } from "../client";
import { zkCredentials, type NewZkCredential, type ZkCredential } from "../schema";
import { desc, eq } from "drizzle-orm";

/** Insert a confirmed credential record. Callers must only pass rows whose
 *  on-chain verification already confirmed — see docs/zk-credentials.md. */
export async function createZkCredential(data: NewZkCredential): Promise<ZkCredential> {
  const rows = await db.insert(zkCredentials).values(data).returning();
  return rows[0];
}

export async function getLatestZkCredential(userId: string): Promise<ZkCredential | undefined> {
  const [row] = await db
    .select()
    .from(zkCredentials)
    .where(eq(zkCredentials.userId, userId))
    .orderBy(desc(zkCredentials.createdAt))
    .limit(1);
  return row;
}

export async function getZkCredentialCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: zkCredentials.id })
    .from(zkCredentials)
    .where(eq(zkCredentials.userId, userId));
  return rows.length;
}
