"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { auth } from "@eazo/sdk";
import { startAnalysisStream } from "@/lib/api";
import type { DebtAnalysis, AnalyzeBodyRequest } from "@/lib/types";
/**
 * useStreamingAnalysis
 *
 * Calls /api/analyze/stream and progressively patches the store
 * as each SSE layer arrives:
 *
 *   Layer 1 (score, ~0ms):   store gets debtScore + stressorBreakdown + seed prescription
 *   Layer 2 (verdict, ~1s):  store gets refined verdict + recoveryTime + recoveryArc
 *   Layer 3 (prescription, ~3s): store gets full personalised prescription
 *   done:                    store gets final merged result, navigation fires
 */
export function useStreamingAnalysis() {
  const router   = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const {
    selectedStressors,
    faceAnalysis,
    setHrvData,
    setHrvSkipped,
    setAnalysis,
    setIsAnalyzing,
    setConfidenceTier,
    analysis: currentAnalysis,
  } = useBodyDebtStore();

  const runAnalysis = useCallback(async (
    hrvData: ReturnType<typeof useBodyDebtStore.getState>["hrvData"],
    skipped: boolean,
    currentTime?: string,
  ) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (skipped) {
      setHrvSkipped(true);
      setHrvData(null);
    } else if (hrvData) {
      setHrvData(hrvData);
    }

    setIsAnalyzing(true);

    const body: AnalyzeBodyRequest = {
      stressors:   selectedStressors,
      faceAnalysis: faceAnalysis ?? null,
      hrvData:      skipped ? null : (hrvData ?? null),
      currentTime:  currentTime ?? new Date().toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true,
      }),
      wakeTime: useBodyDebtStore.getState().wakeTime ?? undefined,
      bedTime:  useBodyDebtStore.getState().bedTime  ?? undefined,
    };

    try {
      const sessionHeader = await auth.getSessionHeader();

      const stream = await startAnalysisStream(body, abortRef.current.signal, sessionHeader);

      const reader  = stream.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      // Partial analysis state built up as layers arrive
      let partial: Partial<DebtAnalysis> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";  // keep incomplete line in buffer

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "score") {
              // Layer 1 arrived — immediately show score on dashboard
              partial = { ...partial, ...data };
              setAnalysis({ ...partial } as DebtAnalysis);
              if (data.confidenceTier) setConfidenceTier(data.confidenceTier);
              setIsAnalyzing(false);  // stop the loading screen, show partial result
              router.push("/dashboard");
            }

            if (eventType === "verdict") {
              // Layer 2 arrived — patch verdict + recovery
              partial = {
                ...partial,
                verdict:     data.verdict,
                recoveryTime: data.recoveryTime,
                recoveryArc: data.recoveryArc,
              };
              setAnalysis({ ...partial } as DebtAnalysis);
            }

            if (eventType === "prescription") {
              // Layer 3 arrived — patch prescription
              partial = {
                ...partial,
                prescription: data.prescription,
              };
              setAnalysis({ ...partial } as DebtAnalysis);
            }

            if (eventType === "done") {
              // Canonical final result — overwrite with authoritative merge
              setAnalysis(data as DebtAnalysis);
            }

            if (eventType === "error") {
              throw new Error(data.error ?? "Stream error");
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;  // intentional cancel

      // Total failure — still show whatever partial we have, or a fallback
      setIsAnalyzing(false);
      if (!currentAnalysis) {
        // Nothing at all — push to dashboard with a minimal fallback so user isn't stranded
        const fallbackScore = selectedStressors.length * 15;
        setAnalysis({
          debtScore:    Math.min(100, fallbackScore),
          verdict:      "We had trouble reaching our servers. Score estimated from your inputs.",
          recoveryTime: "later today",
          prescription: {
            rightNow:    "Drink 500ml of water with electrolytes.",
            thisMorning: "Avoid caffeine for the next two hours.",
            today:       "Take it easy — we couldn't calculate your full picture.",
            avoid:       "Intense training while your body is under load.",
          },
          stressorBreakdown: [],
          recoveryArc: {
            dangerEnds:  new Date(Date.now() + 3 * 3600000).toISOString(),
            partialEnds: new Date(Date.now() + 6 * 3600000).toISOString(),
            clearedAt:   new Date(Date.now() + 12 * 3600000).toISOString(),
          },
          confidenceLevel: "low",
          _error: true,
        } as DebtAnalysis & { _error: boolean });
        router.push("/dashboard");
      }
    }
  }, [selectedStressors, faceAnalysis, setHrvData, setHrvSkipped, setAnalysis, setIsAnalyzing, setConfidenceTier, currentAnalysis, router]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, [setIsAnalyzing]);

  return { runAnalysis, cancel };
}
