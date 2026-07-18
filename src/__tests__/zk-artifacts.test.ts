import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const ezklDir = resolve(root, "public", "ezkl");

// ─── VK Digest ──────────────────────────────────────────────────────────────

describe("vk-digest.json", () => {
  const digestPath = resolve(ezklDir, "vk-digest.json");

  it("exists on disk", () => {
    expect(existsSync(digestPath)).toBe(true);
  });

  it("is valid JSON", () => {
    const raw = readFileSync(digestPath, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("has the expected shape", () => {
    const digest = JSON.parse(readFileSync(digestPath, "utf8"));
    expect(digest).toHaveProperty("digest");
    expect(digest).toHaveProperty("chunks");
    expect(digest).toHaveProperty("sourceBytes");
    expect(digest).toHaveProperty("source");
  });

  it("digest is a 0x-prefixed 32-byte keccak hash", () => {
    const { digest } = JSON.parse(readFileSync(digestPath, "utf8"));
    expect(digest).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("chunks count matches the registered 157-entry VKA", () => {
    const { chunks } = JSON.parse(readFileSync(digestPath, "utf8"));
    expect(chunks).toBe(157);
  });

  it("sourceBytes equals 8 + chunks * 32 (VKA header + entries)", () => {
    const { chunks, sourceBytes } = JSON.parse(readFileSync(digestPath, "utf8"));
    expect(sourceBytes).toBe(8 + chunks * 32);
  });

  it("source is vka.bytes", () => {
    const { source } = JSON.parse(readFileSync(digestPath, "utf8"));
    expect(source).toBe("vka.bytes");
  });
});

// ─── VK Chunks ──────────────────────────────────────────────────────────────

describe("vk-chunks.json", () => {
  const chunksPath = resolve(ezklDir, "vk-chunks.json");

  it("exists on disk", () => {
    expect(existsSync(chunksPath)).toBe(true);
  });

  it("is valid JSON", () => {
    const raw = readFileSync(chunksPath, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("is a non-empty array", () => {
    const chunks = JSON.parse(readFileSync(chunksPath, "utf8"));
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("chunk count matches vk-digest.json", () => {
    const chunks = JSON.parse(readFileSync(chunksPath, "utf8"));
    const digest = JSON.parse(readFileSync(resolve(ezklDir, "vk-digest.json"), "utf8"));
    expect(chunks.length).toBe(digest.chunks);
  });

  it("every chunk is a 0x-prefixed 32-byte hex string", () => {
    const chunks = JSON.parse(readFileSync(chunksPath, "utf8"));
    for (const chunk of chunks) {
      expect(chunk).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  it("keccak256 of concatenated chunks matches the digest", async () => {
    const { keccak256 } = await import("viem");
    const chunks: string[] = JSON.parse(readFileSync(chunksPath, "utf8"));
    const digest = JSON.parse(readFileSync(resolve(ezklDir, "vk-digest.json"), "utf8"));

    const concatenated = `0x${chunks.map((c) => c.slice(2)).join("")}` as `0x${string}`;
    const computed = keccak256(concatenated);
    expect(computed).toBe(digest.digest);
  });
});

// ─── Compiled circuit ───────────────────────────────────────────────────────

describe("compiled.ezkl", () => {
  const compiledPath = resolve(ezklDir, "compiled.ezkl");

  it("exists on disk", () => {
    expect(existsSync(compiledPath)).toBe(true);
  });

  it("is non-empty", () => {
    const stat = readFileSync(compiledPath);
    expect(stat.length).toBeGreaterThan(0);
  });
});
