import type { Stressor, StressorType } from "@/lib/types";

// ─── Stressor config types ──────────────────────────────────────────────────

export interface SubOption {
  key: string;
  label: string;
}

export interface StressorDef {
  type: StressorType;
  label: string;
  sublabel: string;
  icon: string;
  basePoints: number;
  expansions?: {
    field: keyof Stressor;
    question: string;
    options: SubOption[];
  }[];
}

// ─── Stressor definitions ────────────────────────────────────────────────────

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
};

// ─── Confidence tiers ────────────────────────────────────────────────────────

export const CONFIDENCE_CONFIG = [
  { tier: "estimated",  dot: "\u25D0", label: "Estimated",      color: "#524F4C" },
  { tier: "partial",    dot: "\u25D1", label: "Partial picture", color: "#A8A29E" },
  { tier: "good",       dot: "\u25D5", label: "Good read",       color: "#F59E0B" },
  { tier: "accurate",   dot: "\u25CF", label: "Accurate",        color: "#EA580C" },
  { tier: "precise",    dot: "\u25CF", label: "Precise",         color: "#4ADE80" },
] as const;

// ─── Live score computation ──────────────────────────────────────────────────

export function computeLiveScore(stressors: Stressor[]): number {
  let score = 0;
  for (const s of stressors) {
    const def = STRESSORS.find((d) => d.type === s.type);
    if (!def) continue;
    score += def.basePoints;
    if (s.type === "training" && s.trainingArea === "mobility") score -= def.basePoints * 1.5;
    if (s.type === "training" && s.trainingIntensity === "destroyed") score += 8;
    if (s.type === "alcohol" && s.alcoholType === "spirits") score += 6;
    if (s.type === "alcohol" && s.alcoholCount === "5+") score += 8;
    if (s.type === "alcohol" && s.alcoholCount === "lost_count") score += 12;
  }
  return Math.max(0, Math.min(100, score));
}
