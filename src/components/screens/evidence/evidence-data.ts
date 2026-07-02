export const SAMPLE_BENCHMARK = {
  edgeTotalMs: 21_500,
  cloudVerdictMs: 7_120,
  agentBreakdown: [
    { agent: "triage" as const,     durationMs: 6_300, role: "Identifies priority system, secondary concern, and what to avoid" },
    { agent: "coach" as const,      durationMs: 4_300, role: "Generates 4-part prescription from triage context" },
    { agent: "schedule" as const,   durationMs: 6_400, role: "Produces time-blocked recovery schedule" },
    { agent: "reflection" as const, durationMs: 4_400, role: "Rewrites Coach output in user's chosen voice" },
  ],
  model: "Qwen3-1.7B-Instruct (Q4 + TurboQuant KV-cache)",
  input: "alcohol 3 drinks + sleep 5h",
  outputDebt: 67,
  personality: "honest",
};

export const SAMPLE_COUNTERFACTUAL = {
  leverLabel: "slept 7+ hours",
  systemLabel: "Brain",
  fromScore: 67,
  toScore: 22,
  delta: 45,
};

export const ARCHITECTURE_STEPS = [
  { id: "camera",  label: "Camera frame",                                       icon: "📷" },
  { id: "mesh",    label: "MediaPipe FaceMesh (browser, 468 landmarks)",         icon: "🔺" },
  { id: "zk",      label: "7-dim feature vector → EZKL ZK proof (Web Worker)", icon: "🛡" },
  { id: "skale",   label: "Local verify + SKALE on-chain commit",                icon: "⛓" },
  { id: "score",   label: "Deterministic 5-system score (<5ms)",                 icon: "📊" },
  { id: "counter", label: "Counterfactual engine (single-variable flip)",        icon: "🎯" },
  { id: "qvac",    label: "QVAC 4-agent pipeline (Qwen3-1.7B)",                  icon: "🧠" },
  { id: "fallback",label: "Deterministic schedule + prescription + verdict fallbacks", icon: "🔁" },
  { id: "stream",  label: "Streaming SSE to dashboard",                          icon: "📡" },
];

export const FALLBACK_CHAIN = [
  { layer: "QVAC 4-agent pipeline",     primary: "On-device inference",          fallback: "Cloud AI (Eazo/deepseek, 5–8s timeout)" },
  { layer: "Verdict",                   primary: "Cloud AI (Eazo parallel)",     fallback: "Deterministic verdict from score" },
  { layer: "Prescription",              primary: "QVAC Coach Agent",            fallback: "Deterministic rule-based prescription" },
  { layer: "Schedule",                  primary: "QVAC Schedule Agent",         fallback: "Deterministic 4-block schedule" },
  { layer: "Counterfactual",            primary: "Deterministic single-flip",    fallback: "Always available, no LLM needed" },
];

export const CONFIDENCE_TIERS = [
  { tier: "Estimated",  level: "Stressors only",                           desc: "Basic debt score from user-reported stressors alone. No biometric calibration." },
  { tier: "Partial",    level: "Stressor specifics",                       desc: "User provided details (alcohol type, training intensity, sleep hours). Score resolution improves." },
  { tier: "Good",       level: "Stressor context + timing",                desc: "Wake/bed times collected. Circadian penalty applied. Score reflects chronotype alignment." },
  { tier: "Accurate",   level: "+ Face scan biometrics",                   desc: "MediaPipe 468-landmark mesh → 7-dim feature vector → ZK proof. Facial biomarkers calibrate the debt score." },
  { tier: "Precise",    level: "+ Wearable HRV data",                      desc: "HRV delta and resting heart rate from Terra, Google Fit, Garmin, or manual proxy. Autonomic state confirmed." },
];

export const DRINK_COUNT_MODS = [
  { label: "1–2 drinks", mod: "0.5" },
  { label: "3–4 drinks", mod: "0.8" },
  { label: "5+ drinks",  mod: "1.0" },
  { label: "Lost count", mod: "1.2" },
];

export const SCORING_METHODOLOGY = [
  {
    category: "Alcohol",
    note: "Base 30 points × drink-type modifier × count modifier.",
    modifiers: [
      { label: "Beer",       liver: "0.8", brain: "0.4", gut: "1.3", cardio: "0.7" },
      { label: "Red wine",   liver: "1.0", brain: "0.8", gut: "0.9", cardio: "0.8" },
      { label: "White wine", liver: "1.0", brain: "0.7", gut: "0.8", cardio: "0.7" },
      { label: "Champagne",  liver: "0.9", brain: "0.6", gut: "1.0", cardio: "0.7" },
      { label: "Spirits",    liver: "1.4", brain: "1.3", gut: "1.0", cardio: "1.1" },
      { label: "Cocktails",  liver: "1.3", brain: "1.4", gut: "1.2", cardio: "1.0" },
    ],
  },
  {
    category: "Sleep deprivation",
    note: "35 base points on brain, 15 on gut. Depends on hours slept.",
    modifiers: [
      { label: "< 4 hours", brain: "1.0", gut: "0.75" },
      { label: "4–6 hours", brain: "0.75", gut: "0.75" },
      { label: "6–7 hours", brain: "0.40", gut: "0.40" },
    ],
  },
  {
    category: "Training",
    note: "40 points on muscular/CNS, 35 on cardiovascular. Area × intensity.",
    modifiers: [
      { label: "Legs / Full body", musc: "1.0", cardio: "0.6–0.7" },
      { label: "HIIT",             musc: "0.8", cardio: "1.0" },
      { label: "Cardio / Upper",   musc: "0.5–0.6", cardio: "0.3–0.9" },
      { label: "Mobility",         musc: "−0.5", cardio: "−0.3" },
    ],
  },
];

export const CIRCADIAN_THRESHOLDS = [
  { window: "Before midnight",  brain: "0",   cardio: "0",   label: "Aligned" as const },
  { window: "12am – 2am",    brain: "+10", cardio: "+5",  label: "Mild mismatch" as const },
  { window: "2am – 4am",     brain: "+22", cardio: "+10", label: "Significant" as const },
  { window: "4am – 6am",     brain: "+32", cardio: "+16", label: "Severe" as const },
];
