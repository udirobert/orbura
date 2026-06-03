import type { AnalyzeBodyRequest, DebtAnalysis } from "@/lib/types";
import { request } from "./request";

/**
 * Non-streaming debt analysis.
 * POST /api/analyze
 */
export async function analyzeDebt(
  body: AnalyzeBodyRequest
): Promise<DebtAnalysis> {
  const res = await request("/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as DebtAnalysis;
}

/**
 * Streaming analysis — returns the body ReadableStream so the caller can
 * consume the SSE stream. The caller is responsible for parsing
 * the event stream.
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
