import { describe, it, expect, beforeAll } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto/token-vault";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-thirtytwo-chars-long-123";
});

describe("token-vault", () => {
  it("round-trips a token", () => {
    const token = "withings_refresh_token_abc123";
    const encrypted = encrypt(token);
    expect(encrypted).not.toBe(token);
    expect(decrypt(encrypted)).toBe(token);
  });

  it("throws on a tampered blob", () => {
    const encrypted = encrypt("secret");
    const tampered = encrypted.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on an invalid format", () => {
    expect(() => decrypt("not-a-token")).toThrow();
  });
});
