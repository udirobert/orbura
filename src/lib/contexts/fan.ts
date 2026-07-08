import type { RecoveryContextConfig } from "./types";

/**
 * Fan context — emotional / mental recovery debt for football fans.
 *
 * Watching a match is a physiological event: a loss, a shootout, or a late
 * winner drives cortisol and adrenaline, elevates heart rate, and (for late
 * kickoffs) wrecks sleep. This context reframes the same five-system engine
 * around the fan's post-match state and an on-device wind-down coach.
 */
export const fanContext: RecoveryContextConfig = {
  mode: "fan",
  scoringWeights: {
    baseWeights: {
      result:        { min: 12, max: 34, label: "The result" },
      match_tension: { min: 8,  max: 26, label: "Match tension" },
      doomscroll:    { min: 6,  max: 16, label: "Post-match scroll" },
      sleep:         { min: 15, max: 25, label: "Late kickoff / poor sleep" },
      alcohol:       { min: 18, max: 30, label: "Match-day drinks" },
      care:          { min: -12, max: -6, label: "Wind-down / self-care" },
    },
  },
  agentPrompts: {
    domainContext:
      "This person is a football fan who just watched a match. Watching football causes real physiological stress — a loss, a penalty shootout, or a late winner drives cortisol and adrenaline, raises heart rate, and disrupts sleep, especially for late kickoffs. This is emotional and mental recovery debt from watching, NOT financial debt and NOT about playing. The score represents how much wind-down and emotional recovery the fan needs after the final whistle.",
    domainNoun: "post-match recovery debt",
    playerNoun: "fan",
    recoveryNoun: "wind-down",
    verdictPrefix: "Full-time:",
  },
  vocabulary: {
    appName: "Fan Recovery",
    scoreLabel: "Match Toll",
    recoveryLabel: "Wind-Down",
    prescriptionLabel: "Wind-Down Plan",
    scheduleLabel: "Tonight's Wind-Down",
    verdictLabel: "Full-Time Verdict",
    systemLabel: "How the match hit you",
    counterfactualLabel: "What would've helped",
    edgeAiBadge: "Edge AI",
    personaLabel: "Fan Recovery",
    tagline: "The final whistle hits your body too. Log the match, get a wind-down that works offline.",
  },
  supportsSquad: false,
  theme: {
    primary: "bg-rose-600",
    accent: "text-rose-400",
    bgGradient: "from-slate-950 via-slate-900 to-rose-950",
  },
};
