/**
 * Data for the AutoScientist Challenge judge page.
 *
 * This is separate from the QVAC evidence-data.ts because the
 * AutoScientist Challenge has a different narrative: it's about
 * the data-to-model pipeline, not QVAC inference performance.
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
    { label: "Brain / Cognition", score: 73, accent: "var(--color-system-brain)" },
    { label: "Gut", score: 33, accent: "var(--color-system-gut)" },
    { label: "Cardiovascular", score: 25, accent: "var(--color-system-cardiovascular)" },
    { label: "Liver", score: 24, accent: "var(--color-system-liver)" },
    { label: "Muscular / CNS", score: 0, accent: "var(--color-system-muscular)" },
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

// ─── Part 2: Data Visualization track ─────────────────────────────────────────

export const DATAVIZ_TASK_TYPES = [
  {
    task: "chart_qa",
    icon: "❓",
    weight: "45%",
    description: "Arithmetic, comparison, and trend questions about chart data",
    examples: 4_500,
    questionTypes: 18,
  },
  {
    task: "chart_to_code",
    icon: "📊",
    weight: "15%",
    description: "Generate matplotlib code from chart type and data table",
    examples: 1_500,
    questionTypes: 4,
  },
  {
    task: "fix_code",
    icon: "🔧",
    weight: "10%",
    description: "Repair common matplotlib bugs (typos, missing imports, swapped axes)",
    examples: 1_000,
    questionTypes: 7,
  },
  {
    task: "code_to_desc",
    icon: "📝",
    weight: "10%",
    description: "Describe what a matplotlib code block produces, including statistics",
    examples: 1_000,
    questionTypes: 1,
  },
  {
    task: "style_transfer",
    icon: "🎨",
    weight: "10%",
    description: "Modify an existing plot (change chart type, add grid, rotate labels)",
    examples: 1_000,
    questionTypes: 5,
  },
  {
    task: "chart_choice",
    icon: "📈",
    weight: "5%",
    description: "Select the most appropriate chart type for given data",
    examples: 500,
    questionTypes: 4,
  },
  {
    task: "data_to_code",
    icon: "📄",
    weight: "5%",
    description: "Convert CSV data into a matplotlib chart",
    examples: 500,
    questionTypes: 4,
  },
] as const;

export const DATAVIZ_PIPELINE = [
  {
    id: "generator",
    icon: "⚙️",
    label: "Deterministic dataset generator",
    detail: "7 task types × 4 chart types. 10k train + 2k val. Every label computed from input — no human annotation.",
  },
  {
    id: "tasks",
    icon: "🎯",
    label: "7 task types weighted",
    detail: "chart_qa (45%), chart_to_code (15%), fix_code (10%), code_to_desc (10%), style_transfer (10%), chart_choice (5%), data_to_code (5%).",
  },
  {
    id: "multimodal",
    icon: "🖼️",
    label: "Multimodal pilot (100 rows)",
    detail: "Rendered chart images (bar, line, scatter, pie, grouped, stacked, area, mixed) with visual QA pairs.",
  },
  {
    id: "augment",
    icon: "✨",
    label: "Adaptive Data augmentation",
    detail: "Reasoning traces + deduplication. Prompt rephrase disabled (train/inference mismatch lesson from Part 1).",
  },
  {
    id: "recipe",
    icon: "🍳",
    label: "AutoScientist co-optimized recipe",
    detail: "SFT with AutoScientist-selected base model and hyperparameters. No manual tuning.",
  },
  {
    id: "eval",
    icon: "📐",
    label: "Structural eval harness",
    detail: "Code equivalence (not text match), numeric tolerance for QA, normalized comparison for style transfer.",
  },
  {
    id: "release",
    icon: "🎁",
    label: "Released open source",
    detail: "Dataset + weights on Hugging Face and Kaggle. Apache 2.0.",
  },
];

export const DATAVIZ_CHART_TYPES = [
  { type: "line", icon: "📈", description: "Trend visualization" },
  { type: "bar", icon: "📊", description: "Category comparison" },
  { type: "scatter", icon: "🔵", description: "Correlation" },
  { type: "pie", icon: "🥧", description: "Proportion of a whole" },
];

export const DATAVIZ_QA_TYPES = [
  "max", "min", "sum", "avg", "median", "range",
  "pct_total", "ratio", "rank", "above_avg", "trend",
  "difference", "doubled_total", "pct_of_max",
  "combined_greater", "percentage_change", "counterfactual", "new_average",
];

export const DATAVIZ_BEFORE_AFTER = {
  task: "chart_qa",
  scenario: "Bar chart: Phone 84, Laptop 142, Tablet 67, Watch 95",
  question: "What percentage of the total does Laptop represent?",
  baseline: "The Laptop category has a value of 142, which is a significant portion of the total. Based on the data, it appears to be around 35-40% of the total.",
  finetuned: "35.9%",
  groundTruth: "35.9%",
};

export const DATAVIZ_CODE_EXAMPLE = {
  task: "chart_to_code",
  input: "Write Python matplotlib code for a bar chart.\n\n- Phone: 84\n- Laptop: 142\n- Tablet: 67\n- Watch: 95",
  baseline: "import matplotlib.pyplot as plt\nlabels = ['Phone', 'Laptop', 'Tablet', 'Watch']\nvalues = [84, 142, 67, 95]\nplt.bar(labels, values)\nplt.title('Category Comparison')\nplt.show()",
  finetuned: "import matplotlib.pyplot as plt\nlabels = [\"Phone\", \"Laptop\", \"Tablet\", \"Watch\"]\nvalues = [84, 142, 67, 95]\nplt.bar(labels, values, color='steelblue')\nplt.title('Category Comparison')\nplt.xlabel('Category')\nplt.ylabel('Count')\nplt.xticks(rotation=45)\nplt.tight_layout()\nplt.show()",
  groundTruth: "import matplotlib.pyplot as plt\nlabels = [\"Phone\", \"Laptop\", \"Tablet\", \"Watch\"]\nvalues = [84, 142, 67, 95]\nplt.bar(labels, values, color='steelblue')\nplt.title('Category Comparison')\nplt.xlabel('Category')\nplt.ylabel('Count')\nplt.xticks(rotation=45)\nplt.tight_layout()\nplt.show()",
};

export const PART2_QUALITY_METRICS = {
  before: { score: "—", grade: "—", label: "TBD" },
  after: { score: "—", grade: "—", label: "TBD" },
  improvement: 0,
  recipes: [
    "Reasoning traces (chain-of-thought added)",
    "Deduplication (near-duplicates removed)",
    "Prompt rephrase: DISABLED (Part 1 lesson — causes train/inference mismatch)",
  ],
};

// ─── Release links ───────────────────────────────────────────────────────────

export const RELEASE_LINKS = {
  huggingFace: "https://huggingface.co/Papajams",
  kaggle: "https://www.kaggle.com/udirobert",
  github: "https://github.com/udirobert/orbura",
  demo: "/autoscientist-demo",
  adaption: "https://adaptionlabs.ai",
  challenge: "https://adaptionlabs.ai/blog/autoscientist-challenge",
};
