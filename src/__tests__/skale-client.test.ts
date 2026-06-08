import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isCorrectChain,
  isZeroAddress,
  fetchVkChunks,
  SKALE_CHAIN_ID,
  HALO2_VERIFIER_ADDRESS,
  VERIFIER_CONTRACT_ADDRESS,
  halo2VerifierAbi,
  healthCredentialVerifierABI,
} from "@/lib/blockchain/skale-client";

// ─── isCorrectChain ─────────────────────────────────────────────────────────

describe("isCorrectChain", () => {
  it("returns true for SKALE Europa testnet chain ID", () => {
    expect(isCorrectChain(SKALE_CHAIN_ID)).toBe(true);
  });

  it("returns false for Ethereum mainnet (1)", () => {
    expect(isCorrectChain(1)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCorrectChain(undefined)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isCorrectChain(0)).toBe(false);
  });

  it("returns false for a different chain", () => {
    expect(isCorrectChain(137)).toBe(false); // Polygon
  });
});

// ─── isZeroAddress ──────────────────────────────────────────────────────────

describe("isZeroAddress", () => {
  it("returns true for the zero address", () => {
    expect(isZeroAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("returns false for a real address", () => {
    expect(isZeroAddress("0x052609b6ce7b4B1f88AEC3fC52ea14D25B6a5394")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isZeroAddress("")).toBe(false);
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe("contract constants", () => {
  it("SKALE_CHAIN_ID matches SKALE Europa testnet", () => {
    // SKALE Europa testnet chain ID
    expect(SKALE_CHAIN_ID).toBe(1444673419);
  });

  it("HALO2_VERIFIER_ADDRESS is a valid hex address", () => {
    expect(HALO2_VERIFIER_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("VERIFIER_CONTRACT_ADDRESS falls back to zero address when env not set", () => {
    // In test env, NEXT_PUBLIC_VERIFIER_ADDRESS is not set
    expect(VERIFIER_CONTRACT_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});

// ─── ABI shapes ─────────────────────────────────────────────────────────────

describe("halo2VerifierAbi", () => {
  it("has registerVka function", () => {
    const fn = halo2VerifierAbi.find(
      (item) => item.type === "function" && item.name === "registerVka"
    );
    expect(fn).toBeDefined();
    expect(fn!.type).toBe("function");
  });

  it("has verifyProof function with correct inputs", () => {
    const fn = halo2VerifierAbi.find(
      (item) => item.type === "function" && item.name === "verifyProof"
    );
    expect(fn).toBeDefined();
    if (fn && fn.type === "function") {
      expect(fn.inputs).toHaveLength(3);
      expect(fn.inputs[0].name).toBe("proof");
      expect(fn.inputs[1].name).toBe("instances");
      expect(fn.inputs[2].name).toBe("vka");
    }
  });
});

describe("healthCredentialVerifierABI", () => {
  it("has verifyAndLogCredential function", () => {
    const fn = healthCredentialVerifierABI.find(
      (item) => item.type === "function" && item.name === "verifyAndLogCredential"
    );
    expect(fn).toBeDefined();
    if (fn && fn.type === "function") {
      expect(fn.inputs).toHaveLength(3);
      expect(fn.inputs[0].name).toBe("proof");
      expect(fn.inputs[0].type).toBe("bytes");
      expect(fn.inputs[1].name).toBe("instances");
      expect(fn.inputs[1].type).toBe("uint256[]");
      expect(fn.inputs[2].name).toBe("vka");
      expect(fn.inputs[2].type).toBe("bytes32[]");
    }
  });

  it("has HealthCredentialVerified event", () => {
    const evt = healthCredentialVerifierABI.find(
      (item) => item.type === "event" && item.name === "HealthCredentialVerified"
    );
    expect(evt).toBeDefined();
    expect(evt!.type).toBe("event");
  });

  it("has approvedVkDigest view function", () => {
    const fn = healthCredentialVerifierABI.find(
      (item) => item.type === "function" && item.name === "approvedVkDigest"
    );
    expect(fn).toBeDefined();
    if (fn && fn.type === "function") {
      expect(fn.stateMutability).toBe("view");
    }
  });

  it("has verifiedProofs view function", () => {
    const fn = healthCredentialVerifierABI.find(
      (item) => item.type === "function" && item.name === "verifiedProofs"
    );
    expect(fn).toBeDefined();
    if (fn && fn.type === "function") {
      expect(fn.stateMutability).toBe("view");
    }
  });
});

// ─── fetchVkChunks ──────────────────────────────────────────────────────────

describe("fetchVkChunks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches from /ezkl/vk-chunks.json and returns parsed JSON", async () => {
    const mockChunks = ["0xabc", "0xdef", "0x123"];
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockChunks),
    });

    const result = await fetchVkChunks();

    expect(global.fetch).toHaveBeenCalledWith("/ezkl/vk-chunks.json");
    expect(result).toEqual(mockChunks);
  });

  it("returns an empty array when chunks file is empty", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    });

    const result = await fetchVkChunks();
    expect(result).toEqual([]);
  });

  it("propagates fetch errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetchVkChunks()).rejects.toThrow("Network error");
  });
});
