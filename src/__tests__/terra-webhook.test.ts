import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  parseTerraSignatureHeader,
  verifyTerraWebhookSignature,
} from "@/lib/terra/webhook";

const SIGNING_SECRET = "test-secret";

function signBody(body: string, timestamp?: number): string {
  const t = timestamp ?? Math.floor(Date.now() / 1000);
  const signedString = `${t}.${body}`;
  const v1 = createHmac("sha256", SIGNING_SECRET)
    .update(signedString)
    .digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("parseTerraSignatureHeader", () => {
  it("parses a valid header", () => {
    const header = "t=1492774577,v1=abc123";
    const parsed = parseTerraSignatureHeader(header);
    expect(parsed).toEqual({ timestamp: 1492774577, v1: "abc123" });
  });

  it("ignores extra signature schemes", () => {
    const header = "t=1492774577,v1=abc123,v0=def456";
    const parsed = parseTerraSignatureHeader(header);
    expect(parsed?.timestamp).toBe(1492774577);
    expect(parsed?.v1).toBe("abc123");
  });

  it("returns null when t is missing", () => {
    const parsed = parseTerraSignatureHeader("v1=abc123");
    expect(parsed).toBeNull();
  });

  it("returns null when v1 is missing", () => {
    const parsed = parseTerraSignatureHeader("t=1492774577");
    expect(parsed).toBeNull();
  });

  it("returns null for non-numeric timestamp", () => {
    const parsed = parseTerraSignatureHeader("t=abc,v1=123");
    expect(parsed).toBeNull();
  });
});

describe("verifyTerraWebhookSignature", () => {
  it("accepts a valid signature", () => {
    const body = JSON.stringify({ type: "SLEEP", user: { user_id: "u1" } });
    const header = signBody(body);
    expect(verifyTerraWebhookSignature(body, header, SIGNING_SECRET)).toBe(true);
  });

  it("rejects a missing v1 signature", () => {
    const body = JSON.stringify({ type: "SLEEP" });
    expect(verifyTerraWebhookSignature(body, "t=1492774577", SIGNING_SECRET)).toBe(false);
  });

  it("rejects an invalid signature", () => {
    const body = JSON.stringify({ type: "SLEEP" });
    const header = "t=1492774577,v1=0000000000000000000000000000000000000000000000000000000000000000";
    expect(verifyTerraWebhookSignature(body, header, SIGNING_SECRET)).toBe(false);
  });

  it("rejects a signature with a stale timestamp", () => {
    const body = JSON.stringify({ type: "SLEEP" });
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
    const header = signBody(body, oldTimestamp);
    expect(verifyTerraWebhookSignature(body, header, SIGNING_SECRET, 300)).toBe(false);
  });

  it("accepts a signature within the tolerance window", () => {
    const body = JSON.stringify({ type: "SLEEP" });
    const header = signBody(body);
    expect(verifyTerraWebhookSignature(body, header, SIGNING_SECRET, 300)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ type: "SLEEP" });
    const header = signBody(body);
    expect(verifyTerraWebhookSignature(body + "x", header, SIGNING_SECRET)).toBe(false);
  });
});
