import type { RecoveryContextConfig } from "./types";

export const footballContext: RecoveryContextConfig = {
  mode: "football",
  scoringWeights: {
    baseWeights: {
      match_minutes:   { min: 15, max: 30, label: "Match load" },
      training:        { min: 10, max: 20, label: "Training load" },
      sleep:           { min: 15, max: 25, label: "Poor sleep" },
      alcohol:         { min: 20, max: 32, label: "Alcohol" },
      card_stress:     { min: 8,  max: 16, label: "Card / foul stress" },
      travel_timezone: { min: 10, max: 20, label: "Travel fatigue" },
      stress:          { min: 8,  max: 15, label: "Mental stress" },
      ill:             { min: 18, max: 28, label: "Illness" },
      concussion_check:{ min: 30, max: 45, label: "Head impact" },
      care:            { min: -12, max: -6, label: "Recovery day" },
    },
  },
  agentPrompts: {
    domainContext: "A football player has physiological stress from match minutes, training load, travel, poor sleep, alcohol, or head impact. This is about match-readiness and return-to-play, NOT financial debt. The score represents how much recovery the player needs before they are match-fit.",
    domainNoun: "match-readiness debt",
    playerNoun: "player",
    recoveryNoun: "return-to-play",
    verdictPrefix: "Manager's call:",
  },
  vocabulary: {
    appName: "Match Fit",
    scoreLabel: "Match-Readiness Score",
    recoveryLabel: "Return-to-Play",
    prescriptionLabel: "Match-Day Protocol",
    scheduleLabel: "Match-Day Schedule",
    verdictLabel: "Manager's Verdict",
    systemLabel: "Squad medical by system",
    counterfactualLabel: "What would change this",
    edgeAiBadge: "Edge AI",
    personaLabel: "Match Fit",
    tagline: "The on-device team doctor. No cloud, no API keys, works in the locker room.",
  },
  supportsSquad: true,
  theme: {
    primary: "bg-emerald-600",
    accent: "text-emerald-400",
    bgGradient: "from-slate-950 via-slate-900 to-emerald-950",
  },
};
