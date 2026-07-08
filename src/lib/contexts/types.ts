import type { StressorType, RecoveryMode } from "@/lib/types";

// ─── Scoring weight overrides ────────────────────────────────────────────────

export interface ScoringWeights {
  baseWeights: Partial<Record<StressorType, { min: number; max: number; label: string }>>;
}

// ─── Agent prompt fragments ──────────────────────────────────────────────────

export interface AgentPromptFragments {
  domainContext: string;       // fed to triage + coach system prompts
  domainNoun: string;          // "body debt" | "match-readiness debt"
  playerNoun: string;          // "person" | "player"
  recoveryNoun: string;        // "recovery" | "return-to-play"
  verdictPrefix?: string;      // optional domain-specific verdict language
}

// ─── UI vocabulary ───────────────────────────────────────────────────────────

export interface UIVocabulary {
  appName: string;             // "Body Debt" | "Match Fit"
  scoreLabel: string;          // "Debt Score" | "Match-Readiness Score"
  recoveryLabel: string;       // "Recovery" | "Return-to-Play"
  prescriptionLabel: string;   // "Prescription" | "Match-Day Protocol"
  scheduleLabel: string;       // "Recovery Schedule" | "Match-Day Schedule"
  verdictLabel: string;        // "Verdict" | "Manager's Verdict"
  systemLabel: string;         // "Recovery by system" | "Squad medical by system"
  counterfactualLabel: string; // "What would change this" | "What would change this"
  edgeAiBadge: string;         // "Edge AI" | "Edge AI"
  personaLabel: string;        // "Body Debt" | "Match Fit"
  tagline: string;             // shown on opening screen
}

// ─── Full context config ─────────────────────────────────────────────────────

export interface RecoveryContextConfig {
  mode: RecoveryMode;
  scoringWeights: ScoringWeights;
  agentPrompts: AgentPromptFragments;
  vocabulary: UIVocabulary;
  supportsSquad: boolean;
  theme: {
    primary: string;           // hex or tailwind class
    accent: string;
    bgGradient: string;
  };
}
