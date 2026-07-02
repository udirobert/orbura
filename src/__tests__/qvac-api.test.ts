import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getQvacAdvice } from "@/lib/api/qvac";
import type { QvacInferRequest } from "@/lib/api/qvac";

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockInput: QvacInferRequest = {
  stressScore: 62,
  isHealthy: true,
  features: { eyeFatigue: true, browTension: false, mouthTension: false },
  stressors: ["alcohol", "sleep"],
};

const encoder = new TextEncoder();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createProgressEvent(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function createResultEvent(data: { advice: string; source: string; model?: string }): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function createMockReader(
  chunks: Uint8Array[],
  overrides?: Partial<ReadableStreamDefaultReader>
): ReadableStreamDefaultReader {
  let index = 0;
  return {
    read: vi.fn().mockImplementation(() => {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: chunks[index++] });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
    releaseLock: vi.fn(),
    closed: Promise.resolve(),
    ...overrides,
  } as unknown as ReadableStreamDefaultReader;
}

function mockFetchResponse(
  reader: ReadableStreamDefaultReader,
  status = 200
) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: { getReader: () => reader },
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getQvacAdvice", () => {
  describe("progress events", () => {
    it("fires onProgress when receiving a progress event", async () => {
      const onProgress = vi.fn();
      const chunk = createProgressEvent({ status: "downloading", loaded: 0, total: 100, percent: 0 });
      const reader = createMockReader([chunk]);
      mockFetchResponse(reader);

      await getQvacAdvice(mockInput, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith({
        status: "downloading",
        loaded: 0,
        total: 100,
        percent: 0,
      });
    });

    it("fires onProgress for multiple progress events", async () => {
      const onProgress = vi.fn();
      const chunks = [
        createProgressEvent({ status: "downloading", loaded: 0, total: 100, percent: 0 }),
        createProgressEvent({ status: "downloading", loaded: 50, total: 100, percent: 50 }),
        createProgressEvent({ status: "downloading", loaded: 100, total: 100, percent: 100 }),
        createProgressEvent({ status: "generating", percent: 100 }),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      await getQvacAdvice(mockInput, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(4);
      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "downloading", loaded: 0 }));
      expect(onProgress).toHaveBeenNthCalledWith(3, expect.objectContaining({ status: "downloading", loaded: 100 }));
      expect(onProgress).toHaveBeenNthCalledWith(4, expect.objectContaining({ status: "generating" }));
    });
  });

  describe("result parsing", () => {
    it("resolves with advice from a result event", async () => {
      const chunk = createResultEvent({
        advice: "Take a deep breath and hydrate.",
        source: "qvac-local",
        model: "qwen3-1.7b-inst-q4",
      });
      const reader = createMockReader([chunk]);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      expect(result.advice).toBe("Take a deep breath and hydrate.");
      expect(result.source).toBe("qvac-local");
      expect(result.model).toBe("qwen3-1.7b-inst-q4");
    });

    it("resolves with fallback fallback when no result event in stream", async () => {
      const reader = createMockReader([]);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      expect(result.source).toBe("fallback");
      expect(result.advice).toBe("Focus on rest and hydration.");
    });
  });

  describe("full flow: progress → result", () => {
    it("fires onProgress then resolves with result", async () => {
      const onProgress = vi.fn();
      const chunks = [
        createProgressEvent({ status: "downloading", total: 773025824 }),
        createProgressEvent({ status: "generating", percent: 100 }),
        createResultEvent({
          advice: "Rest your eyes with the 20-20-20 rule. Prioritize 7+ hours of sleep.",
          source: "qvac-local",
          model: "qwen3-1.7b-inst-q4",
        }),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput, onProgress);

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "downloading" }));
      expect(onProgress).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: "generating" }));
      expect(result.advice).toContain("20-20-20 rule");
      expect(result.source).toBe("qvac-local");
      expect(result.model).toBe("qwen3-1.7b-inst-q4");
    });
  });

  describe("abort signal handling", () => {
    it("resolves with fallback and cancels reader when aborted mid-stream", async () => {
      const controller = new AbortController();
      const onProgress = vi.fn();
      const cancelFn = vi.fn().mockResolvedValue(undefined);

      // Reader that never resolves (long stream)
      const reader = {
        read: vi.fn().mockReturnValue(new Promise<never>(() => {})),
        cancel: cancelFn,
        releaseLock: vi.fn(),
        closed: Promise.resolve(),
      } as unknown as ReadableStreamDefaultReader;

      mockFetchResponse(reader);

      const promise = getQvacAdvice(mockInput, onProgress, controller.signal);

      // Let the async function progress past the await fetch
      // by advancing timers to drain the microtask queue
      await vi.advanceTimersByTimeAsync(10);

      // Reader.read() should have been called
      expect(reader.read).toHaveBeenCalled();

      // Abort mid-stream
      controller.abort();

      const result = await promise;

      expect(cancelFn).toHaveBeenCalled();
      expect(result.source).toBe("fallback");
      expect(result.advice).toBe("Focus on rest and hydration.");
    });

    it("rejects when signal is already aborted before fetch", async () => {
      const controller = new AbortController();
      controller.abort();

      // Mock fetch to reject with AbortError when signal is aborted
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(
        getQvacAdvice(mockInput, vi.fn(), controller.signal)
      ).rejects.toThrow("The operation was aborted");
    });
  });

  describe("error handling", () => {
    it("returns fallback on HTTP error", async () => {
      const reader = createMockReader([]);
      mockFetchResponse(reader, 500);

      const result = await getQvacAdvice(mockInput);

      expect(result.source).toBe("fallback");
      expect(result.advice).toBe("Focus on rest and hydration.");
    });

    it("returns fallback when response has no body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      const result = await getQvacAdvice(mockInput);

      expect(result.source).toBe("fallback");
    });

    it("returns fallback when reader.read() throws a non-AbortError", async () => {
      const reader = {
        read: vi.fn().mockRejectedValue(new Error("Network failure")),
        cancel: vi.fn(),
        releaseLock: vi.fn(),
        closed: Promise.resolve(),
      } as unknown as ReadableStreamDefaultReader;

      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      expect(result.source).toBe("fallback");
    });

    it("skips malformed JSON data lines", async () => {
      const onProgress = vi.fn();
      const chunks = [
        encoder.encode("data: {invalid json}\n\n"),
        createProgressEvent({ status: "generating", percent: 100 }),
        createResultEvent({ advice: "Stay hydrated.", source: "qvac-local" }),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput, onProgress);

      // Malformed line skipped, progress still received
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(result.advice).toBe("Stay hydrated.");
    });

    it("skips lines without data: prefix", async () => {
      const chunks = [
        encoder.encode("event: progress\n"),
        encoder.encode("data: {\"advice\":\"Just rest.\",\"source\":\"qvac-local\"}\n\n"),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      // The "event:" line has no "data:" prefix so it's skipped.
      // The next line has "data:" and contains advice.
      expect(result.advice).toBe("Just rest.");
    });
  });

  describe("edge cases", () => {
    it("handles stream that spans multiple chunks (partial lines)", async () => {
      const chunks = [
        encoder.encode("data: {\"statu"),
        encoder.encode('s":"downloading"}\n\ndata: {"adv'),
        encoder.encode('ice":"Go for a walk.","source":"qvac-local"}\n\n'),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      // Partial JSON lines should be buffered and reassembled
      expect(result.advice).toBe("Go for a walk.");
      expect(result.source).toBe("qvac-local");
    });

    it("returns fallback for empty input body", async () => {
      const reader = createMockReader([]);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput);

      expect(result.source).toBe("fallback");
    });

    it("handles omitted onProgress callback without throwing", async () => {
      const chunk = createResultEvent({
        advice: "Hydrate and rest.",
        source: "qvac-local",
      });
      const reader = createMockReader([chunk]);
      mockFetchResponse(reader);

      // Should not throw when onProgress is undefined
      const result = await getQvacAdvice(mockInput, undefined);
      expect(result.advice).toBe("Hydrate and rest.");
    });

    it("ignores progress events after result is already resolved (defective server)", async () => {
      const onProgress = vi.fn();
      const chunks = [
        createResultEvent({
          advice: "Rest well.",
          source: "qvac-local",
          model: "qwen3-1.7b-inst-q4",
        }),
        // These come after the result — should be ignored
        createProgressEvent({ status: "downloading", loaded: 50, total: 100, percent: 50 }),
        createResultEvent({
          advice: "Second advice.",
          source: "qvac-local",
        }),
      ];
      const reader = createMockReader(chunks);
      mockFetchResponse(reader);

      const result = await getQvacAdvice(mockInput, onProgress);

      // Should resolve with the FIRST result, not the second
      expect(result.advice).toBe("Rest well.");
      // onProgress should NOT be called for events after resolution
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe("fetch input shape", () => {
    it("sends POST to /api/qvac/infer with correct body", async () => {
      const reader = createMockReader([]);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: { getReader: () => reader },
      });

      await getQvacAdvice(mockInput);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/qvac/infer",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockInput),
        })
      );
    });
  });
});
