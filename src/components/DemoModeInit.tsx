"use client";

import { useEffect } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import type { DebtAnalysis, Stressor } from "@/lib/types";

/**
 * Demo mode — when ?demo=1 is in the URL, override the anonymousId
 * with a shared container tag that has pre-seeded Supermemory data,
 * and inject a mock analysis so the dashboard renders fully.
 *
 * This lets judges visiting the live site see the full memory story
 * (memory card, agent trace, personalized prescription) without
 * needing to run an analysis first.
 *
 * The override is session-only — it does not persist to localStorage,
 * so removing the URL param restores normal behavior.
 */
const DEMO_CONTAINER_TAG = "demo-bodydebt-seed";

const DEMO_STRESSORS: Stressor[] = [
  { type: "sleep", sleepHours: "under_4" },
  { type: "alcohol", alcoholType: "beer", alcoholCount: "3-4" },
  { type: "stress", stressCarried: "yes" },
];

const DEMO_ANALYSIS: DebtAnalysis = {
  debtScore: 64,
  verdict: "High debt — your body is running on fumes.",
  recoveryTime: "6 hours",
  prescription: {
    rightNow:
      "Drink 500ml water with electrolytes — alcohol dehydrated you overnight.",
    thisMorning:
      "Delay caffeine by 90 minutes. Your sleep was even shorter than yesterday — caffeine now would compound the cortisol spike.",
    today:
      "Take a 20-minute walk outside. Natural light is critical after two short nights.",
    avoid:
      "Intense training and alcohol. Your HRV is significantly suppressed and your liver is still processing last night.",
  },
  stressorBreakdown: [
    { stressor: "Poor sleep (4h)", points: 18, insight: "Second night of short sleep", icon: "😴" },
    { stressor: "Alcohol (3 beers)", points: 14, insight: "Dehydrating, liver load", icon: "🍺" },
    { stressor: "Work stress", points: 12, insight: "Cortisol elevated", icon: "💼" },
    { stressor: "Skipped breakfast", points: 8, insight: "Blood sugar dip", icon: "🍽" },
  ],
  recoveryArc: {
    dangerEnds: new Date(Date.now() + 2 * 3600_000).toISOString(),
    partialEnds: new Date(Date.now() + 4 * 3600_000).toISOString(),
    clearedAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
  },
  confidenceLevel: "medium",
  agentTrace: {
    steps: [
      {
        agent: "triage",
        status: "done",
        durationMs: 1200,
        summary: "Classified stressors: sleep debt (recurring), alcohol (new), work stress.",
        raw: "Triage complete. Priority: sleep system. Secondary: metabolic (alcohol). Pattern: second day of sleep debt.",
      },
      {
        agent: "coach",
        status: "done",
        durationMs: 2800,
        summary: "Personalized prescription using memory context. Caffeine delay repeated from day 1.",
        raw: "Coach reasoning: User had 5h sleep yesterday, 4h today. Caffeine delay was effective yesterday — repeat and extend. Alcohol is new factor — prescribe electrolytes. User prefers direct advice — keep prescription concise.",
      },
      {
        agent: "schedule",
        status: "done",
        durationMs: 900,
        summary: "Scheduled 20min walk at 10am, light lunch at 12pm.",
        raw: "Schedule: 10:00 walk (20min outdoor), 12:00 light lunch, 14:00 hydration check, 18:00 early dinner, 22:00 lights out.",
      },
    ],
    totalDurationMs: 4900,
    memoryContext:
      "Day 1 score: 52. Day 2 score: 64. Recurring: poor sleep (2 days). New: alcohol (3 beers). Effective yesterday: caffeine delay 90min. User preference: direct, no-nonsense advice.",
  },
};

export function DemoModeInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      const store = useBodyDebtStore.getState();
      if (store.anonymousId !== DEMO_CONTAINER_TAG) {
        useBodyDebtStore.setState({
          anonymousId: DEMO_CONTAINER_TAG,
          analysis: DEMO_ANALYSIS,
          selectedStressors: DEMO_STRESSORS,
        });
      }
    }
  }, []);

  return null;
}
