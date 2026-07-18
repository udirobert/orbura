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
  edgeDurationMs?: number;
  cloudDurationMs?: number;
}

export interface QvacProgress {
  status: string;
  loaded?: number;
  total?: number;
  percent?: number;
}

/**
 * Calls the self-hosted QVAC inference endpoint via SSE.
 * Reports progress via onProgress callback and returns the final advice.
 *
 * POST /api/qvac/infer
 */
export async function getQvacAdvice(
  input: QvacInferRequest,
  onProgress?: (progress: QvacProgress) => void,
  signal?: AbortSignal
): Promise<QvacInferResponse> {
  const res = await fetch("/api/qvac/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    return { advice: "Focus on rest and hydration.", source: "fallback" };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { advice: "Focus on rest and hydration.", source: "fallback" };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let resolved = false;

  return new Promise((resolve) => {
    // Abort signal cleanup — cancel the reader if signalled
    const onAbort = () => {
      if (!resolved) {
        resolved = true;
        reader.cancel();
        resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    // Handle race: if signal was already aborted before our listener was added
    if (signal?.aborted) onAbort();

    const read = () => {
      if (resolved) return;
      reader.read().then(({ done, value }) => {
        if (resolved) return;
        if (done) {
          resolved = true;
          resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.status) {
                onProgress?.(data as QvacProgress);
              } else if (data.advice && !resolved) {
                resolved = true;
                signal?.removeEventListener("abort", onAbort);
                resolve({
                  advice: data.advice,
                  source: data.source,
                  model: data.model,
                  edgeDurationMs: data.edgeDurationMs,
                  cloudDurationMs: data.cloudDurationMs,
                });
                reader.cancel();
                return;
              }
            } catch {
              // skip malformed data
            }
          }
        }

        read();
      }).catch((err) => {
        if (resolved) return;
        // AbortError is expected on intentional cancellation, not a failure
        if (err?.name === "AbortError") {
          resolved = true;
          resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
          return;
        }
        resolved = true;
        resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
      });
    };

    read();
  });
}
