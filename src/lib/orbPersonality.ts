/**
 * Orb personality system.
 *
 * Four distinct voice modes that change how the orb communicates
 * throughout the app. Stored in localStorage so it persists between sessions.
 *
 * Modes:
 *   honest      — Direct. Knowledgeable. No fluff. (default)
 *   gentle      — Warmer. Supportive. Still honest.
 *   scientific  — Data-driven. Cites mechanisms. Clinical but accessible.
 *   sarcastic   — Dry wit. Calls you out. Still useful.
 */

export type OrbPersonality = "honest" | "gentle" | "scientific" | "sarcastic";

export interface PersonalityConfig {
  id: OrbPersonality;
  label: string;
  tagline: string;
  emoji: string;
  verdictPrefix: string;  // prepended to verdict for flavour
}

export const PERSONALITIES: PersonalityConfig[] = [
  {
    id: "honest",
    label: "Honest friend",
    tagline: "Tells you what you need to hear. No padding.",
    emoji: "🎯",
    verdictPrefix: "",
  },
  {
    id: "gentle",
    label: "Supportive coach",
    tagline: "Acknowledges the effort. Still holds the line.",
    emoji: "🌿",
    verdictPrefix: "You're doing okay — ",
  },
  {
    id: "scientific",
    label: "Data analyst",
    tagline: "Explains the physiology. No assumptions.",
    emoji: "🔬",
    verdictPrefix: "Biometrically speaking — ",
  },
  {
    id: "sarcastic",
    label: "Brutally honest",
    tagline: "Won't sugarcoat it. Still has your back.",
    emoji: "💀",
    verdictPrefix: "Surprise — ",
  },
];

// ─── Copy variants per personality ───────────────────────────────────────────

export interface OrbCopy {
  scanPrompt: string;
  scanObserving: string;
  recoveryTagline: string;
  prescriptionHeader: string;
  lowDebt: string;
  highDebt: string;
  reminderPrompt: string;
}

const COPY: Record<OrbPersonality, OrbCopy> = {
  honest: {
    scanPrompt:          "A quick face check estimates stress — in this browser.",
    scanObserving:       "I'm seeing something.",
    recoveryTagline:     "Your body is working to clear this.",
    prescriptionHeader:  "The Prescription",
    lowDebt:             "Your body is clear. Don't waste it.",
    highDebt:            "You put your body through a lot. It's paying for it now.",
    reminderPrompt:      "Want me to remind you?",
  },
  gentle: {
    scanPrompt:          "A short in-browser face check can sharpen your score.",
    scanObserving:       "I notice a few things.",
    recoveryTagline:     "Your body knows how to recover. Give it time.",
    prescriptionHeader:  "What will help today",
    lowDebt:             "Nice work. Your body feels the difference.",
    highDebt:            "It's been a tough one. Let's help you recover well.",
    reminderPrompt:      "Want a few gentle nudges throughout the day?",
  },
  scientific: {
    scanPrompt:          "Optional facial biomarkers — processed entirely in this browser.",
    scanObserving:       "Physiological markers detected.",
    recoveryTagline:     "Homeostatic recovery is in progress.",
    prescriptionHeader:  "Recovery Protocol",
    lowDebt:             "HRV and perfusion markers indicate optimal baseline.",
    highDebt:            "Elevated cortisol and reduced HRV indicate significant systemic load.",
    reminderPrompt:      "Schedule timed recovery interventions?",
  },
  sarcastic: {
    scanPrompt:          "Optional: let your face confess what last night cost.",
    scanObserving:       "Oh. That's something.",
    recoveryTagline:     "Your choices have consequences. Here they are.",
    prescriptionHeader:  "Damage Control",
    lowDebt:             "Look at you. An actual functioning human today.",
    highDebt:            "Well. You really committed to that decision.",
    reminderPrompt:      "Want me to stop you from making it worse?",
  },
};

export function getOrbCopy(personality: OrbPersonality): OrbCopy {
  return COPY[personality];
}

export function getPersonality(id: OrbPersonality): PersonalityConfig {
  return PERSONALITIES.find(p => p.id === id) ?? PERSONALITIES[0];
}
