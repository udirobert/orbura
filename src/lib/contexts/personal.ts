import type { RecoveryContextConfig } from "./types";

export const personalContext: RecoveryContextConfig = {
  mode: "personal",
  scoringWeights: {
    baseWeights: {
      alcohol:  { min: 25, max: 35, label: "Alcohol" },
      sleep:    { min: 18, max: 28, label: "Poor sleep" },
      training: { min: 12, max: 22, label: "Hard training" },
      stress:   { min: 10, max: 18, label: "High stress" },
      ill:      { min: 20, max: 30, label: "Illness" },
      care:     { min: -12, max: -6, label: "Self-care" },
    },
  },
  agentPrompts: {
    domainContext: "A person's body has physiological stress from poor sleep, alcohol, training, or illness. This is NOT financial debt — it is body health debt.",
    domainNoun: "body debt",
    playerNoun: "person",
    recoveryNoun: "recovery",
  },
  vocabulary: {
    appName: "Body Debt",
    scoreLabel: "Debt Score",
    recoveryLabel: "Recovery",
    prescriptionLabel: "Prescription",
    scheduleLabel: "Recovery Schedule",
    verdictLabel: "Verdict",
    systemLabel: "Recovery by system",
    counterfactualLabel: "What would change this",
    edgeAiBadge: "Self-hosted AI",
    personaLabel: "Body Debt",
    tagline: "Your body is talking. Are you listening?",
  },
  supportsSquad: false,
  theme: {
    primary: "bg-emerald-500",
    accent: "text-emerald-400",
    bgGradient: "from-slate-950 via-slate-900 to-emerald-950",
  },
};
