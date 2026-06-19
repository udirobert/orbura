"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Stressor,
  FaceAnalysisResult,
  HRVData,
  DebtAnalysis,
  ConfidenceTier,
  ZKProofResult,
} from "@/lib/types";
import type { OrbPersonality } from "@/lib/orbPersonality";
import type { Locale } from "@/lib/i18n";

// Agent event state for live multi-agent UI
export interface AgentEventState {
  agent: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
  durationMs?: number;
  tokens?: string;
}

// Midnight expiry — reset session each day
function isSessionExpired(ts: string | null): boolean {
  if (!ts) return false;
  const saved = new Date(ts);
  const now = new Date();
  return (
    saved.getFullYear() !== now.getFullYear() ||
    saved.getMonth()    !== now.getMonth()    ||
    saved.getDate()     !== now.getDate()
  );
}

interface BodyDebtState {
  // Onboarding
  hasSeenOpening: boolean;
  setHasSeenOpening: (v: boolean) => void;

  // Wake time
  wakeTime: string | null;
  setWakeTime: (t: string) => void;

  // Bed time (last night)
  bedTime: string | null;
  setBedTime: (t: string) => void;

  // Stressor selections
  selectedStressors: Stressor[];
  setSelectedStressors: (stressors: Stressor[]) => void;
  toggleStressor: (type: Stressor["type"]) => void;
  updateStressor: (type: Stressor["type"], patch: Partial<Stressor>) => void;
  // Legacy compat
  updateStressorContext: (type: Stressor["type"], context: string) => void;

  // Face scan
  faceAnalysis: FaceAnalysisResult | null;
  setFaceAnalysis: (result: FaceAnalysisResult | null) => void;
  faceSkipped: boolean;
  setFaceSkipped: (v: boolean) => void;

  // HRV / wearable
  hrvData: HRVData | null;
  setHrvData: (data: HRVData | null) => void;
  hrvSkipped: boolean;
  setHrvSkipped: (v: boolean) => void;

  // Debt analysis result
  analysis: DebtAnalysis | null;
  setAnalysis: (analysis: DebtAnalysis | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;

  // Confidence tier — computed from what's been provided, or set from server
  confidenceTier: ConfidenceTier;
  setConfidenceTier: (tier: ConfidenceTier) => void;
  recomputeConfidence: () => void;

  // Streak — consecutive days with debt < 20
  streakDays: number;
  lastStreakDate: string | null;
  updateStreak: (score: number) => void;

  // Orb personality
  orbPersonality: OrbPersonality;
  setOrbPersonality: (p: OrbPersonality) => void;

  // Locale
  locale: Locale;
  setLocale: (l: Locale) => void;

  // ZK proof result (ephemeral — not persisted)
  zkProof: ZKProofResult | null;
  setZkProof: (proof: ZKProofResult | null) => void;

  // Agent events (live during analysis — not persisted)
  agentEvents: AgentEventState[];
  setAgentEvents: (events: AgentEventState[]) => void;

  // Agent model download progress (live during analysis — not persisted)
  agentProgress: { status: string; percent?: number; loaded?: number; total?: number } | null;
  setAgentProgress: (progress: { status: string; percent?: number; loaded?: number; total?: number } | null) => void;

  // Session timestamp
  sessionStartedAt: string | null;
  setSessionStartedAt: (timestamp: string) => void;

  reset: () => void;
}

export const useBodyDebtStore = create<BodyDebtState>()(
  persist(
    (set, get) => ({
      hasSeenOpening: false,
      setHasSeenOpening: (v) => set({ hasSeenOpening: v }),

      wakeTime: null,
      setWakeTime: (t) => set({ wakeTime: t }),

      bedTime: null,
      setBedTime: (t) => set({ bedTime: t }),

      selectedStressors: [],
      setSelectedStressors: (stressors) => {
        set({ selectedStressors: stressors });
        get().recomputeConfidence();
      },
      toggleStressor: (type) => {
        const existing = get().selectedStressors;
        const has = existing.some((s) => s.type === type);
        const updated = has
          ? existing.filter((s) => s.type !== type)
          : [...existing, { type }];
        set({ selectedStressors: updated });
        get().recomputeConfidence();
      },
      updateStressor: (type, patch) => {
        const updated = get().selectedStressors.map((s) =>
          s.type === type ? { ...s, ...patch } : s
        );
        set({ selectedStressors: updated });
        get().recomputeConfidence();
      },
      updateStressorContext: (type, context) => {
        get().updateStressor(type, { context });
      },

      faceAnalysis: null,
      setFaceAnalysis: (result) => {
        set({ faceAnalysis: result });
        get().recomputeConfidence();
      },
      faceSkipped: false,
      setFaceSkipped: (v) => set({ faceSkipped: v }),

      hrvData: null,
      setHrvData: (data) => {
        set({ hrvData: data });
        get().recomputeConfidence();
      },
      hrvSkipped: false,
      setHrvSkipped: (v) => set({ hrvSkipped: v }),

      analysis: null,
      setAnalysis: (analysis) => {
        set({ analysis });
        if (analysis) {
          set({ sessionStartedAt: new Date().toISOString() });
          get().updateStreak(analysis.debtScore);
        }
      },
      isAnalyzing: false,
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),

      // ── Confidence tier ────────────────────────────────────────────────────
      confidenceTier: "estimated",
      setConfidenceTier: (tier) => set({ confidenceTier: tier }),

      orbPersonality: "honest" as OrbPersonality,
      setOrbPersonality: (p) => set({ orbPersonality: p }),

      locale: "en" as Locale,
      setLocale: (l) => set({ locale: l }),

      zkProof: null,
      setZkProof: (proof) => set({ zkProof: proof }),

      agentEvents: [],
      setAgentEvents: (events) => set({ agentEvents: events }),

      agentProgress: null,
      setAgentProgress: (progress) => set({ agentProgress: progress }),

      recomputeConfidence: () => {
        const { selectedStressors, faceAnalysis, hrvData } = get();
        const hasSpecifics = selectedStressors.some((s) =>
          s.alcoholType || s.alcoholCount || s.trainingArea ||
          s.trainingIntensity || s.sleepHours || s.stressCarried ||
          s.illSeverity || s.context
        );
        let tier: ConfidenceTier = "estimated";
        if (selectedStressors.length > 0) tier = "partial";
        if (selectedStressors.length > 0 && hasSpecifics) tier = "good";
        if (faceAnalysis) tier = "accurate";
        if (hrvData) tier = "precise";
        set({ confidenceTier: tier });
      },

      // ── Streak ────────────────────────────────────────────────────────────
      streakDays: 0,
      lastStreakDate: null,
      updateStreak: (score) => {
        const { streakDays, lastStreakDate } = get();
        const today = new Date().toDateString();
        if (lastStreakDate === today) return; // already updated today
        if (score > 40) {
          set({ streakDays: 0, lastStreakDate: today });
        } else if (score <= 20) {
          set({ streakDays: streakDays + 1, lastStreakDate: today });
        }
        // 21–40: streak frozen (not broken, not incremented)
      },

      sessionStartedAt: null,
      setSessionStartedAt: (timestamp) => set({ sessionStartedAt: timestamp }),

      reset: () => set({
        wakeTime: null,
        selectedStressors: [],
        faceAnalysis: null,
        faceSkipped: false,
        hrvData: null,
        hrvSkipped: false,
        analysis: null,
        isAnalyzing: false,
        confidenceTier: "estimated",
        sessionStartedAt: null,
        zkProof: null,
        agentEvents: [],
        agentProgress: null,
      }),
    }),
    {
      name: "body-debt-session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({
        hasSeenOpening:    state.hasSeenOpening,
        wakeTime:          state.wakeTime,
        bedTime:           state.bedTime,
        selectedStressors: state.selectedStressors,
        faceSkipped:       state.faceSkipped,
        hrvData:           state.hrvData,
        hrvSkipped:        state.hrvSkipped,
        analysis:          state.analysis,
        sessionStartedAt:  state.sessionStartedAt,
        streakDays:        state.streakDays,
        lastStreakDate:     state.lastStreakDate,
        orbPersonality:    state.orbPersonality,
        locale:            state.locale,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && isSessionExpired(state.sessionStartedAt)) {
          const seen = state.hasSeenOpening;
          const streak = state.streakDays;
          const lastStreak = state.lastStreakDate;
          state.reset();
          state.hasSeenOpening = seen;
          state.streakDays = streak;
          state.lastStreakDate = lastStreak;
        }
      },
    }
  )
);
