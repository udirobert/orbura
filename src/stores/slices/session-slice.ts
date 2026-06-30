import type { StateCreator } from "zustand";
import type {
  Stressor,
  FaceAnalysisResult,
  HRVData,
  DebtAnalysis,
  ConfidenceTier,
} from "@/lib/types";

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

/**
 * Session slice — per-assessment state that resets at midnight.
 *
 * Owns: wake/bed time, stressor selections, face/HRV data, analysis result,
 * confidence tier, and the session timestamp. Persisted to localStorage so
 * a refresh mid-session doesn't lose data, but cleared when the calendar
 * day rolls over.
 *
 * Cross-slice note: `setAnalysis` updates the streak in the profile slice.
 * The caller (or the combined store's facade) is responsible for calling
 * `useProfileStore.getState().updateStreak(score)` after `setAnalysis`.
 */
export interface SessionSlice {
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

  // Session timestamp
  sessionStartedAt: string | null;
  setSessionStartedAt: (timestamp: string) => void;

  resetSession: () => void;
}

export const createSessionSlice: StateCreator<
  SessionSlice,
  [],
  [],
  SessionSlice
> = (set, get) => ({
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
    }
  },
  isAnalyzing: false,
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),

  // ── Confidence tier ────────────────────────────────────────────────────
  confidenceTier: "estimated",
  setConfidenceTier: (tier) => set({ confidenceTier: tier }),

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

  sessionStartedAt: null,
  setSessionStartedAt: (timestamp) => set({ sessionStartedAt: timestamp }),

  resetSession: () => set({
    wakeTime: null,
    bedTime: null,
    selectedStressors: [],
    faceAnalysis: null,
    faceSkipped: false,
    hrvData: null,
    hrvSkipped: false,
    analysis: null,
    isAnalyzing: false,
    confidenceTier: "estimated",
    sessionStartedAt: null,
  }),
});

/** Fields from the session slice that should be persisted to storage. */
export const SESSION_PERSIST_FIELDS = [
  "wakeTime",
  "bedTime",
  "selectedStressors",
  "faceSkipped",
  "hrvData",
  "hrvSkipped",
  "analysis",
  "sessionStartedAt",
] as const;

/** Expiry check — returns true if the session should be reset. */
export function shouldExpireSession(sessionStartedAt: string | null): boolean {
  return isSessionExpired(sessionStartedAt);
}
