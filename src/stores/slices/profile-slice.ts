import type { StateCreator } from "zustand";
import type {
  RecoveryMode,
  SquadPlayer,
  DebtAnalysis,
} from "@/lib/types";
import type { OrbPersonality } from "@/lib/orbPersonality";
import type { Locale } from "@/lib/i18n";

/**
 * Profile slice — long-lived user state that persists across sessions.
 *
 * Owns: recovery mode, squad roster, orb personality, locale, streak data,
 * and the "has seen opening" flag. Never expires at midnight.
 */
export interface ProfileSlice {
  // Recovery mode
  mode: RecoveryMode;
  setMode: (m: RecoveryMode) => void;

  // Squad (football mode)
  squad: SquadPlayer[];
  addPlayer: (player: Omit<SquadPlayer, "id">) => string;
  updatePlayer: (id: string, patch: Partial<SquadPlayer>) => void;
  removePlayer: (id: string) => void;
  setPlayerAnalysis: (id: string, analysis: DebtAnalysis | null) => void;

  // Active player — when set, the analysis flow runs against this squad
  // player instead of the global single-user session.
  activePlayerId: string | null;
  setActivePlayerId: (id: string | null) => void;

  // Onboarding
  hasSeenOpening: boolean;
  setHasSeenOpening: (v: boolean) => void;

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

  // Stable anonymous ID — generated once, persisted, used as
  // Supermemory containerTag for memory isolation per user.
  anonymousId: string;
}

export const createProfileSlice: StateCreator<
  ProfileSlice,
  [],
  [],
  ProfileSlice
> = (set, get) => ({
  mode: "football" as RecoveryMode,
  setMode: (m) => set({ mode: m }),

  squad: [],
  addPlayer: (player) => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set({ squad: [...get().squad, { ...player, id }] });
    return id;
  },
  updatePlayer: (id, patch) => {
    set({ squad: get().squad.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  },
  removePlayer: (id) => {
    const { activePlayerId } = get();
    set({
      squad: get().squad.filter((p) => p.id !== id),
      activePlayerId: activePlayerId === id ? null : activePlayerId,
    });
  },
  setPlayerAnalysis: (id, analysis) => {
    set({ squad: get().squad.map((p) => (p.id === id ? { ...p, analysis } : p)) });
  },

  activePlayerId: null,
  setActivePlayerId: (id) => set({ activePlayerId: id }),

  hasSeenOpening: false,
  setHasSeenOpening: (v) => set({ hasSeenOpening: v }),

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

  orbPersonality: "honest" as OrbPersonality,
  setOrbPersonality: (p) => set({ orbPersonality: p }),

  locale: "en" as Locale,
  setLocale: (l) => set({ locale: l }),

  // Generate a stable anonymous ID on first init. Persists across
  // sessions via PROFILE_PERSIST_FIELDS. Used as Supermemory containerTag.
  anonymousId:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
});

/** Fields from the profile slice that should be persisted to storage. */
export const PROFILE_PERSIST_FIELDS = [
  "mode",
  "hasSeenOpening",
  "streakDays",
  "lastStreakDate",
  "orbPersonality",
  "locale",
  "squad",
  "activePlayerId",
  "anonymousId",
] as const;
