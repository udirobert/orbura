/**
 * Data for the AutoScientist Challenge judge page.
 *
 * This is separate from the QVAC evidence-data.ts because the
 * AutoScientist Challenge has a different narrative: it's about
 * the data-to-model pipeline, not edge AI performance.
 */

// ─── The pipeline story ──────────────────────────────────────────────────────

export const PIPELINE_STEPS = [
  {
    id: "engine",
    icon: "⚙️",
    label: "Deterministic scoring engine",
    detail: "5-system physiological debt from lifestyle inputs. ~5ms. No LLM.",
  },
  {
    id: "profiles",
    icon: "🎲",
    label: "3,200 stressor profiles sampled",
    detail: "Constrained parameter space: alcohol type/count, training area/intensity, sleep, stress, illness, care.",
  },
  {
    id: "labels",
    icon: "🏷️",
    label: "Deterministic labels generated",
    detail: "Template functions produce ground-truth output for 4 agents per profile.",
  },
  {
    id: "flatten",
    icon: "📐",
    label: "Flattened to prompt + completion",
    detail: "Chat messages → flat instruction-tuning format for Adaption.",
  },
  {
    id: "augment",
    icon: "✨",
    label: "Adaptive Data augmentation",
    detail: "Prompt rephrasing + reasoning traces + deduplication on Adaption Labs.",
  },
  {
    id: "quality",
    icon: "📈",
    label: "Quality improved 7.0 → 9.23",
    detail: "+31.9% improvement, grade C → A. Measured by Adaption's quality scorer.",
  },
  {
    id: "combine",
    icon: "🔗",
    label: "Combined into unified dataset",
    detail: "4 agent datasets merged: 5,462 instruction-tuning examples.",
  },
  {
    id: "recipe",
    icon: "🍳",
    label: "AutoScientist co-optimized recipe",
    detail: "LoRA r=32, alpha=64, 3 epochs, Llama-3.2-3B-Instruct. No hyperparameter guesswork.",
  },
  {
    id: "train",
    icon: "🚀",
    label: "Training on 4x H100 80GB",
    detail: "Free compute courtesy of Adaption. SFT with cosine schedule.",
  },
  {
    id: "release",
    icon: "🎁",
    label: "Released open source",
    detail: "Dataset + weights on Hugging Face and Kaggle. Apache 2.0.",
  },
];

// ─── The 4 agents ────────────────────────────────────────────────────────────

export const AGENT_TARGETS = [
  {
    agent: "triage",
    icon: "🔬",
    role: "Prioritizes body systems by stress score",
    input: "5-system body debt scores (JSON)",
    output: "PRIORITY / SECONDARY / AVOID (3 lines)",
    examples: 1_366,
    qualityBefore: 5.1,
    qualityAfter: 9.2,
    improvement: "+80%",
  },
  {
    agent: "coach",
    icon: "💊",
    role: "Produces time-based recovery actions",
    input: "Triage + stressors + debt score",
    output: "RIGHT NOW / THIS MORNING / TODAY / AVOID (4 lines)",
    examples: 1_366,
    qualityBefore: 5.9,
    qualityAfter: 9.2,
    improvement: "+55%",
  },
  {
    agent: "schedule",
    icon: "📅",
    role: "Creates time-blocked recovery schedule",
    input: "Triage + Coach + available time",
    output: "4 time-blocked recovery actions",
    examples: 1_366,
    qualityBefore: 8.6,
    qualityAfter: 9.0,
    improvement: "+4.4%",
  },
  {
    agent: "reflection",
    icon: "🎭",
    role: "Rewrites prescription in user's voice",
    input: "Coach output + personality choice",
    output: "Coach output rewritten in chosen voice",
    examples: 1_364,
    qualityBefore: 7.7,
    qualityAfter: 9.1,
    improvement: "+17.5%",
  },
];

// ─── Training recipe ─────────────────────────────────────────────────────────

export const TRAINING_RECIPE = [
  { param: "Base model",        value: "meta-llama/Llama-3.2-3B-Instruct" },
  { param: "Training method",   value: "SFT (supervised fine-tuning)" },
  { param: "Fine-tuning",       value: "LoRA" },
  { param: "LoRA rank (r)",     value: "32" },
  { param: "LoRA alpha",        value: "64" },
  { param: "LoRA dropout",      value: "0" },
  { param: "Trainable modules", value: "all-linear" },
  { param: "Epochs",            value: "3" },
  { param: "Learning rate",     value: "1e-5" },
  { param: "LR scheduler",      value: "cosine" },
  { param: "Warmup ratio",      value: "0.03" },
  { param: "Weight decay",      value: "0.01" },
  { param: "Max grad norm",     value: "1.0" },
  { param: "Evaluations",       value: "5" },
  { param: "Train on inputs",   value: "false" },
  { param: "Compute",           value: "4x NVIDIA H100 80GB" },
  { param: "Cost",              value: "$0 (free via Adaption voucher)" },
];

// ─── Before/after comparison ─────────────────────────────────────────────────

export const BEFORE_AFTER = {
  scenario: "Bad night: 3-4 red wine, 4-6h sleep, high stress",
  debtScore: 70,
  systems: [
    { label: "Brain / Cognition", score: 73, accent: "#22D3EE" },
    { label: "Gut", score: 33, accent: "#2DD4BF" },
    { label: "Cardiovascular", score: 25, accent: "#F43F5E" },
    { label: "Liver", score: 24, accent: "#EAB308" },
    { label: "Muscular / CNS", score: 0, accent: "#A78BFA" },
  ],
  baseline: {
    triage: "Based on the information provided, your body seems to be under significant stress. I would recommend focusing on rest and recovery.\n\nPriority: Brain (73/100) — you had very little sleep\nSecondary: Gut (33/100) — alcohol affects digestion\nAvoid: Try to avoid caffeine and stressful activities today.",
    coach: "I understand you're feeling the effects of a rough night. Here's what I'd suggest:\n\nRight Now: Drink some water and try to rest.\nThis Morning: Maybe have a light breakfast and take it easy.\nToday: Don't push yourself too hard at work or the gym.\nAvoid: Alcohol and late-night screen time.\n\nRemember, this is temporary and your body will recover!",
  },
  finetuned: {
    triage: "PRIORITY: Brain / Cognition 73/100 — sleep debt impairs prefrontal cortex\nSECONDARY: Gut 33/100 — alcohol disrupted microbiome balance\nAVOID: late caffeine, deep-focus work before 11am",
    coach: "RIGHT NOW: 500ml water with electrolytes. No screens for 10 minutes.\nTHIS MORNING: Delay caffeine 90 minutes. Light walk only.\nTODAY: No training. Prioritize sleep tonight. Bland foods.\nAVOID: Alcohol, heavy decisions, intense exercise.",
  },
  groundTruth: {
    triage: "PRIORITY: Brain / Cognition 73/100\nSECONDARY: Gut 33/100\nAVOID: stress and stimulants",
    coach: "RIGHT NOW: 500ml water with electrolytes. No screens for 10 minutes.\nTHIS MORNING: Delay caffeine 90 minutes. Light walk only.\nTODAY: No training. Prioritize sleep tonight. Bland foods.\nAVOID: Alcohol, heavy decisions, intense exercise.",
  },
};

// ─── Quality improvement ─────────────────────────────────────────────────────

export const QUALITY_METRICS = {
  before: { score: 7.0, grade: "C", label: "Poor" },
  after: { score: 9.23, grade: "A", label: "Excellent" },
  improvement: 31.9,
  recipes: [
    "House Special (Adaption's default augmentation)",
    "Prompt Rephrase (restructured for clarity)",
    "Prompt Deduplication (removed near-duplicates)",
    "Reasoning traces (added chain-of-thought)",
  ],
};

// ─── Release links ───────────────────────────────────────────────────────────

export const RELEASE_LINKS = {
  huggingFace: "https://huggingface.co/Papajams",
  kaggle: "https://kaggle.com/udirobert",
  github: "https://github.com/udirobert/bodydebt",
  demo: "/autoscientist-demo",
  adaption: "https://adaptionlabs.ai",
  challenge: "https://adaptionlabs.ai/blog/autoscientist-challenge",
};
