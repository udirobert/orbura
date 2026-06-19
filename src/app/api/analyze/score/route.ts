import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeBodyRequest, HRVData, FaceAnalysisResult, StressorType, ConfidenceTier } from "@/lib/types";
import { computeSystemScores } from "@/lib/systemScoring";
import { computeCounterfactual } from "@/lib/systemScoring";
import { getStrings, type Locale } from "@/lib/i18n";

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
  alcohol:  { min: 25, max: 35, label: "Alcohol" },
  sleep:    { min: 18, max: 28, label: "Poor sleep" },
  training: { min: 12, max: 22, label: "Hard training" },
  stress:   { min: 10, max: 18, label: "High stress" },
  ill:      { min: 20, max: 30, label: "Illness" },
  care:     { min: -12, max: -6, label: "Self-care" },    // negative — reduces debt
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

const STRESSOR_ICONS = { alcohol: "🍺", sleep: "😴", training: "💪", stress: "😤", ill: "🤒", care: "✦" };

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

function verdictFromScore(score: number, locale: Locale = "en"): string {
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
  const now = new Date();

  const breakdown: { stressor: string; points: number; insight: string; icon: string }[] = [];
  let rawScore = 0;

  // Stressor contributions
  for (const s of stressors) {
    const w = BASE_WEIGHTS[s.type];
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
  const verdict = verdictFromScore(debtScore, body.locale ?? "en");
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
  const systemScores = computeSystemScores(stressors, now, body.wakeTime, body.bedTime);

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
    prescription: deterministicPrescription(stressors.map(s => s.type), debtScore, body.locale ?? "en"),
    _layer: "deterministic" as const,
  };
}

// ─── Rule-based fallback prescription ────────────────────────────────────────

function deterministicInsight(type: StressorType, locale: Locale = "en", _context?: string): string {
    void _context;
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
  locale: Locale = "en"
): { rightNow: string; thisMorning: string; today: string; avoid: string } {
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

// ─── Deterministic schedule fallback ─────────────────────────────────────────

export function deterministicSchedule(
  systemScores: SystemScore[],
  debtScore: number,
  locale: Locale = "en",
): { time: string; action: string; system: string }[] {
  const ranked = [...systemScores].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];

  const t = getStrings(locale).schedule;
  const blocks: { time: string; action: string; system: string }[] = [];

  // Block 1: immediate (worst system)
  if (top && top.score > 20) {
    blocks.push({
      time: t.nowTo10,
      action: debtScore >= 60
        ? "500ml water + electrolytes. No caffeine."
        : "Light hydration. Gentle start.",
      system: top.system,
    });
  }

  // Block 2: mid-morning (second worst system)
  if (second && second.score > 15) {
    blocks.push({
      time: t.tenToNoon,
      action: debtScore >= 40
        ? "Light walk outside. Natural light. No intense activity."
        : "Protein-rich meal. Normal routine.",
      system: second.system,
    });
  } else {
    blocks.push({
      time: t.tenToNoon,
      action: "Protein-rich meal. Protect your focus window.",
      system: "brain",
    });
  }

  // Block 3: afternoon
  blocks.push({
    time: t.noonTo3,
    action: debtScore >= 60
      ? "No training. Hydrate. Light tasks only."
      : "Light movement OK. Front-load harder work.",
    system: "muscular",
  });

  // Block 4: late afternoon / evening
  blocks.push({
    time: t.threeTo6,
    action: debtScore >= 60
      ? "No alcohol, no stimulants. Prepare for early sleep."
      : "Wind down. No caffeine after 2pm.",
    system: "cardiovascular",
  });

  return blocks;
}
