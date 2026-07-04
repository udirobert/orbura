/**
 * Five-system recovery scoring engine.
 *
 * Pure deterministic functions — no AI calls, no external deps.
 * Called from /api/analyze/score and merged into the AI response.
 *
 * Systems: cardiovascular · brain/cognition · liver · muscular/CNS · gut
 */

import type { Stressor, SystemScore, RecoverySystem } from "@/lib/types";
import { STRESSORS } from "./catalog";
import type { CounterfactualResult } from "./types";

// ─── System metadata ──────────────────────────────────────────────────────────

const SYSTEM_META: Record<RecoverySystem, { label: string; icon: string; baseWindowHrs: number }> = {
  cardiovascular: { label: "Cardiovascular",  icon: "🫀", baseWindowHrs: 18 },
  brain:          { label: "Brain / Cognition", icon: "🧠", baseWindowHrs: 24 },
  liver:          { label: "Liver",            icon: "🫁", baseWindowHrs: 30 },
  muscular:       { label: "Muscular / CNS",   icon: "💪", baseWindowHrs: 48 },
  gut:            { label: "Gut",              icon: "🦠", baseWindowHrs: 36 },
};

// ─── Drink type modifiers ────────────────────────────────────────────────────

const DRINK_TYPE_MOD: Record<string, { liver: number; brain: number; gut: number; cardio: number }> = {
  beer:       { liver: 0.8, brain: 0.4, gut: 1.3, cardio: 0.7 },
  red_wine:   { liver: 1.0, brain: 0.8, gut: 0.9, cardio: 0.8 },
  white_wine: { liver: 1.0, brain: 0.7, gut: 0.8, cardio: 0.7 },
  spirits:    { liver: 1.4, brain: 1.3, gut: 1.0, cardio: 1.1 },
  cocktails:  { liver: 1.3, brain: 1.4, gut: 1.2, cardio: 1.0 },
  champagne:  { liver: 0.9, brain: 0.6, gut: 1.0, cardio: 0.7 },
};

const DRINK_COUNT_MOD: Record<string, number> = {
  "1-2":       0.5,
  "3-4":       0.8,
  "5+":        1.0,
  "lost_count": 1.2,
};

const TRAINING_CNS: Record<string, number> = {
  legs:      1.0,
  full_body: 1.0,
  hiit:      0.8,
  cardio:    0.6,
  upper:     0.5,
  mobility:  -0.5,
};

const TRAINING_CARDIO: Record<string, number> = {
  hiit:      1.0,
  cardio:    0.9,
  legs:      0.6,
  full_body: 0.7,
  upper:     0.3,
  mobility:  -0.3,
};

const INTENSITY_MOD: Record<string, number> = {
  easy:       0.4,
  hard:       0.85,
  destroyed:  1.2,
};

const SLEEP_BRAIN: Record<string, number> = {
  under_4: 1.0,
  "4-6":   0.75,
  "6-7":   0.40,
};

// ─── Football-specific modifiers ─────────────────────────────────────────────

const MATCH_MINUTES_CNS: Record<string, number> = {
  under_30:  0.3,
  "30-60":   0.6,
  "60-90":   0.9,
  extra_time: 1.2,
};

const MATCH_MINUTES_CARDIO: Record<string, number> = {
  under_30:  0.4,
  "30-60":   0.7,
  "60-90":   1.0,
  extra_time: 1.3,
};

const CARD_STRESS_BRAIN: Record<string, number> = {
  yellow:      0.4,
  red:         1.0,
  heavy_foul:  0.7,
};

const TIMEZONE_DELTA: Record<string, { brain: number; cardio: number; gut: number }> = {
  "1-2": { brain: 8,  cardio: 5,  gut: 3 },
  "3-5": { brain: 18, cardio: 10, gut: 8 },
  "6+":  { brain: 30, cardio: 18, gut: 15 },
};

const CONCUSSION_BRAIN: Record<string, number> = {
  minor:     0.8,
  moderate:  1.0,
  protocol:  1.5,
};

// ─── Main engine ──────────────────────────────────────────────────────────────

export function computeSystemScores(
  stressors: Stressor[],
  now: Date,
  wakeTime?: string | null,
  bedTime?: string | null
): SystemScore[] {
  const raw: Record<RecoverySystem, number> = {
    cardiovascular: 0,
    brain:          0,
    liver:          0,
    muscular:       0,
    gut:            0,
  };

  // Track which systems were touched by stressor data.
  // A system with hasData=false is "unknown" — we have no measurements
  // for it, not "clear". This prevents false "✓ Clear" claims.
  const touched: Record<RecoverySystem, boolean> = {
    cardiovascular: false,
    brain:          false,
    liver:          false,
    muscular:       false,
    gut:            false,
  };

  for (const s of stressors) {
    if (s.type === "alcohol") {
      const drinkMod  = DRINK_TYPE_MOD[s.alcoholType ?? "beer"] ?? DRINK_TYPE_MOD.beer;
      const countMod  = DRINK_COUNT_MOD[s.alcoholCount ?? "3-4"] ?? 0.8;
      const base      = 30;

      raw.liver          += base * drinkMod.liver  * countMod;
      raw.brain          += base * drinkMod.brain  * countMod;
      raw.gut            += base * drinkMod.gut    * countMod;
      raw.cardiovascular += base * drinkMod.cardio * countMod * 0.5;
      touched.liver = touched.brain = touched.gut = touched.cardiovascular = true;
    }

    if (s.type === "training") {
      const area      = s.trainingArea     ?? "full_body";
      const intensity = s.trainingIntensity ?? "hard";
      const cns    = (TRAINING_CNS[area]    ?? 0.5) * (INTENSITY_MOD[intensity] ?? 0.85);
      const cardio = (TRAINING_CARDIO[area] ?? 0.5) * (INTENSITY_MOD[intensity] ?? 0.85);

      raw.muscular       += 40 * cns;
      raw.cardiovascular += 35 * cardio;
      touched.muscular = touched.cardiovascular = true;
    }

    if (s.type === "sleep") {
      const brainHit = SLEEP_BRAIN[s.sleepHours ?? "4-6"] ?? 0.75;
      raw.brain += 35 * brainHit;
      raw.gut   += 15 * brainHit;
      touched.brain = touched.gut = true;
    }

    if (s.type === "stress") {
      const carried = s.stressCarried !== "mostly_gone";
      raw.brain          += carried ? 28 : 14;
      raw.cardiovascular += carried ? 15 : 7;
      touched.brain = touched.cardiovascular = true;
    }

    if (s.type === "ill") {
      const sevMod = s.illSeverity === "floored" ? 1.2 : s.illSeverity === "mild" ? 0.6 : 0.9;
      raw.gut            += 30 * sevMod;
      raw.brain          += 20 * sevMod;
      raw.muscular       += 15 * sevMod;
      raw.cardiovascular += 12 * sevMod;
      touched.gut = touched.brain = touched.muscular = touched.cardiovascular = true;
    }

    if (s.type === "care") {
      raw.brain          -= 8;
      raw.cardiovascular -= 8;
      raw.liver          -= 5;
      raw.muscular       -= 5;
      raw.gut            -= 5;
      touched.brain = touched.cardiovascular = touched.liver = touched.muscular = touched.gut = true;
    }

    if (s.type === "match_minutes") {
      const mins = s.matchMinutesPlayed ?? "60-90";
      const cns    = MATCH_MINUTES_CNS[mins]    ?? 0.9;
      const cardio = MATCH_MINUTES_CARDIO[mins] ?? 1.0;

      raw.muscular       += 35 * cns;
      raw.cardiovascular += 30 * cardio;
      touched.muscular = touched.cardiovascular = true;
    }

    if (s.type === "card_stress") {
      const brainHit = CARD_STRESS_BRAIN[s.cardType ?? "yellow"] ?? 0.4;
      raw.brain          += 20 * brainHit;
      raw.cardiovascular += 10 * brainHit;
      touched.brain = touched.cardiovascular = true;
    }

    if (s.type === "travel_timezone") {
      const tz = TIMEZONE_DELTA[s.timezoneDelta ?? "3-5"] ?? TIMEZONE_DELTA["3-5"];
      raw.brain          += tz.brain;
      raw.cardiovascular += tz.cardio;
      raw.gut            += tz.gut;
      touched.brain = touched.cardiovascular = touched.gut = true;
    }

    if (s.type === "concussion_check") {
      const brainHit = CONCUSSION_BRAIN[s.concussionSeverity ?? "minor"] ?? 0.8;
      raw.brain += 50 * brainHit;
      touched.brain = true;
    }
  }

  if (bedTime && wakeTime) {
    const penalty = circadianPenaltyBrain(bedTime, wakeTime);
    raw.brain          += penalty.brainPts;
    raw.cardiovascular += penalty.cardioPts;
    if (penalty.brainPts > 0) touched.brain = true;
    if (penalty.cardioPts > 0) touched.cardiovascular = true;
  }

  return (Object.keys(SYSTEM_META) as RecoverySystem[]).map((system) => {
    const meta  = SYSTEM_META[system];
    const score = Math.max(0, Math.min(100, Math.round(raw[system])));
    const recoveryHrs = (score / 100) * meta.baseWindowHrs;
    const clearedAt = new Date(now.getTime() + recoveryHrs * 3600000).toISOString();

    return {
      system,
      label:        meta.label,
      icon:         meta.icon,
      score,
      clearedAt,
      hasData:      touched[system],
      causeText:    buildCauseText(system, stressors, touched[system]),
      actionText:   buildActionText(system, stressors, touched[system]),
      scienceFact:  SCIENCE[system]?.fact,
      scienceCite:  SCIENCE[system]?.cite,
    };
  });
}

// ─── Science citations ────────────────────────────────────────────────────────

const SCIENCE: Partial<Record<RecoverySystem, { fact: string; cite: string }>> = {
  liver: {
    fact: "The liver metabolises approximately one standard drink per hour. Processing speed cannot be accelerated by sleep, coffee, or exercise.",
    cite: "Lieber, Physiological Reviews, 1997",
  },
  muscular: {
    fact: "Alcohol consumed within 24 hours of resistance training reduces muscle protein synthesis by up to 37%, even when protein intake is maintained.",
    cite: "Parr et al., PLOS ONE, 2014",
  },
  gut: {
    fact: "A single episode of heavy drinking alters gut microbiome composition within 24 hours, increasing intestinal permeability and systemic inflammation.",
    cite: "Bishehsari et al., Alcohol Research, 2017",
  },
  brain: {
    fact: "Sleep deprivation of even one night impairs prefrontal cortex function equivalently to 0.08% blood alcohol concentration.",
    cite: "Harrison & Horne, Journal of Sleep Research, 2000",
  },
  cardiovascular: {
    fact: "Resting heart rate remains elevated for 12–24 hours after alcohol consumption as the autonomic nervous system works to restore balance.",
    cite: "Spaak et al., Journal of the American College of Cardiology, 2008",
  },
};

function buildCauseText(system: RecoverySystem, stressors: Stressor[], hasData: boolean): string {
  if (!hasData) return "Not assessed — no data for this system";

  const alcohol  = stressors.find((s) => s.type === "alcohol");
  const training = stressors.find((s) => s.type === "training");
  const sleep    = stressors.find((s) => s.type === "sleep");
  const stress   = stressors.find((s) => s.type === "stress");
  const ill      = stressors.find((s) => s.type === "ill");
  const match    = stressors.find((s) => s.type === "match_minutes");
  const card     = stressors.find((s) => s.type === "card_stress");
  const travel   = stressors.find((s) => s.type === "travel_timezone");
  const concussion = stressors.find((s) => s.type === "concussion_check");

  switch (system) {
    case "liver":
      if (alcohol) {
        const type  = alcohol.alcoholType  ? alcohol.alcoholType.replace("_", " ")  : "alcohol";
        const count = alcohol.alcoholCount ?? "several drinks";
        return `${capitalize(type)} — ${count} units to process`;
      }
      return "No significant liver load";

    case "brain":
      if (concussion) return `Head impact — ${concussion.concussionSeverity ?? "minor"} severity. Concussion protocol applies.`;
      if (alcohol?.alcoholType === "spirits" || alcohol?.alcoholType === "cocktails")
        return "Spirits/cocktails hit cognition hardest. Decision quality reduced.";
      if (card) return `${card.cardType ?? "Yellow"} card stress — cortisol and mental load elevated`;
      if (travel) return `${travel.timezoneDelta ?? "3-5"}h timezone shift — circadian disruption active`;
      if (sleep) return `${sleep.sleepHours?.replace("_", " ") ?? "Poor sleep"} — cognitive recovery in progress`;
      if (stress?.stressCarried !== "mostly_gone") return "Stress hormones still elevated. Focus window reduced.";
      return "Mild cognitive load from last night";

    case "cardiovascular":
      if (match) return `${match.matchMinutesPlayed ?? "60-90"} match minutes — cardiovascular load from match`;
      if (training?.trainingArea === "hiit" || training?.trainingArea === "cardio")
        return `${capitalize(training.trainingArea)} session — heart rate recovery active`;
      if (travel) return `${travel.timezoneDelta ?? "3-5"}h timezone shift — autonomic rhythm disrupted`;
      if (alcohol) return "Alcohol elevates resting HR for 12–18hrs";
      return "Mild cardiovascular load";

    case "muscular":
      if (match) {
        const mins = match.matchMinutesPlayed ?? "60-90";
        return `${mins} match minutes — muscular and CNS load from sprinting, tackling, and changes of direction`;
      }
      if (training) {
        const area      = training.trainingArea      ? capitalize(training.trainingArea.replace("_", " ")) : "Training";
        const intensity = training.trainingIntensity ?? "hard";
        return `${area} session at ${intensity} intensity — CNS repair ongoing`;
      }
      return "No significant muscular load";

    case "gut":
      if (alcohol?.alcoholType === "beer") return "Beer — carbonation and fermentation byproducts affecting gut";
      if (alcohol?.alcoholType === "cocktails") return "Cocktail mixers adding fructose and gut load";
      if (sleep) return "Poor sleep disrupts gut microbiome rhythm";
      if (ill) return "Illness affecting gut barrier function";
      return "Minimal gut load";
  }
}

function buildActionText(system: RecoverySystem, stressors: Stressor[], hasData: boolean): string {
  if (!hasData) return "Log relevant stressors or connect a wearable to assess this system.";

  const alcohol  = stressors.find((s) => s.type === "alcohol");
  const training = stressors.find((s) => s.type === "training");
  const match    = stressors.find((s) => s.type === "match_minutes");
  const concussion = stressors.find((s) => s.type === "concussion_check");
  const travel   = stressors.find((s) => s.type === "travel_timezone");

  switch (system) {
    case "liver":
      return alcohol
        ? "Avoid further alcohol. 500ml water + electrolytes now."
        : "Liver clear — no action needed.";
    case "brain":
      if (concussion) return "Concussion protocol. No training, no screens. Medical clearance required.";
      if (travel) return "Natural light exposure to reset circadian rhythm. No screens after 10pm.";
      return "No decisions requiring deep focus until your window opens.";
    case "cardiovascular":
      if (match?.matchMinutesPlayed === "extra_time" || match?.matchMinutesPlayed === "60-90")
        return "No cardio today. Walk only. Heart rate recovery still active.";
      return training?.trainingIntensity === "destroyed"
        ? "No cardio today. Walk only."
        : "Keep activity light until cleared.";
    case "muscular":
      if (match) return "Protein within 2 hrs. No re-training. Match load recovery ongoing.";
      return training
        ? "Protein within 2 hrs. No re-training the same group today."
        : "No significant muscular debt.";
    case "gut":
      return alcohol
        ? "Bland foods, no coffee on an empty stomach, no more alcohol."
        : "Probiotic-rich foods will help speed gut clearance.";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Clearance time formatter ─────────────────────────────────────────────────

export function formatClearanceTime(isoString: string): string {
  const cleared = new Date(isoString);
  const now = new Date();
  const diffMs = cleared.getTime() - now.getTime();
  const diffHrs = diffMs / 3600000;

  if (diffHrs <= 0) return "Cleared now";

  const h = cleared.getHours();
  const m = cleared.getMinutes();
  const period = h >= 12 ? "pm" : "am";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const timeStr = `${h12}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${period}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday = cleared.toDateString() === now.toDateString();
  const isTomorrow = cleared.toDateString() === tomorrow.toDateString();

  if (isToday) return `${timeStr} today`;
  if (isTomorrow) return `${timeStr} tomorrow`;
  const days = Math.round(diffHrs / 24);
  return `${timeStr} in ${days} ${days === 1 ? "day" : "days"}`;
}

// ─── Circadian alignment ──────────────────────────────────────────────────────

function parseHourOfDay(timeStr: string): number | null {
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h + m / 60;
}

/**
 * Brain + cardiovascular debt from circadian misalignment.
 *
 *  Bedtime before midnight       → aligned       → 0 pts
 *  Bedtime 12am–2am              → mild mismatch → +10 brain, +5 cardio
 *  Bedtime 2am–4am               → significant   → +22 brain, +10 cardio
 *  Bedtime after 4am             → severe        → +32 brain, +16 cardio
 *
 * Adds an extra brain debt stack when total sleep is under 6 hrs regardless
 * of bed timing (4 pts per missing hour).
 */
export function circadianPenaltyBrain(
  bedTime: string,
  wakeTime: string
): { brainPts: number; cardioPts: number; label: string } {
  const bed  = parseHourOfDay(bedTime);
  const wake = parseHourOfDay(wakeTime);

  if (bed === null || wake === null) {
    return { brainPts: 0, cardioPts: 0, label: "unknown" };
  }

  const sleepHrs = bed > wake ? (24 - bed) + wake : wake - bed;

  let brainPts  = 0;
  let cardioPts = 0;
  let label     = "aligned";

  if (bed >= 0 && bed < 2) {
    brainPts  = 10; cardioPts = 5;  label = "mild misalignment";
  } else if (bed >= 2 && bed < 4) {
    brainPts  = 22; cardioPts = 10; label = "significant misalignment";
  } else if (bed >= 4 && bed < 6) {
    brainPts  = 32; cardioPts = 16; label = "severe misalignment";
  }

  if (sleepHrs > 0 && sleepHrs < 6) {
    brainPts += Math.round((6 - sleepHrs) * 4);
  }

  return { brainPts, cardioPts, label };
}

// ─── Counterfactual engine ───────────────────────────────────────────────────

const COUNTERFACTUAL_FLIPS: Record<string, { field: keyof Stressor; fromTo: Record<string, string>; label: string }> = {
  sleep:             { field: "sleepHours",          fromTo: { under_4: "6-7", "4-6": "6-7", "6-7": "6-7" }, label: "slept 7+ hours" },
  training:          { field: "trainingIntensity",    fromTo: { destroyed: "easy", hard: "easy", easy: "easy" }, label: "trained easy instead of hard" },
  alcohol:           { field: "alcoholCount",         fromTo: { lost_count: "1-2", "5+": "1-2", "3-4": "1-2", "1-2": "1-2" }, label: "kept it to 1-2 drinks" },
  stress:            { field: "stressCarried",        fromTo: { yes: "mostly_gone", mostly_gone: "mostly_gone" }, label: "let the stress clear" },
  ill:               { field: "illSeverity",          fromTo: { floored: "mild", moderate: "mild", mild: "mild" }, label: "caught the illness earlier" },
  match_minutes:     { field: "matchMinutesPlayed",   fromTo: { extra_time: "under_30", "60-90": "under_30", "30-60": "under_30", under_30: "under_30" }, label: "played fewer match minutes" },
  card_stress:       { field: "cardType",             fromTo: { red: "yellow", heavy_foul: "yellow", yellow: "yellow" }, label: "avoided the card or heavy foul" },
  travel_timezone:   { field: "timezoneDelta",        fromTo: { "6+": "1-2", "3-5": "1-2", "1-2": "1-2" }, label: "arrived earlier to adjust to the timezone" },
  concussion_check:  { field: "concussionSeverity",   fromTo: { protocol: "minor", moderate: "minor", minor: "minor" }, label: "avoided the head impact" },
};

const SYSTEM_LABEL_NICE: Record<RecoverySystem, string> = {
  cardiovascular: "Cardiovascular",
  brain: "Brain",
  liver: "Liver",
  muscular: "Muscular / CNS",
  gut: "Gut",
};

export type { CounterfactualResult } from "./types";

export function computeCounterfactual(
  stressors: Stressor[],
  currentSystemScores: SystemScore[],
  wakeTime?: string | null,
  bedTime?: string | null,
): CounterfactualResult | null {
  const ranked = [...currentSystemScores].sort((a, b) => b.score - a.score);
  const target = ranked.find((s) => s.score > 20);
  if (!target) return null;

  let best: CounterfactualResult | null = null;

  for (const s of stressors) {
    const flip = COUNTERFACTUAL_FLIPS[s.type];
    if (!flip) continue;

    const field = flip.field;
    const currentVal = s[field] as string | undefined;
    if (!currentVal) continue;

    const targetVal = flip.fromTo[currentVal];
    if (!targetVal || targetVal === currentVal) continue;

    const modified: Stressor[] = stressors.map((s2) =>
      s2 === s ? { ...s2, [field]: targetVal } : s2
    );

    const newScores = computeSystemScores(modified, new Date(), wakeTime, bedTime);
    const newTarget = newScores.find((x) => x.system === target.system);
    if (!newTarget) continue;

    const drop = target.score - newTarget.score;
    if (drop <= 0) continue;

    const candidate: CounterfactualResult = {
      system: target.system,
      systemLabel: SYSTEM_LABEL_NICE[target.system] ?? target.system,
      fromScore: target.score,
      toScore: newTarget.score,
      drop,
      leverLabel: flip.label,
    };

    if (!best || candidate.drop > best.drop) {
      best = candidate;
    }
  }

  return best;
}

// ─── Live score (intake-time) ────────────────────────────────────────────────

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
