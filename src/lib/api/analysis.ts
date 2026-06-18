import type { AnalyzeBodyRequest, DebtAnalysis } from "@/lib/types";
import { request } from "./request";

/**
 * Non-streaming debt analysis.
 *
 * Uses the streaming endpoint internally and resolves with the final
 * merged result. This is kept for compatibility with useTerraConnect
 * and any code that needs a simple Promise rather than SSE parsing.
 *
 * POST /api/analyze/stream (consumed to completion)
 */
export async function analyzeDebt(
  body: AnalyzeBodyRequest
): Promise<DebtAnalysis> {
  const res = await request("/api/analyze/stream", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: DebtAnalysis | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    let eventType = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        if (eventType === "done") {
          final = data as DebtAnalysis;
        }
      }
    }
  }

  if (!final) {
    throw new Error("Stream completed without final result");
  }

  return final;
}

/**
 * Streaming analysis — returns the raw ReadableStream so the caller can
 * consume the SSE stream and progressively update UI.
 *
 * POST /api/analyze/stream
 */
export async function startAnalysisStream(
  body: AnalyzeBodyRequest,
  signal?: AbortSignal,
  sessionHeader?: string | null
): Promise<ReadableStream<Uint8Array>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionHeader) headers["x-eazo-session"] = sessionHeader;

  const res = await fetch("/api/analyze/stream", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.body;
}
