import type { RecoveryMode } from "@/lib/types";

export interface SystemScience {
  system: string;
  icon: string;
  accent: string;
  fact: string;
  cite: string;
  expanded: string;
  stressors: { name: string; systems: string }[];
}

export const SYSTEMS_SCIENCE: SystemScience[] = [
  {
    system: "Cardiovascular",
    icon: "🪀",
    accent: "#F43F5E",
    fact: "Resting heart rate remains elevated for 12–24 hours after alcohol consumption as the autonomic nervous system works to restore balance.",
    cite: "Spaak et al., Journal of the American College of Cardiology, 2008",
    expanded: "Alcohol suppresses vagal tone and increases sympathetic activity, raising resting heart rate by 5–15 bpm. Combined with high-intensity training (HIIT, cardio) or match play, the cardiovascular system bears a compounding load. The scoring engine applies a 0.5× modifier to alcohol's cardiovascular impact, reflecting the fact that the heart is affected indirectly through autonomic dysregulation rather than direct tissue load.",
    stressors: [
      { name: "Alcohol",       systems: "Base 30 × drink-type modifier × count modifier × 0.5" },
      { name: "Training",      systems: "35 × area modifier × intensity modifier" },
      { name: "Match minutes", systems: "30 × duration modifier" },
      { name: "Stress",        systems: "+15 if carried, +7 if mostly gone" },
      { name: "Illness",       systems: "12 × severity modifier" },
      { name: "Self-care",     systems: "−8 recovery bonus" },
    ],
  },
  {
    system: "Brain / Cognition",
    icon: "🧠",
    accent: "#22D3EE",
    fact: "Sleep deprivation of even one night impairs prefrontal cortex function equivalently to 0.08% blood alcohol concentration.",
    cite: "Harrison & Horne, Journal of Sleep Research, 2000",
    expanded: "The brain is the most stressor-sensitive system in the model. Alcohol — especially spirits and cocktails (1.3–1.4× modifiers) — directly suppresses prefrontal activity. Sleep under 6 hours adds a compounding penalty of 4 points per missing hour via circadian misalignment. Concussion events carry 50-point base hits, the largest single-stressor impact in the engine. The brain's recovery window is 24 hours, reflecting the time required for glymphatic clearance and neurotransmitter rebalance.",
    stressors: [
      { name: "Sleep",         systems: "35 × sleep-hours modifier (up to 1.0 for <4h)" },
      { name: "Alcohol",       systems: "Base 30 × drink-type × count modifier" },
      { name: "Concussion",    systems: "50 × severity modifier (minor 0.8 → protocol 1.5)" },
      { name: "Timezone",      systems: "Up to +30 points for 6+ hour shift" },
      { name: "Card stress",   systems: "20 × card-type modifier" },
      { name: "Stress",        systems: "+28 if carried, +14 if mostly gone" },
      { name: "Circadian",     systems: "Up to +32 for bedtime after 4am" },
    ],
  },
  {
    system: "Liver",
    icon: "🫁",
    accent: "#EAB308",
    fact: "The liver metabolises approximately one standard drink per hour. Processing speed cannot be accelerated by sleep, coffee, or exercise.",
    cite: "Lieber, Physiological Reviews, 1997",
    expanded: "The liver is the primary ethanol-metabolising organ, processing alcohol via alcohol dehydrogenase (ADH) at a fixed rate of ~0.015 g/dL blood alcohol per hour. Different drink types impose different metabolic loads: spirits (1.4×) and cocktails (1.3×) require more hepatic processing due to higher ethanol concentration and congener content. The scoring engine applies a base of 30 points multiplied by both drink-type and count modifiers, making alcohol the dominant liver stressor. Recovery requires zero additional intake — the liver's base recovery window is 30 hours.",
    stressors: [
      { name: "Alcohol",       systems: "Base 30 × drink-type modifier × count modifier" },
      { name: "Self-care",     systems: "−5 recovery bonus" },
    ],
  },
  {
    system: "Muscular / CNS",
    icon: "💪",
    accent: "#A78BFA",
    fact: "Alcohol consumed within 24 hours of resistance training reduces muscle protein synthesis by up to 37%, even when protein intake is maintained.",
    cite: "Parr et al., PLOS ONE, 2014",
    expanded: "Muscle recovery is primarily CNS-driven. The scoring engine assigns 40 base points to training stressors, weighted by body area (legs/full-body = 1.0, upper = 0.5, mobility = −0.5) and intensity (destroyed = 1.2×, hard = 0.85×, easy = 0.4×). Match minutes in football mode add 35 points weighted by playing time. Alcohol further suppresses the mTOR pathway, reducing protein synthesis. The muscular system has the longest recovery window at 48 hours — consistent with literature on full glycogen depletion and muscle fibre repair cycles.",
    stressors: [
      { name: "Training",      systems: "40 × area modifier × intensity modifier" },
      { name: "Match minutes", systems: "35 × duration modifier" },
      { name: "Illness",       systems: "15 × severity modifier" },
      { name: "Self-care",     systems: "−5 recovery bonus" },
    ],
  },
  {
    system: "Gut",
    icon: "🦠",
    accent: "#2DD4BF",
    fact: "A single episode of heavy drinking alters gut microbiome composition within 24 hours, increasing intestinal permeability and systemic inflammation.",
    cite: "Bishehsari et al., Alcohol Research, 2017",
    expanded: "The gut microbiome is highly sensitive to alcohol, sleep disruption, and illness. Beer (1.3× modifier) and cocktails (1.2×) impose the highest gut load due to carbonation, fermentation byproducts, and added sugars. Sleep deprivation disrupts the microbiome's circadian rhythm, compounding gut debt. Illness adds 30 points × severity, reflecting the gut's role in immune barrier function. The gut has a 36-hour recovery window — longer than cardiovascular but shorter than muscular — consistent with enterocyte turnover rates.",
    stressors: [
      { name: "Alcohol",       systems: "Base 30 × drink-type modifier × count modifier" },
      { name: "Sleep",         systems: "15 × sleep-hours modifier" },
      { name: "Illness",       systems: "30 × severity modifier" },
      { name: "Timezone",      systems: "Up to +15 for 6+ hour shift" },
      { name: "Self-care",     systems: "−5 recovery bonus" },
    ],
  },
];

// ─── Fan Recovery mode — emotional-stress science overrides ───────────────────
//
// In Fan mode the cardiovascular and brain cards surface the science of
// *watching* football rather than alcohol/training. Facts and citations are
// kept consistent with the scoring engine's FAN_SCIENCE (src/stressors/scoring).

const FAN_SCIENCE_OVERRIDES: Record<
  string,
  Pick<SystemScience, "fact" | "cite" | "expanded" | "stressors">
> = {
  "Cardiovascular": {
    fact: "During the 2006 World Cup, cardiac emergencies more than doubled on days the German team played. The trigger was the emotional stress of watching — not physical exertion.",
    cite: "Wilbert-Lampen et al., New England Journal of Medicine, 2008",
    expanded: "For a fan, the cardiovascular load comes from the match itself. A tense watch elevates heart rate and blood pressure for the full 90; a penalty shootout is sustained sympathetic arousal — the single highest cardiac-stress event in the model. A loss or knockout adds an acute emotional-stress spike. The engine weights match tension (up to +34) and result (up to +26) directly onto cardiovascular debt, with an 18-hour recovery window.",
    stressors: [
      { name: "Match tension", systems: "+2 comfortable → +34 penalty shootout" },
      { name: "The result",    systems: "+4 comfortable win → +26 knocked out" },
      { name: "Match-day drinks", systems: "Base 30 × drink-type × count × 0.5" },
    ],
  },
  "Brain / Cognition": {
    fact: "A stressful or disappointing match keeps cortisol and adrenaline elevated for hours, delaying sleep onset and prolonging rumination well past the final whistle.",
    cite: "Åkerstedt, Sleep Medicine Reviews, 2006",
    expanded: "The brain carries the emotional aftermath. A loss drives rumination and elevated cortisol (up to +45 for a knockout); post-match doomscrolling layers blue-light exposure and social conflict on top (up to +28), pushing sleep onset even later. Late kickoffs compound this through the same circadian penalty as any late night. The 24-hour recovery window reflects the time cortisol takes to normalise and sleep debt to clear.",
    stressors: [
      { name: "The result",       systems: "+6 comfortable win → +45 knocked out" },
      { name: "Post-match scroll", systems: "+6 a few min → +28 couldn't stop" },
      { name: "Match tension",     systems: "+2 comfortable → +20 penalty shootout" },
      { name: "Late kickoff",      systems: "35 × sleep-hours modifier + circadian penalty" },
    ],
  },
};

/**
 * Systems-science entries for the given mode. Fan mode swaps the cardiovascular
 * and brain cards for their emotional-stress variants; all other modes get the
 * base (alcohol/training-centric) science.
 */
export function getSystemsScience(mode: RecoveryMode): SystemScience[] {
  if (mode !== "fan") return SYSTEMS_SCIENCE;
  return SYSTEMS_SCIENCE.map((s) => {
    const override = FAN_SCIENCE_OVERRIDES[s.system];
    return override ? { ...s, ...override } : s;
  });
}
