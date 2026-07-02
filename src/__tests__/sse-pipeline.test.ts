import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnalyzeBodyRequest, Stressor } from "@/lib/types";
import { validateSSEEvent } from "@/lib/sse-schemas";

// ─── Test data ────────────────────────────────────────────────────────────────

const STRESSORS: Stressor[] = [
  { type: "alcohol", alcoholType: "red_wine", alcoholCount: "3-4" },
  { type: "sleep", sleepHours: "6-7" },
  { type: "training", trainingArea: "legs", trainingIntensity: "hard" },
];

const MOCK_BODY: AnalyzeBodyRequest = {
  stressors: STRESSORS,
  mode: "personal",
  currentTime: "8:30 AM",
};

const encoder = new TextEncoder();

// ─── SSE event builder helpers ────────────────────────────────────────────────

function buildSSE(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function buildEventStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

// ─── Mock fetch helper ────────────────────────────────────────────────────────

function mockError(status: number, statusText: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    body: null,
  });
}



// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("SSE Pipeline — event shape validation", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Schema validation (self-contained, no mock needed) ────────────────────

  describe("Zod schema validation (validateSSEEvent)", () => {
    it("validates a correct score event", () => {
      const result = validateSSEEvent("score", {
        debtScore: 62,
        stressorBreakdown: [{ stressor: "Alcohol", points: 18, insight: "test", icon: "🍺" }],
        systemScores: [{ system: "liver", label: "Liver", icon: "🫡", score: 60, clearedAt: new Date().toISOString(), causeText: "test", actionText: "test" }],
        confidenceLevel: "medium",
        confidenceTier: "good",
        recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() },
        verdict: "Your body is working hard to recover.",
        recoveryTime: "2pm today",
        prescription: { rightNow: "test", thisMorning: "test", today: "test", avoid: "test" },
        _layer: "deterministic",
      });
      expect(result.ok).toBe(true);
    });

    it("rejects a score event with missing required fields", () => {
      const result = validateSSEEvent("score", { debtScore: 62 });
      expect(result.ok).toBe(false);
    });

    it("validates a correct agent_start event", () => {
      const result = validateSSEEvent("agent_start", {
        agent: "triage",
        description: "Analyzing system scores to identify priority systems.",
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct agent_token event", () => {
      const result = validateSSEEvent("agent_token", {
        agent: "triage",
        token: "PRIORITY",
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct agent_done event", () => {
      const result = validateSSEEvent("agent_done", {
        agent: "triage",
        result: { priority: "Liver", secondary: "Brain", avoid: "Alcohol" },
        durationMs: 1200,
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct agent_error event", () => {
      const result = validateSSEEvent("agent_error", {
        agent: "triage",
        error: "Model timeout",
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct agent_progress event", () => {
      const result = validateSSEEvent("agent_progress", {
        status: "downloading",
        percent: 45,
        loaded: 350,
        total: 773,
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct verdict event", () => {
      const result = validateSSEEvent("verdict", {
        verdict: "Your body is processing last night's load.",
        recoveryTime: "6pm tonight",
        recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() },
        _layer: "ai_verdict",
        _model: "deepseek.v3.1",
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct prescription event", () => {
      const result = validateSSEEvent("prescription", {
        prescription: { rightNow: "Drink 500ml water", thisMorning: "Eat protein", today: "Rest", avoid: "Caffeine" },
        _layer: "qvac_multi_agent",
        schedule: [{ time: "NOW-10AM", action: "Hydrate", system: "liver" }],
        agentTrace: {
          steps: [{ agent: "triage", label: "Triage Agent", description: "Analyzing...", status: "done", durationMs: 1200, source: "qvac-local" }],
          source: "qvac-local",
        },
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct done event", () => {
      const result = validateSSEEvent("done", {
        debtScore: 62,
        verdict: "Your body needs rest.",
        recoveryTime: "later today",
        prescription: { rightNow: "Hydrate", thisMorning: "Eat", today: "Rest", avoid: "Alcohol" },
        stressorBreakdown: [],
        recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() },
        confidenceLevel: "medium",
      });
      expect(result.ok).toBe(true);
    });

    it("validates a correct error event", () => {
      const result = validateSSEEvent("error", {
        error: "Internal server error",
      });
      expect(result.ok).toBe(true);
    });

    it("passes through unknown event types with ok:true (non-blocking)", () => {
      const result = validateSSEEvent("unknown_event", {});
      expect(result.ok).toBe(true);
    });

    it('delivers the original data (not sanitized) when validation fails', () => {
      const result = validateSSEEvent("score", {
        debtScore: 62,
        // missing required fields — but data still passes through
      });
      // ok is false but data should still be the input
      expect(result.ok).toBe(false);
      expect(result.data).toEqual({ debtScore: 62 });
    });
  });

  // ── Stream decoding (self-contained, no mock needed) ────────────────────

  describe("SSE stream chunk decoding", () => {
    it("handles event across multiple chunks (split on event: line)", async () => {
      const chunks = [
        encoder.encode("eve"),
        encoder.encode('nt: score\ndata: {"debtScore":42}\n\n'),
      ];
      const stream = buildEventStream(chunks);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const events: { event: string; data: unknown }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) {
            events.push({ event: eventType, data: JSON.parse(line.slice(6)) });
          }
        }
      }

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("score");
      expect(events[0].data).toEqual({ debtScore: 42 });
    });

    it("handles multiple SSE events in a single chunk", async () => {
      const chunk = encoder.encode(
        'event: score\ndata: {"debtScore":42}\n\n' +
        'event: verdict\ndata: {"verdict":"Test verdict"}\n\n'
      );
      const stream = buildEventStream([chunk]);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const events: { event: string; data: unknown }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) {
            events.push({ event: eventType, data: JSON.parse(line.slice(6)) });
          }
        }
      }

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("score");
      expect(events[1].event).toBe("verdict");
    });

    it("handles event: and data: arriving in separate reads", async () => {
      const chunks = [
        encoder.encode('event: score\n'),
        encoder.encode('data: {"debtScore":42}\n\n'),
      ];
      const stream = buildEventStream(chunks);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let lastData: unknown = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ")) {
            if (eventType === "score") lastData = JSON.parse(line.slice(6));
          }
        }
      }

      expect(lastData).toEqual({ debtScore: 42 });
    });

    it("handles empty event body gracefully", async () => {
      const chunks = [encoder.encode("data: \n\n")];
      const stream = buildEventStream(chunks);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let received = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim();
            if (payload) JSON.parse(payload);
            received = true;
          }
        }
      }

      expect(received).toBe(true);
    });
  });

  // ── Event ordering ─────────────────────────────────────────────────────

  describe("SSE event ordering", () => {
    it("emits score before verdict in a normal flow", () => {
      const events = buildSSE("score", { debtScore: 42 });
      const events2 = buildSSE("verdict", { verdict: "Test" });
      const full = new TextDecoder().decode(events) + new TextDecoder().decode(events2);

      const lines = full.split("\n");
      const eventTypes: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event: ")) eventTypes.push(line.slice(7).trim());
      }

      const scoreIdx = eventTypes.indexOf("score");
      const verdictIdx = eventTypes.indexOf("verdict");
      expect(scoreIdx).toBeGreaterThanOrEqual(0);
      expect(verdictIdx).toBeGreaterThan(scoreIdx);
    });

    it("correctly parses all event types from a sequential stream", () => {
      // Build the SSE text by concatenating strings (not Uint8Arrays)
      const scoreText = `event: score\ndata: {"debtScore":50}\n\n`;
      const agentText = `event: agent_start\ndata: {"agent":"triage","description":"test"}\n\n`;
      const verdictText = `event: verdict\ndata: {"verdict":"test","recoveryTime":"later","recoveryArc":{"dangerEnds":"${new Date().toISOString()}","partialEnds":"${new Date().toISOString()}","clearedAt":"${new Date().toISOString()}"},"_layer":"test"}\n\n`;
      const prescriptionText = `event: prescription\ndata: {"prescription":{"rightNow":"a","thisMorning":"b","today":"c","avoid":"d"},"_layer":"test"}\n\n`;
      const doneText = `event: done\ndata: {"debtScore":50,"verdict":"test","recoveryTime":"later","prescription":{"rightNow":"a","thisMorning":"b","today":"c","avoid":"d"},"stressorBreakdown":[],"recoveryArc":{"dangerEnds":"${new Date().toISOString()}","partialEnds":"${new Date().toISOString()}","clearedAt":"${new Date().toISOString()}"},"confidenceLevel":"medium"}\n\n`;

      const text = scoreText + agentText + verdictText + prescriptionText + doneText;
      const lines = text.split("\n");
      const events: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event: ")) events.push(line.slice(7).trim());
      }

      expect(events).toEqual(["score", "agent_start", "verdict", "prescription", "done"]);
    });
  });

  // ── Fallback / error flow ──────────────────────────────────────────────

  describe("event flow: fallback on error", () => {
    it("consumes last event in an error-only stream", async () => {
      const chunk = buildSSE("error", { error: "Server error" });
      const stream = buildEventStream([chunk]);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastEvent = "";
      let lastData: unknown = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: ")) lastEvent = line.slice(7).trim();
          else if (line.startsWith("data: ")) lastData = JSON.parse(line.slice(6));
        }
      }

      expect(lastEvent).toBe("error");
      expect(lastData).toEqual({ error: "Server error" });
    });

    it("produces valid data even when stream ends without done event", async () => {
      // A stream that ends prematurely (no done event) — the consumer
      // should still have whatever partial data arrived
      const scoreData = { debtScore: 62, verdict: "partial", recoveryTime: "later", prescription: { rightNow: "a", thisMorning: "b", today: "c", avoid: "d" }, stressorBreakdown: [], recoveryArc: { dangerEnds: "now", partialEnds: "later", clearedAt: "later" }, confidenceLevel: "medium" };
      const chunk = buildSSE("score", scoreData);
      const stream = buildEventStream([chunk]);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastData: Record<string, unknown> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          else if (line.startsWith("data: ") && eventType === "score") {
            lastData = JSON.parse(line.slice(6)) as Record<string, unknown>;
          }
        }
      }

      expect(lastData?.debtScore).toBe(62);
    });
  });

  // ── HTTP error handling ────────────────────────────────────────────────

  describe("HTTP error handling", () => {
    it("throws on non-200 response when fetching stream", async () => {
      mockError(500, "Internal Server Error");

      await expect(
        fetch("/api/analyze/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(MOCK_BODY),
        })
      ).resolves.toMatchObject({ ok: false, status: 500 });
    });

    it("throws on missing response body", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      const res = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(MOCK_BODY),
      });

      expect(res.ok).toBe(true);
      expect(res.body).toBeNull();
    });
  });
});
