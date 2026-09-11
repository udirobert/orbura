import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SEPARATOR = ":";
const SALT = "orbura-token-vault-salt-v1";

function getKey(): Buffer {
  const secret = process.env.WITHINGS_TOKEN_SECRET ?? process.env.AUTH_SECRET ?? "";
  if (!secret) {
    throw new Error("WITHINGS_TOKEN_SECRET or AUTH_SECRET must be set to encrypt tokens");
  }
  return scryptSync(secret, SALT, 32);
}

/**
 * Encrypt a plaintext token using AES-256-GCM. Returns a compact string that
 * includes the IV, auth tag, and ciphertext.
 */
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}${SEPARATOR}${tag.toString("base64")}${SEPARATOR}${encrypted.toString("base64")}`;
}

/**
 * Decrypt a token produced by `encrypt`. Throws if the secret has changed or
 * the blob is tampered with.
 */
export function decrypt(blob: string): string {
  const key = getKey();
  const parts = blob.split(SEPARATOR);
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const [ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
