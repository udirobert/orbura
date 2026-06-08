import { describe, it, expect } from "vitest";
import {
  normalizeFieldElement,
  collectFieldElements,
  extractPublicInstances,
} from "@/lib/zk/field-elements";

// ─── normalizeFieldElement ──────────────────────────────────────────────────

describe("normalizeFieldElement", () => {
  describe("hex-prefixed values", () => {
    it("converts 0x-prefixed hex to decimal string", () => {
      expect(normalizeFieldElement("0x2be4")).toBe("11236");
    });

    it("handles 0x0", () => {
      expect(normalizeFieldElement("0x0")).toBe("0");
    });

    it("handles uppercase hex", () => {
      expect(normalizeFieldElement("0xFF")).toBe("255");
    });

    it("handles mixed case hex", () => {
      expect(normalizeFieldElement("0xAbCd")).toBe("43981");
    });

    it("handles large hex values", () => {
      expect(normalizeFieldElement("0x100000000")).toBe("4294967296");
    });
  });

  describe("decimal values", () => {
    it("passes through decimal strings unchanged", () => {
      expect(normalizeFieldElement("11236")).toBe("11236");
    });

    it("handles zero", () => {
      expect(normalizeFieldElement("0")).toBe("0");
    });

    it("handles large decimal strings", () => {
      expect(normalizeFieldElement("99999999999")).toBe("99999999999");
    });
  });

  describe("64-char hex (byte-reversed field elements)", () => {
    it("reverses bytes and converts to decimal", () => {
      // "ab0000...00" (little-endian) reverses to "00...00ab" = 0xab = 171
      // Must contain hex letters (a-f) so it doesn't match the decimal regex first
      const littleEndian = "ab" + "00".repeat(31);
      expect(normalizeFieldElement(littleEndian)).toBe("171");
    });

    it("handles a known EZKL output format", () => {
      // 0x2be4 = 11236, stored as little-endian 32 bytes
      const le = "e42b" + "00".repeat(30);
      expect(normalizeFieldElement(le)).toBe("11236");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading/trailing whitespace", () => {
      expect(normalizeFieldElement("  42  ")).toBe("42");
    });

    it("trims whitespace around hex", () => {
      expect(normalizeFieldElement("  0xff  ")).toBe("255");
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty string", () => {
      expect(normalizeFieldElement("")).toBeNull();
    });

    it("returns null for non-hex alphabetic strings", () => {
      expect(normalizeFieldElement("hello")).toBeNull();
    });

    it("returns null for negative numbers", () => {
      expect(normalizeFieldElement("-42")).toBeNull();
    });

    it("returns null for floating point", () => {
      expect(normalizeFieldElement("3.14")).toBeNull();
    });

    it("returns null for 63-char hex (wrong length for byte-reversal)", () => {
      expect(normalizeFieldElement("a".repeat(63))).toBeNull();
    });

    it("returns null for 65-char hex (wrong length for byte-reversal)", () => {
      expect(normalizeFieldElement("a".repeat(65))).toBeNull();
    });
  });
});

// ─── collectFieldElements ───────────────────────────────────────────────────

describe("collectFieldElements", () => {
  it("flattens nested arrays of numbers", () => {
    expect(collectFieldElements([[1, 2], [3]])).toEqual(["1", "2", "3"]);
  });

  it("collects bigint values", () => {
    expect(collectFieldElements([BigInt(11236)])).toEqual(["11236"]);
  });

  it("collects non-negative integers", () => {
    expect(collectFieldElements([42, 0])).toEqual(["42", "0"]);
  });

  it("normalizes string values", () => {
    expect(collectFieldElements(["0x2be4", "100"])).toEqual(["11236", "100"]);
  });

  it("skips negative numbers", () => {
    expect(collectFieldElements([-1, 42])).toEqual(["42"]);
  });

  it("skips floating point numbers", () => {
    expect(collectFieldElements([3.14, 42])).toEqual(["42"]);
  });

  it("skips non-parseable strings", () => {
    expect(collectFieldElements(["hello", "42"])).toEqual(["42"]);
  });

  it("handles deeply nested arrays", () => {
    expect(collectFieldElements([[[[[42]]]]])).toEqual(["42"]);
  });

  it("returns empty array for null", () => {
    expect(collectFieldElements(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(collectFieldElements(undefined)).toEqual([]);
  });

  it("returns empty array for plain objects", () => {
    expect(collectFieldElements({ a: 1 })).toEqual([]);
  });

  it("handles mixed types in arrays", () => {
    const result = collectFieldElements([42, "0xff", BigInt(10), null, "bad"]);
    expect(result).toEqual(["42", "255", "10"]);
  });
});

// ─── extractPublicInstances ─────────────────────────────────────────────────

describe("extractPublicInstances", () => {
  it("extracts from 'instances' key (EZKL proof format)", () => {
    const proof = { instances: [[11236]] };
    expect(extractPublicInstances(proof)).toEqual(["11236"]);
  });

  it("extracts from 'public_inputs' key", () => {
    const proof = { public_inputs: [42, 100] };
    expect(extractPublicInstances(proof)).toEqual(["42", "100"]);
  });

  it("extracts from 'publicInputs' key", () => {
    const proof = { publicInputs: [7] };
    expect(extractPublicInstances(proof)).toEqual(["7"]);
  });

  it("extracts from 'inputs' key as last resort", () => {
    const proof = { inputs: [99] };
    expect(extractPublicInstances(proof)).toEqual(["99"]);
  });

  it("prefers 'instances' over other keys", () => {
    const proof = {
      instances: [1],
      public_inputs: [2],
      publicInputs: [3],
      inputs: [4],
    };
    expect(extractPublicInstances(proof)).toEqual(["1"]);
  });

  it("falls through to next key when first has empty array", () => {
    const proof = {
      instances: [],
      public_inputs: [42],
    };
    expect(extractPublicInstances(proof)).toEqual(["42"]);
  });

  it("returns undefined for null input", () => {
    expect(extractPublicInstances(null)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(extractPublicInstances(undefined)).toBeUndefined();
  });

  it("returns undefined for non-object input", () => {
    expect(extractPublicInstances("string")).toBeUndefined();
  });

  it("returns undefined when no candidate keys have elements", () => {
    expect(extractPublicInstances({ other: [1] })).toBeUndefined();
  });

  it("returns undefined when all candidate arrays are empty", () => {
    expect(
      extractPublicInstances({
        instances: [],
        public_inputs: [],
        publicInputs: [],
        inputs: [],
      })
    ).toBeUndefined();
  });

  it("normalizes hex string instances", () => {
    const proof = { instances: [["0x2be4"]] };
    expect(extractPublicInstances(proof)).toEqual(["11236"]);
  });

  it("handles the known proof fixture shape: instances = [[11236]]", () => {
    const proof = {
      hex_proof: "0xabc...",
      instances: [[11236]],
      pretty_public_inputs: { stress_score: 0.45 },
    };
    expect(extractPublicInstances(proof)).toEqual(["11236"]);
  });
});
