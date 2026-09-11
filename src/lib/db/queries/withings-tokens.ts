import { eq } from "drizzle-orm";
import { db } from "../client";
import { withingsTokens, type NewWithingsToken } from "../schema";
import { decrypt, encrypt } from "@/lib/crypto/token-vault";

export interface WithingsTokenRecord {
  userId: string;
  accessToken: string;
  refreshToken: string;
  withingsUserId: string | null;
  scope: string | null;
  expiresAt: Date | null;
}

export async function getWithingsToken(userId: string): Promise<WithingsTokenRecord | null> {
  const rows = await db
    .select()
    .from(withingsTokens)
    .where(eq(withingsTokens.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  return {
    userId: row.userId,
    accessToken: decrypt(row.accessToken),
    refreshToken: decrypt(row.refreshToken),
    withingsUserId: row.withingsUserId ?? null,
    scope: row.scope ?? null,
    expiresAt: row.expiresAt,
  };
}

export async function saveWithingsToken(data: NewWithingsToken): Promise<void> {
  const encrypted: NewWithingsToken = {
    ...data,
    accessToken: encrypt(data.accessToken),
    refreshToken: encrypt(data.refreshToken),
  };

  await db
    .insert(withingsTokens)
    .values(encrypted)
    .onConflictDoUpdate({
      target: withingsTokens.userId,
      set: {
        accessToken: encrypted.accessToken,
        refreshToken: encrypted.refreshToken,
        withingsUserId: encrypted.withingsUserId,
        scope: encrypted.scope,
        expiresAt: encrypted.expiresAt,
        updatedAt: new Date(),
      },
    });
}
