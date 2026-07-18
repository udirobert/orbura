"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { auth } from "@/lib/sdk/eazo-client";
import { startAnalysisStream } from "@/lib/api";
import type { DebtAnalysis, AnalyzeBodyRequest, AgentTrace, ScheduleBlock, AgentStep } from "@/lib/types";

/**
 * useStreamingAnalysis
 *
 * Calls /api/analyze/stream and progressively patches the store
 * as each SSE layer arrives:
 *
 *   Layer 1 (score, ~0ms):      debtScore + stressorBreakdown + seed prescription
 *   Agent events (live):        triage / coach / schedule agents running on QVAC
 *   Layer 2 (verdict, ~1-2s):   refined verdict + recoveryTime + recoveryArc
 *   Layer 3 (prescription, ~3-8s): full prescription from QVAC multi-agent + schedule + trace
 *   done:                       final merged result, navigation fires
 */
export function useStreamingAnalysis() {
  const router   = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatedRef = useRef(false);
  const {
    selectedStressors,
    faceAnalysis,
    setHrvData,
    setHrvSkipped,
    setAnalysis,
    setIsAnalyzing,
    setConfidenceTier,
    setAgentEvents,
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
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    navigatedRef.current = false;
    setAgentEvents([]);
    useBodyDebtStore.setState({ agentProgress: null, memoryRecall: null });

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
      personality: useBodyDebtStore.getState().orbPersonality,
      locale:     useBodyDebtStore.getState().locale,
      mode:       useBodyDebtStore.getState().mode,
      anonymousId: useBodyDebtStore.getState().anonymousId,
    };

    try {
      const sessionHeader = await auth.getSessionHeader();

      const stream = await startAnalysisStream(body, abortRef.current.signal, sessionHeader);

      const reader  = stream.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      // Partial analysis state built up as layers arrive
      let partial: Partial<DebtAnalysis> = {};
      // Agent trace built up from live events
      const agentSteps: AgentStep[] = [];
      // SSE event type persists across chunks — event: and data: lines
      // may arrive in separate reads
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";  // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "score") {
              // Layer 1 arrived — store partial but keep loader visible
              // so the user sees the QVAC agent pipeline streaming live.
              // We navigate to dashboard only when agents finish (done event)
              // or if no agents start within 5s (QVAC not running).
              partial = { ...partial, ...data };
              setAnalysis({ ...partial } as DebtAnalysis);
              if (data.confidenceTier) setConfidenceTier(data.confidenceTier);

              // If no agent_progress or agent_start arrives within 15s,
              // QVAC isn't running — fall back to deterministic data.
              // 15s accounts for model loading from disk on slow CPUs.
              fallbackTimerRef.current = setTimeout(() => {
                if (agentSteps.length === 0 && !abortRef.current?.signal.aborted && !navigatedRef.current) {
                  navigatedRef.current = true;
                  setIsAnalyzing(false);
                  router.push("/dashboard");
                }
              }, 15000);
            }

            if (eventType === "memory_recall") {
              useBodyDebtStore.setState({
                memoryRecall: {
                  factCount: data.factCount as number,
                  preview: data.preview as string,
                  source: data.source as string,
                  hasHistory: data.hasHistory as boolean,
                  recalled: true,
                },
              });
            }

            if (eventType === "agent_start") {
              // A QVAC agent has started — cancel the fallback timer
              if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
              }
              useBodyDebtStore.setState((state) => ({
                agentEvents: [
                  ...state.agentEvents,
                  { agent: data.agent, description: data.description, status: "active", tokens: "" },
                ],
              }));
              agentSteps.push({
                agent: data.agent,
                label: data.agent.charAt(0).toUpperCase() + data.agent.slice(1),
                description: data.description,
                status: "active",
                source: "qvac-local",
              });
            }

            if (eventType === "agent_progress") {
              // Model download / loading progress from QVAC — cancel fallback
              // timer since QVAC is confirmed running
              if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
              }
              useBodyDebtStore.setState({
                agentProgress: data as { status: string; percent?: number; loaded?: number; total?: number },
              });
            }

            if (eventType === "agent_token") {
              // Token streamed from QVAC local LLM — update live token display
              useBodyDebtStore.setState((state) => ({
                agentEvents: state.agentEvents.map((a) =>
                  a.agent === data.agent && a.status === "active"
                    ? { ...a, tokens: (a.tokens ?? "") + data.token }
                    : a
                ),
              }));
            }

            if (eventType === "agent_done") {
              // Agent completed
              useBodyDebtStore.setState((state) => ({
                agentEvents: state.agentEvents.map((a) =>
                  a.agent === data.agent
                    ? { ...a, status: "done", durationMs: data.durationMs }
                    : a
                ),
              }));
              const step = agentSteps.find((s) => s.agent === data.agent && s.status === "active");
              if (step) {
                step.status = "done";
                step.durationMs = data.durationMs;
              }
            }

            if (eventType === "agent_error") {
              useBodyDebtStore.setState((state) => ({
                agentEvents: state.agentEvents.map((a) =>
                  a.agent === data.agent
                    ? { ...a, status: "error" }
                    : a
                ),
              }));
              const step = agentSteps.find((s) => s.agent === data.agent && s.status === "active");
              if (step) step.status = "error";
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
              // Layer 3 arrived — patch prescription + schedule + agent trace
              partial = {
                ...partial,
                prescription: data.prescription,
                schedule: data.schedule as ScheduleBlock[] | undefined,
                agentTrace: data.agentTrace as AgentTrace | undefined,
              };
              setAnalysis({ ...partial } as DebtAnalysis);
            }

            if (eventType === "done") {
              // Canonical final result — overwrite with authoritative merge
              setAnalysis(data as DebtAnalysis);
              // If a squad player is active, also store the result on them
              const state = useBodyDebtStore.getState();
              const { activePlayerId } = state;
              if (activePlayerId) {
                state.setPlayerAnalysis(activePlayerId, data as DebtAnalysis);
                // Persist the player's stressors + face scan so a re-scan
                // can pre-fill the intake from their last assessment.
                const player = state.squad.find((p) => p.id === activePlayerId);
                if (player) {
                  state.updatePlayer(activePlayerId, {
                    stressors: state.selectedStressors,
                    faceAnalysis: state.faceAnalysis,
                  });
                }
                state.setActivePlayerId(null);
              }
              if (!navigatedRef.current) {
                navigatedRef.current = true;
                setIsAnalyzing(false);
                router.push("/dashboard");
              }
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
  }, [selectedStressors, faceAnalysis, setHrvData, setHrvSkipped, setAnalysis, setIsAnalyzing, setConfidenceTier, setAgentEvents, currentAnalysis, router]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, [setIsAnalyzing]);

  return { runAnalysis, cancel };
}
