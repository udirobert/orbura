import type { StressorDef } from "./types";

// ─── Stressor definitions (single source of truth) ───────────────────────────

export const STRESSORS: StressorDef[] = [
  {
    type: "alcohol", label: "Drank", sublabel: "Any amount, any type", icon: "🍺", basePoints: 32,
    expansions: [
      { field: "alcoholType", question: "What?", options: [
        { key: "beer", label: "Beer" },
        { key: "red_wine", label: "Red wine" },
        { key: "white_wine", label: "White wine" },
        { key: "spirits", label: "Spirits" },
        { key: "cocktails", label: "Cocktails" },
        { key: "champagne", label: "Champagne" },
      ]},
      { field: "alcoholCount", question: "How many?", options: [
        { key: "1-2", label: "1-2" },
        { key: "3-4", label: "3-4" },
        { key: "5+", label: "5+" },
        { key: "lost_count", label: "Lost count" },
      ]},
    ],
  },
  {
    type: "training", label: "Trained", sublabel: "Gym, sport, intense activity", icon: "💪", basePoints: 18,
    expansions: [
      { field: "trainingArea", question: "What?", options: [
        { key: "legs", label: "Legs" },
        { key: "upper", label: "Upper body" },
        { key: "cardio", label: "Cardio" },
        { key: "hiit", label: "HIIT" },
        { key: "full_body", label: "Full body" },
        { key: "mobility", label: "Mobility" },
      ]},
      { field: "trainingIntensity", question: "Intensity?", options: [
        { key: "easy", label: "Easy" },
        { key: "hard", label: "Hard" },
        { key: "destroyed", label: "Destroyed me" },
      ]},
    ],
  },
  {
    type: "sleep", label: "Slept badly", sublabel: "Under 7 hours or broken", icon: "😴", basePoints: 24,
    expansions: [
      { field: "sleepHours", question: "How many hours?", options: [
        { key: "under_4", label: "Under 4" },
        { key: "4-6", label: "4-6" },
        { key: "6-7", label: "6-7" },
      ]},
    ],
  },
  {
    type: "stress", label: "High stress", sublabel: "Work, anxiety, hard decisions", icon: "😤", basePoints: 14,
    expansions: [
      { field: "stressCarried", question: "Still carrying it?", options: [
        { key: "yes", label: "Yes" },
        { key: "mostly_gone", label: "Mostly gone" },
      ]},
    ],
  },
  {
    type: "ill", label: "Feeling ill", sublabel: "Cold, flu, or just off", icon: "🤒", basePoints: 35,
    expansions: [
      { field: "illSeverity", question: "How bad?", options: [
        { key: "mild", label: "Mild" },
        { key: "moderate", label: "Moderate" },
        { key: "floored", label: "Floored" },
      ]},
    ],
  },
  {
    type: "care", label: "Took care of myself", sublabel: "Good sleep, no drinks, low stress", icon: "✦", basePoints: -10,
  },

  // ─── Football-only stressors ────────────────────────────────────────────────

  {
    type: "match_minutes",
    label: "Match minutes",
    sublabel: "Last 90 — full game or sub appearance",
    icon: "⚽",
    basePoints: 22,
    modes: ["football"],
    expansions: [
      { field: "matchMinutesPlayed", question: "How many minutes?", options: [
        { key: "under_30",  label: "Under 30" },
        { key: "30-60",     label: "30–60" },
        { key: "60-90",     label: "60–90" },
        { key: "extra_time",label: "Extra time" },
      ]},
    ],
  },
  {
    type: "card_stress",
    label: "Card / foul stress",
    sublabel: "Yellow, red, or heavy foul from last match",
    icon: "🟨",
    basePoints: 12,
    modes: ["football"],
    expansions: [
      { field: "cardType", question: "What happened?", options: [
        { key: "yellow",     label: "Yellow card" },
        { key: "heavy_foul", label: "Heavy foul" },
        { key: "red",        label: "Red card" },
      ]},
    ],
  },
  {
    type: "travel_timezone",
    label: "Travel fatigue",
    sublabel: "Timezone shift from away fixture",
    icon: "✈️",
    basePoints: 15,
    modes: ["football"],
    expansions: [
      { field: "timezoneDelta", question: "Time difference?", options: [
        { key: "1-2", label: "1–2 hours" },
        { key: "3-5", label: "3–5 hours" },
        { key: "6+",  label: "6+ hours" },
      ]},
    ],
  },
  {
    type: "concussion_check",
    label: "Head impact",
    sublabel: "Knock to the head — protocol check",
    icon: "🤕",
    basePoints: 38,
    modes: ["football"],
    expansions: [
      { field: "concussionSeverity", question: "Severity?", options: [
        { key: "minor",    label: "Minor knock" },
        { key: "moderate", label: "Moderate impact" },
        { key: "protocol", label: "Concussion protocol" },
      ]},
    ],
  },
];

// ─── Acknowledgement copy ────────────────────────────────────────────────────

export const ACK_COPY: Record<string, string> = {
  beer:        "Beer registered. Gut system flagged.",
  red_wine:    "Red wine noted. Adjusting histamine load.",
  white_wine:  "White wine logged. Moderate liver load.",
  spirits:     "Spirits — liver timeline extending.",
  cocktails:   "Cocktails — brain and blood sugar debt added.",
  champagne:   "Champagne registered. Gut carbonation noted.",
  "1-2":       "Light volume. Adjusting downward.",
  "3-4":       "Moderate volume confirmed.",
  "5+":        "High volume. All systems weighted.",
  lost_count:  "High debt. Confidence reduced.",
  legs:        "Leg day logged. CNS recovery added.",
  upper:       "Upper body logged. Moderate CNS load.",
  cardio:      "Cardio session. Heart rate recovery flagged.",
  hiit:        "HIIT logged. Cardiovascular and CNS both loaded.",
  full_body:   "Full body session. Heavy CNS debt added.",
  mobility:    "Mobility session — reducing your debt.",
  easy:        "Easy intensity. Low systemic load.",
  hard:        "Hard session noted. Recovery window extends.",
  destroyed:   "Maximal effort — full CNS debt applied.",
  under_4:     "Under 4hrs. Severe cognitive and gut debt.",
  "4-6":       "4-6hrs sleep. Meaningful cognitive load.",
  "6-7":       "6-7hrs. Mild sleep debt added.",
  yes:         "Stress still active. Cortisol remains elevated.",
  mostly_gone: "Stress mostly resolved. Minor residual load.",
  mild:        "Mild illness. Immune load added.",
  moderate:    "Moderate illness. Significant system load.",
  floored:     "Significant illness — high debt across all systems.",
  alcohol:     "Alcohol logged. Liver and brain systems weighted.",
  sleep:       "Poor sleep noted. Cognition debt added.",
  training:    "Training logged. Awaiting intensity detail.",
  stress:      "High stress registered. Brain load adjusted.",
  ill:         "Illness logged. Immune debt added.",
  care:        "Self-care logged. Reducing your total debt.",

  // Football stressors
  match_minutes:    "Match load logged. Muscular and cardiovascular debt weighted.",
  card_stress:      "Card / foul stress recorded. Cortisol and mental load elevated.",
  travel_timezone:  "Timezone shift noted. Circadian disruption active.",
  concussion_check: "Head impact registered. Concussion protocol applies — brain is priority.",
  under_30:         "Sub appearance. Lower match-load recovery needed.",
  "30-60":          "Mid-match load. Muscular and CNS debt moderate.",
  "60-90":          "Full match. High muscular and cardiovascular debt applied.",
  extra_time:       "Extra time logged. Severe match-load debt across all systems.",
  yellow:           "Yellow card noted. Mental load and cortisol elevated.",
  heavy_foul:       "Heavy foul logged. Recovery window extended.",
  red:              "Red card — significant psychological and cardiovascular load.",
  // "1-2" / "3-5" / "6+" already cover alcohol count, so we reuse them for the
  // football timezone delta. ACK_COPY is keyed by the literal option string,
  // so context-specific entries would collide.
  minor:            "Minor head impact. Monitoring, no protocol yet.",
  concussion_moderate: "Moderate impact — medical review required before return-to-play.",
  protocol:         "Concussion protocol activated. Medical clearance required to return.",
};

// ─── Confidence tiers ────────────────────────────────────────────────────────

export const CONFIDENCE_CONFIG = [
  { tier: "estimated",  dot: "\u25D0", label: "Estimated",       color: "var(--color-text-faint)" },
  { tier: "partial",    dot: "\u25D1", label: "Partial picture", color: "var(--color-text-secondary)" },
  { tier: "good",       dot: "\u25D5", label: "Good read",       color: "var(--color-states-warning)" },
  { tier: "accurate",   dot: "\u25CF", label: "Accurate",        color: "var(--color-brand-primary)" },
  { tier: "precise",    dot: "\u25CF", label: "Precise",         color: "var(--color-states-success)" },
] as const;
