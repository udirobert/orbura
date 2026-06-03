import type { StressorType } from "@/lib/types";

export interface QvacInferRequest {
  stressScore: number;
  isHealthy: boolean;
  features: {
    eyeFatigue: boolean;
    browTension: boolean;
    mouthTension: boolean;
  };
  stressors: StressorType[];
}

export interface QvacInferResponse {
  advice: string;
  source: string;
  model?: string;
}

/**
 * Calls the QVAC edge AI inference endpoint.
 * Falls back to cloud AI if local QVAC model is unavailable.
 *
 * POST /api/qvac/infer
 */
export async function getQvacAdvice(
  input: QvacInferRequest
): Promise<QvacInferResponse> {
  const res = await fetch("/api/qvac/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    return { advice: "Focus on rest and hydration.", source: "fallback" };
  }
  const data = await res.json();
  return {
    advice: data.advice ?? "Focus on rest and hydration.",
    source: data.source ?? "fallback",
    model: data.model,
  };
}
