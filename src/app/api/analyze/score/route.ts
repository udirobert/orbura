import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeBodyRequest, HRVData, FaceAnalysisResult, StressorType, ConfidenceTier, SystemScore, RecoveryMode } from "@/lib/types";
import { computeSystemScores } from "@/stressors";
import { computeCounterfactual } from "@/stressors";
import { getStrings, type Locale } from "@/lib/i18n";
import { getContextConfig } from "@/lib/contexts";

/**
 * POST /api/analyze/score
 *
 * Layer 1 — Deterministic debt score.
 * Pure arithmetic from input weights. Zero AI calls. Always completes in <5ms.
 * This is the reliability anchor of the analysis pipeline.
 *
 * Returns: debtScore, stressorBreakdown, confidenceLevel, seed recoveryArc.
 * Guaranteed to return even if all AI layers are down.
 */
export async function POST(request: NextRequest) {
  let body: AnalyzeBodyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = computeScore(body);
  return NextResponse.json(result);
}

// ─── Stressor weight table ────────────────────────────────────────────────────

const BASE_WEIGHTS: Record<StressorType, { min: number; max: number; label: string }> = {
  alcohol:           { min: 25, max: 35, label: "Alcohol" },
  sleep:             { min: 18, max: 28, label: "Poor sleep" },
  training:          { min: 12, max: 22, label: "Hard training" },
  stress:            { min: 10, max: 18, label: "High stress" },
  ill:               { min: 20, max: 30, label: "Illness" },
  care:              { min: -12, max: -6, label: "Self-care" },
  match_minutes:     { min: 15, max: 30, label: "Match load" },
  card_stress:       { min: 8,  max: 16, label: "Card / foul stress" },
  travel_timezone:   { min: 10, max: 20, label: "Travel fatigue" },
  concussion_check:  { min: 30, max: 45, label: "Head impact" },
  result:            { min: 12, max: 34, label: "The result" },
  match_tension:     { min: 8,  max: 26, label: "Match tension" },
  doomscroll:        { min: 6,  max: 16, label: "Post-match scroll" },
};

// Context modifiers — context string → multiplier
const CONTEXT_MULTIPLIERS: Record<string, number> = {
  "1-2":         0.6,
  "3-4":         0.85,
  "5+":          1.0,
  "lost count":  1.15,
  "under 4":     1.0,
  "4-6":         0.85,
  "6-7":         0.65,
  "easy":        0.5,
  "moderate":    0.75,
  "destroyed me":1.15,
  "yes":         1.1,
  "mostly gone": 0.7,
};

function contextMultiplier(context?: string): number {
  if (!context) return 0.8; // no context → assume mid-range
  const key = context.toLowerCase().trim();
  return CONTEXT_MULTIPLIERS[key] ?? 0.8;
}

function hrvModifier(hrv: HRVData): { points: number; label: string; insight: string } {
  const delta = hrv.hrvDeltaPercent;
  if (delta <= -30) return {
    points: 15,
    label: "Wearable data",
    insight: `HRV is ${Math.abs(delta)}% below your baseline — nervous system in active recovery mode.`,
  };
  if (delta <= -15) return {
    points: 10,
    label: "Wearable data",
    insight: `HRV dropped ${Math.abs(delta)}% below baseline — your body is processing last night's load.`,
  };
  if (delta <= -5) return {
    points: 5,
    label: "Wearable data",
    insight: `HRV slightly below baseline — mild physiological stress present.`,
  };
  if (delta > 5) return {
    points: -5,
    label: "Wearable data",
    insight: `HRV is above your baseline — your nervous system is well-recovered.`,
  };
  return {
    points: 3,
    label: "Wearable data",
    insight: `HRV close to baseline — recovery proceeding normally.`,
  };
}

function faceModifier(face: FaceAnalysisResult): { points: number; label: string; insight: string } {
  const pts = face.debtContribution;
  return {
    points: pts,
    label: "Face scan",
    insight: face.summary,
  };
}

const STRESSOR_ICONS: Record<StressorType, string> = {
  alcohol: "🍺", sleep: "😴", training: "💪", stress: "😤", ill: "🤒", care: "✦",
  match_minutes: "⚽", card_stress: "🟨", travel_timezone: "✈️", concussion_check: "🤕",
  result: "⚽", match_tension: "😰", doomscroll: "📱",
};

// ─── Recovery arc from score ───────────────────────────────────────────────────

function seedRecoveryArc(score: number, now: Date) {
  // Higher score = longer recovery
  const dangerHours   = score >= 70 ? 5 : score >= 50 ? 3 : 1.5;
  const partialHours  = score >= 70 ? 10 : score >= 50 ? 7 : 4;
  const clearedHours  = score >= 70 ? 18 : score >= 50 ? 13 : 8;

  return {
    dangerEnds:  new Date(now.getTime() + dangerHours  * 3600000).toISOString(),
    partialEnds: new Date(now.getTime() + partialHours * 3600000).toISOString(),
    clearedAt:   new Date(now.getTime() + clearedHours * 3600000).toISOString(),
  };
}

// ─── Score bands ──────────────────────────────────────────────────────────────

function verdictFromScore(score: number, locale: Locale = "en", mode: RecoveryMode = "personal"): string {
  if (mode === "football") {
    if (score >= 81) return "Not match-fit. The player is in damage control. Listen to the medical team.";
    if (score >= 61) return "Significant fatigue debt. The player is telling you something — rotate or rest.";
    if (score >= 41) return "The player's body is working overtime. 60 minutes max or impact sub.";
    if (score >= 21) return "Mild load. Available for selection with a modified warm-up.";
    return "Match-fit. Cleared for full participation.";
  }
  if (mode === "fan") {
    if (score >= 81) return "That one really hurt. Your body is in damage control — be gentle with yourself tonight.";
    if (score >= 61) return "Heavy toll. Your nervous system is still running on adrenaline from that match.";
    if (score >= 41) return "You're still wired from the match. Give yourself a real wind-down before bed.";
    if (score >= 21) return "Mild aftermath. A short walk will clear the rest of it.";
    return "You're settled. The match didn't leave much of a mark tonight.";
  }

  const s = getStrings(locale);
  if (score >= 81) {
    return locale === "es" ? "Tu cuerpo está en control de daños. Escúchalo."
         : locale === "fr" ? "Ton corps gère les dégâts. Écoute-le."
         : "Your body is in damage control. Listen to it.";
  }
  if (score >= 61) {
    return locale === "es" ? "Deuda significativa. Tu cuerpo te dice algo."
         : locale === "fr" ? "Dette significative. Ton corps te dit quelque chose."
         : "Significant debt. Your body is telling you something.";
  }
  if (score >= 41) return s.scoreBand.overtime === "Working overtime"
    ? "Your body is working overtime right now."
    : s.scoreBand.overtime;
  if (score >= 21) return s.scoreBand.mild;
  return s.scoreBand.clear;
}

function recoveryTimeFromArc(clearedAt: string): string {
  const cleared = new Date(clearedAt);
  const now = new Date();
  const diffHrs = (cleared.getTime() - now.getTime()) / 3600000;

  if (diffHrs < 1) return "within the hour";
  if (diffHrs < 6) {
    const h = cleared.getHours();
    const m = cleared.getMinutes();
    const period = h >= 12 ? "pm" : "am";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}${m > 0 ? `:${String(m).padStart(2, "0")}` : ""}${period} today`;
  }
  if (diffHrs < 24) return "later tonight";
  return "tomorrow morning";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeScore(body: AnalyzeBodyRequest) {
  const { stressors, faceAnalysis, hrvData, wakeTime, bedTime } = body;
  const mode: RecoveryMode = body.mode ?? "personal";
  const now = new Date();

  // Merge context-specific weight overrides
  const ctxConfig = getContextConfig(mode);
  const weights = { ...BASE_WEIGHTS, ...ctxConfig.scoringWeights.baseWeights };

  const breakdown: { stressor: string; points: number; insight: string; icon: string }[] = [];
  let rawScore = 0;

  // Stressor contributions
  for (const s of stressors) {
    const w = weights[s.type];
    if (!w) continue;
    const mult = contextMultiplier(s.context);
    const pts  = Math.round((w.min + (w.max - w.min) * 0.6) * mult);
    rawScore += pts;
    if (pts !== 0) {
      breakdown.push({
        stressor: w.label,
        points: pts,
        insight: deterministicInsight(s.type, body.locale ?? "en", s.context),
        icon: STRESSOR_ICONS[s.type] ?? "⚡",
      });
    }
  }

  // Circadian alignment penalty (bedtime + wake time)
  if (bedTime && wakeTime) {
    const circ = circadianPenalty(bedTime, wakeTime);
    if (circ.points !== 0) {
      rawScore += circ.points;
      breakdown.push({ stressor: circ.label, points: circ.points, insight: circ.insight, icon: "🌙" });
    }
  }

  // HRV modifier
  if (hrvData) {
    const mod = hrvModifier(hrvData);
    rawScore += mod.points;
    breakdown.push({ stressor: mod.label, points: mod.points, insight: mod.insight, icon: "❤️" });
  }

  // Face scan modifier
  if (faceAnalysis) {
    const mod = faceModifier(faceAnalysis);
    rawScore += mod.points;
    breakdown.push({ stressor: mod.label, points: mod.points, insight: mod.insight, icon: "📷" });
  }

  const debtScore = Math.min(100, Math.max(0, rawScore));
  const recoveryArc = seedRecoveryArc(debtScore, now);
  const verdict = verdictFromScore(debtScore, body.locale ?? "en", mode);
  const recoveryTime = recoveryTimeFromArc(recoveryArc.clearedAt);

  const confidenceLevel: "high" | "medium" | "low" =
    faceAnalysis && hrvData ? "high" :
    faceAnalysis || hrvData ? "medium" : "low";

  // Confidence tier — drives the dot fill UI
  const hasSpecifics = stressors.some(s =>
    s.alcoholType || s.trainingArea || s.sleepHours || s.stressCarried || s.illSeverity
  );
  const confidenceTier: ConfidenceTier =
    hrvData      ? "precise"   :
    faceAnalysis ? "accurate"  :
    hasSpecifics ? "good"      :
    stressors.length > 0 ? "partial" :
    "estimated";

  // Five-system scores
  const systemScores = computeSystemScores(stressors, now, body.wakeTime, body.bedTime, mode);

  // Counterfactual: "If you had slept 7+ hours, Brain debt would drop from 67 to 22."
  const cf = computeCounterfactual(stressors, systemScores, body.wakeTime, body.bedTime);

  return {
    debtScore,
    verdict,
    recoveryTime,
    stressorBreakdown: breakdown,
    recoveryArc,
    confidenceLevel,
    confidenceTier,
    systemScores,
    counterfactual: cf ? {
      systemLabel: cf.systemLabel,
      fromScore: cf.fromScore,
      toScore: cf.toScore,
      leverLabel: cf.leverLabel,
    } : undefined,
    prescription: deterministicPrescription(stressors.map(s => s.type), debtScore, body.locale ?? "en", mode),
    _layer: "deterministic" as const,
  };
}

// ─── Rule-based fallback prescription ────────────────────────────────────────

function deterministicInsight(type: StressorType, locale: Locale = "en", _context?: string): string {
    void _context;
  // Football-specific deterministic insights
  const footballInsights: Partial<Record<StressorType, string>> = {
    match_minutes:    "Match load accumulates muscular and cardiovascular debt from sprinting and tackling.",
    card_stress:      "Card or heavy foul stress elevates cortisol and mental fatigue.",
    travel_timezone:  "Timezone shifts disrupt circadian rhythm, impairing recovery and cognitive sharpness.",
    concussion_check: "Head impact requires concussion protocol — brain recovery is the priority.",
  };

  // Fan-specific deterministic insights (emotional / mental debt)
  const fanInsights: Partial<Record<StressorType, string>> = {
    result:        "The result drives cortisol and adrenaline — a loss keeps the nervous system switched on for hours.",
    match_tension: "A tense watch elevates heart rate and blood pressure, just like light exertion.",
    doomscroll:    "Post-match scrolling adds blue light and rumination, pushing back sleep onset.",
  };

  // Mode is not passed here, but football and fan stressors are unambiguous
  if (footballInsights[type]) return footballInsights[type]!;
  if (fanInsights[type]) return fanInsights[type]!;

  const s = getStrings(locale).prescription.insights;
  const insights: Partial<Record<StressorType, string>> = {
    alcohol:  s.alcohol,
    sleep:    s.sleep,
    training: s.training,
    stress:   s.stress,
    ill:      s.ill,
    care:     s.caregiving,
  };
  return insights[type] ?? "Contributing to your overall physiological load.";
}

// ─── Circadian alignment penalty ─────────────────────────────────────────────

function circadianPenalty(
  bedTime: string,
  wakeTime: string
): { points: number; label: string; insight: string } {
  // Parse "HH:MM AM/PM" or "H:MM AM/PM" strings to 24h hour number
  function parseHour(t: string): number {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const pm = m[3].toUpperCase() === "PM";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h + parseInt(m[2], 10) / 60;
  }

  const bed  = parseHour(bedTime);
  const wake = parseHour(wakeTime);
  // Normalise bed hour to 24h (treat bed before 6am as "after midnight")
  const bedNorm = bed < 6 ? bed + 24 : bed;
  const sleepDuration = wake + 24 - bedNorm;

  // Circadian classification
  if (bedNorm >= 28) { // after 4am
    return {
      points: 18,
      label: "Severe circadian misalignment",
      insight: "Bedtime after 4am severely disrupts circadian rhythm. Cognitive recovery will take 24–36hrs.",
    };
  }
  if (bedNorm >= 26) { // 2–4am
    return {
      points: 12,
      label: "Circadian misalignment",
      insight: "Bedtime after 2am creates meaningful circadian debt, even with adequate sleep duration.",
    };
  }
  if (bedNorm >= 25) { // midnight–2am
    return {
      points: 6,
      label: "Mild circadian misalignment",
      insight: "Late bedtime mildly disrupts the body's natural repair cycle.",
    };
  }
  // Adequate timing — no penalty
  if (sleepDuration < 5) {
    return {
      points: 10,
      label: "Short sleep duration",
      insight: "Under 5hrs regardless of timing significantly impairs cognitive recovery.",
    };
  }
  return { points: 0, label: "", insight: "" };
}

export function deterministicPrescription(
  types: StressorType[],
  score: number,
  locale: Locale = "en",
  mode: RecoveryMode = "personal"
): { rightNow: string; thisMorning: string; today: string; avoid: string } {
  if (mode === "football") {
    return deterministicFootballPrescription(types, score);
  }
  if (mode === "fan") {
    return deterministicFanPrescription(types, score);
  }

  const hasAlcohol  = types.includes("alcohol");
  const hasSleep    = types.includes("sleep");
  const hasTraining = types.includes("training");
  const hasStress   = types.includes("stress");
  const hasIll      = types.includes("ill");

  const s = getStrings(locale).prescription;

  return {
    rightNow: hasAlcohol
      ? "Drink 500ml of water with electrolytes — your cells are dehydrated."
      : hasSleep
      ? "Get 10 minutes of natural light exposure to reset your cortisol rhythm."
      : "Drink 400ml of water and take 5 slow, deep breaths.",

    thisMorning: hasAlcohol
      ? "No caffeine until at least 10am — it will spike cortisol on an already stressed system."
      : hasSleep
      ? "Eat a protein-rich meal within the next 90 minutes to stabilise blood sugar."
      : hasStress
      ? "Limit decisions for the next two hours — your prefrontal cortex is fatigued."
      : "Keep stimulation low for the next hour. Let your system settle.",

    today: score >= 60
      ? "Your one real focus window opens late morning. Protect 90 minutes around it."
      : score >= 40
      ? s.todayFallback
      : "You have reasonable capacity today. Front-load your hardest work before 2pm.",

    avoid: hasTraining || score >= 60
      ? "Intense training — you will create more debt, not fitness. Walk instead."
      : hasAlcohol
      ? "Any further alcohol today. Your liver is still processing."
      : hasIll
      ? "Social commitments. Your immune system needs your energy right now."
      : s.avoidFallback,
  };
}

// ─── Football-specific deterministic prescription ────────────────────────────

function deterministicFootballPrescription(
  types: StressorType[],
  score: number,
): { rightNow: string; thisMorning: string; today: string; avoid: string } {
  const hasMatch       = types.includes("match_minutes");
  const hasConcussion  = types.includes("concussion_check");
  const hasTravel      = types.includes("travel_timezone");
  const hasAlcohol     = types.includes("alcohol");
  const hasSleep       = types.includes("sleep");

  return {
    rightNow: hasConcussion
      ? "Concussion protocol activated. No training. Medical assessment required before return-to-play."
      : hasAlcohol
      ? "500ml water with electrolytes. The player is dehydrated from last night."
      : hasMatch
      ? "Protein shake within 30 minutes. The player's muscles need recovery fuel now."
      : "400ml water and 5 minutes of deep breathing to reset the autonomic system.",

    thisMorning: hasConcussion
      ? "Cognitive rest. No screens, no tactics board, no team meetings for the player."
      : hasTravel
      ? "Light walk and natural light exposure to reset circadian rhythm after travel."
      : hasSleep
      ? "Protein-rich breakfast within 90 minutes. No caffeine until 10am."
      : "Light activation drills. 15 minutes mobility work to prime the system.",

    today: score >= 60
      ? "Not available for full training. Pool session or active recovery only. 60 minutes max in tomorrow's session."
      : score >= 40
      ? "Modified training. No high-intensity drills. Available for the matchday squad as an impact sub."
      : "Full training available. Monitor load but no restrictions. Start XI candidate.",

    avoid: hasConcussion
      ? "Any heading drills or contact training until medically cleared. This is non-negotiable."
      : score >= 60
      ? "Full-intensity training. The player will create more debt, not match sharpness."
      : hasAlcohol
      ? "Any further alcohol. The player's liver is still processing and it will impair recovery."
      : "Late-night screen time. Protect sleep — it's the single biggest recovery lever.",
  };
}

// ─── Fan-specific deterministic prescription (emotional wind-down) ────────────

function deterministicFanPrescription(
  types: StressorType[],
  score: number,
): { rightNow: string; thisMorning: string; today: string; avoid: string } {
  const hasScroll  = types.includes("doomscroll");
  const hasAlcohol = types.includes("alcohol");
  const hasResult  = types.includes("result");
  const hasTension = types.includes("match_tension");

  return {
    rightNow: score >= 55
      ? "Get up and take a 15-minute walk. Movement burns off the cortisol still running from the match."
      : hasAlcohol
      ? "500ml water with electrolytes, then step outside for a few minutes of fresh air."
      : "Stand up, take 5 slow breaths, and let your heart rate come down before bed.",

    thisMorning: hasTension || hasResult
      ? "Your nervous system took a hit last night. Natural light and a proper breakfast will reset it faster than caffeine."
      : "Ease in gently — light, water, and a real breakfast before you reach for your phone.",

    today: score >= 55
      ? "Be kind to yourself today. The result stung, and your body is still catching up. Keep the day light."
      : "You're mostly through it. A short walk and normal routine will clear the rest.",

    avoid: hasScroll
      ? "Rewatching the highlights and the group chat. Rumination keeps cortisol high and steals your sleep."
      : "Doomscrolling the result before bed. The takes will still be there tomorrow — your sleep won't."
  };
}

// ─── Deterministic schedule fallback ─────────────────────────────────────────

export function deterministicSchedule(
  systemScores: SystemScore[],
  debtScore: number,
  locale: Locale = "en",
  mode: RecoveryMode = "personal",
): { time: string; action: string; system: string }[] {
  const ranked = [...systemScores].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];

  const t = getStrings(locale).schedule;
  const blocks: { time: string; action: string; system: string }[] = [];

  // Block 1: immediate (worst system)
  if (top && top.score > 20) {
    const isFootball = mode === "football";
    blocks.push({
      time: t.nowTo10,
      action: debtScore >= 60
        ? (isFootball
          ? "500ml water + electrolytes. Pool session or rest. No caffeine."
          : "500ml water + electrolytes. No caffeine.")
        : (isFootball
          ? "Light hydration. Gentle activation drills only."
          : "Light hydration. Gentle start."),
      system: top.system,
    });
  }

  // Block 2: mid-morning (second worst system)
  if (second && second.score > 15) {
    const isFootball = mode === "football";
    blocks.push({
      time: t.tenToNoon,
      action: debtScore >= 40
        ? (isFootball
          ? "Light walk. Natural light. Tactical review only — no intensity."
          : "Light walk outside. Natural light. No intense activity.")
        : (isFootball
          ? "Protein-rich meal. Modified training block available."
          : "Protein-rich meal. Normal routine."),
      system: second.system,
    });
  } else {
    blocks.push({
      time: t.tenToNoon,
      action: mode === "football"
        ? "Protein-rich meal. Match-squad tactics — full participation available."
        : "Protein-rich meal. Protect your focus window.",
      system: "brain",
    });
  }

  // Block 3: afternoon
  blocks.push({
    time: t.noonTo3,
    action: debtScore >= 60
      ? (mode === "football"
        ? "No training session. Recovery only. Hydrate. Medical assessment if needed."
        : "No training. Hydrate. Light tasks only.")
      : (mode === "football"
        ? "Light tactical session OK. No full-pitch intensity."
        : "Light movement OK. Front-load harder work."),
    system: "muscular",
  });

  // Block 4: late afternoon / evening
  blocks.push({
    time: t.threeTo6,
    action: debtScore >= 60
      ? (mode === "football"
        ? "No alcohol. Cold water immersion or active recovery. Prepare for early sleep before next match."
        : "No alcohol, no stimulants. Prepare for early sleep.")
      : (mode === "football"
        ? "Wind down. No caffeine after 2pm. Light tactical review only."
        : "Wind down. No caffeine after 2pm."),
    system: "cardiovascular",
  });

  return blocks;
}
