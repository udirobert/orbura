import { createHmac, timingSafeEqual } from "node:crypto";

export interface TerraSignatureParts {
  timestamp: number;
  v1: string;
}

/**
 * Parse the Terra `terra-signature` header.
 *
 * Expected format:
 *   t=<unix-seconds>,v1=<hex-signature>[,v0=<legacy-hex-signature>]
 */
export function parseTerraSignatureHeader(header: string): TerraSignatureParts | null {
  const parts = new Map<string, string>();
  for (const segment of header.split(",")) {
    const [key, value] = segment.split("=");
    if (key && value !== undefined) {
      parts.set(key.trim(), value.trim());
    }
  }

  const timestampRaw = parts.get("t");
  const v1 = parts.get("v1");
  if (!timestampRaw || !v1) return null;

  const timestamp = Number.parseInt(timestampRaw, 10);
  if (Number.isNaN(timestamp)) return null;

  return { timestamp, v1 };
}

/**
 * Verify a Terra webhook signature.
 *
 * The signed string is `<timestamp>.<rawBody>` and is signed with
 * HMAC-SHA256 using the configured signing secret.
 *
 * @param rawBody - the raw, unaltered request body as a string
 * @param signatureHeader - the value of the `terra-signature` header
 * @param signingSecret - the Terra signing secret
 * @param toleranceSeconds - how far the timestamp may drift from now (default 300)
 */
export function verifyTerraWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  signingSecret: string,
  toleranceSeconds = 300,
): boolean {
  const parsed = parseTerraSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return false;

  const signedString = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", signingSecret)
    .update(signedString)
    .digest("hex");

  const received = parsed.v1.toLowerCase();
  if (expected.length !== received.length) return false;

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}
