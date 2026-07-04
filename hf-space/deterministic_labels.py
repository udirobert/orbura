"""
Deterministic label generators for the two agents that lack fallbacks.

- generate_schedule(): maps top-4 systems to 4 time blocks with
  system-specific recovery actions. Matches the Schedule Agent output
  format from scripts/qvac-worker.mjs.

- apply_voice(): deterministic voice transformation for the Reflection
  Agent. Rewrites Coach output in honest/gentle/scientific/sarcastic
  voices without inventing new advice.

These are used by generate_finetune_dataset.py to produce ground-truth
labels for fine-tuning, and by eval_finetuned.py to score model output.
"""

from __future__ import annotations

from typing import Optional

# ─── Schedule Agent ───────────────────────────────────────────────────────────
#
# Output format (from qvac-worker.mjs lines 132-138):
#   <time range> | <health action> | <body system>
#   NOW-10AM | 500ml water + electrolytes, no caffeine | Liver
#   10AM-12PM | Light walk outside, natural light | Brain
#   12PM-3PM | Protein-rich lunch, gentle movement | Muscular
#   3PM-6PM | No intense activity, hydrate | Cardiovascular

TIME_BLOCKS = [
    "NOW-10AM",
    "10AM-12PM",
    "12PM-3PM",
    "3PM-6PM",
]

# System-specific recovery actions for each time block.
# Indexed by [system][block_index].
SCHEDULE_ACTIONS = {
    "liver": [
        "500ml water + electrolytes, no caffeine to support hepatic clearance",
        "Continue hydration, light protein only, avoid alcohol metabolites",
        "Protein-rich lunch with no alcohol to sustain metabolic clearance",
        "Herbal tea and hydration; no alcohol to let liver finish recovery",
    ],
    "brain": [
        "No screens for 10 min, dim lights, breathe to calm cortical activity",
        "Light walk outside for natural light to reset circadian cortisol rhythm",
        "Gentle tasks only; avoid deep-focus work while glymphatic clearance runs",
        "Wind down early, no screens after 8pm to protect melatonin production",
    ],
    "muscular": [
        "Gentle mobility only, protein within 2hrs to support muscle synthesis",
        "Light walk and dynamic stretching to promote blood flow for repair",
        "Protein-rich lunch with gentle movement to sustain muscle protein synthesis",
        "No re-training same group; foam roll and rest for fiber recovery",
    ],
    "cardiovascular": [
        "Walk only, no cardio; hydrate well to maintain blood volume",
        "Light walk only; avoid intervals and sauna while HRV recovers",
        "Gentle activity with no heart rate spikes to protect cardiac recovery",
        "No intense activity; hydrate and rest to let cardiovascular system settle",
    ],
    "gut": [
        "Bland foods only, no coffee on empty stomach to reduce gastric irritation",
        "Probiotic-rich snack and ginger tea to support microbiome and motility",
        "Simple lunch with no sugar or dairy to let gut inflammation subside",
        "Light dinner, no large meals; hydrate to support digestive lining repair",
    ],
}

# Fallback actions for systems not in the map (shouldn't happen, but safe).
DEFAULT_ACTIONS = [
    "Hydrate, rest, gentle movement",
    "Light activity, listen to your body",
    "Nutritious meal, moderate movement",
    "Wind down, prioritize sleep tonight",
]


def generate_schedule(
    system_scores: list[dict],
    current_time: str = "morning",
    recovery_time: str = "later today",
) -> str:
    """Produce a 4-line time-blocked recovery schedule.

    Ranks systems by score (descending), takes the top 4, and maps each
    to a time block with a system-specific action. Matches the exact
    output format the Schedule Agent uses in qvac-worker.mjs.
    """
    ranked = sorted(system_scores, key=lambda s: -s["score"])
    top4 = ranked[:4]

    # If fewer than 4 systems have meaningful scores, pad with remaining.
    while len(top4) < 4:
        remaining = [s for s in ranked if s not in top4]
        if remaining:
            top4.append(remaining[0])
        else:
            top4.append({"system": "general", "label": "General", "score": 0})

    lines = []
    for i, sys_score in enumerate(top4):
        system = sys_score["system"]
        label = sys_score["label"]
        actions = SCHEDULE_ACTIONS.get(system, DEFAULT_ACTIONS)
        action = actions[i] if i < len(actions) else DEFAULT_ACTIONS[i]
        time_range = TIME_BLOCKS[i]
        lines.append(f"{time_range} | {action} | {label}")

    return "\n".join(lines)


# ─── Reflection Agent ─────────────────────────────────────────────────────────
#
# Output format (from qvac-worker.mjs lines 162-166):
#   RIGHT NOW: <rewritten in voice>
#   THIS MORNING: <rewritten in voice>
#   TODAY: <rewritten in voice>
#   AVOID: <rewritten in voice>
#
# The reflection preserves all actions, quantities, and biology.
# Only the tone changes. Never invent new advice. Never soften AVOID.

# Voice-specific prefixes/suffixes applied to each line (except AVOID).
VOICE_TRANSFORMS = {
    "honest": {
        "prefix": "",
        "suffix": "",
        "avoid_prefix": "",
        "transform": lambda text: _tighten(text),
    },
    "gentle": {
        "prefix": "You've earned this — ",
        "suffix": " Take it at your pace.",
        "avoid_prefix": "Be kind to yourself: ",
        "transform": lambda text: text,
    },
    "scientific": {
        "prefix": "",
        "suffix": "",
        "avoid_prefix": "",
        "transform": lambda text: _add_mechanism(text),
    },
    "sarcastic": {
        "prefix": "",
        "suffix": "",
        "avoid_prefix": "",
        "transform": lambda text: _add_dry_wit(text),
    },
}

# Mechanism keywords to append for the scientific voice.
SCIENCE_KEYWORDS = {
    "water": " (supports hepatic clearance)",
    "caffeine": " (cortisol axis still recovering)",
    "walk": " (autonomic rebalancing)",
    "protein": " (muscle protein synthesis)",
    "sleep": " (glymphatic clearance)",
    "alcohol": " (acetaldehyde accumulation)",
    "training": " (CNS fatigue)",
    "screen": " (melatonin suppression)",
    "food": " (gut microbiome stability)",
    "hydrate": " (renal perfusion)",
}

# Dry wit callouts for the sarcastic voice.
SARCASTIC_CALLOUTS = {
    "RIGHT NOW": "Surprise — ",
    "THIS MORNING": "Since you asked nicely — ",
    "TODAY": "Here's the reality check — ",
    "AVOID": "Obviously — ",
}


def _tighten(text: str) -> str:
    """Honest voice: remove filler words, keep it direct."""
    fillers = ["basically", "actually", "just", "really", "kind of", "sort of"]
    result = text
    for filler in fillers:
        result = result.replace(f" {filler} ", " ")
        result = result.replace(f"{filler.capitalize()} ", "")
    return result.strip()


def _add_mechanism(text: str) -> str:
    """Scientific voice: append a mechanism keyword if one matches."""
    lower = text.lower()
    for keyword, mechanism in SCIENCE_KEYWORDS.items():
        if keyword in lower:
            # Append the mechanism before the final period (if any).
            if text.rstrip().endswith("."):
                return text.rstrip()[:-1] + mechanism + "."
            return text.rstrip() + mechanism + "."
    return text


def _add_dry_wit(text: str) -> str:
    """Sarcastic voice: prepend a dry callout. Keep the advice intact."""
    return text  # The prefix is added per-line by apply_voice.


def apply_voice(coach_output: str, personality: str = "honest") -> str:
    """Rewrite a Coach prescription in the chosen voice.

    The coach_output is expected to be 4 lines:
        RIGHT NOW: <action>
        THIS MORNING: <action>
        TODAY: <insight>
        AVOID: <thing to avoid>

    Returns the same 4 lines with voice transformations applied.
    All actions, quantities, and biology are preserved. AVOID is never
    softened.
    """
    transform = VOICE_TRANSFORMS.get(personality, VOICE_TRANSFORMS["honest"])

    lines = coach_output.strip().splitlines()
    result = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Parse the label and content.
        if ":" in stripped:
            label, content = stripped.split(":", 1)
            label = label.strip()
            content = content.strip()
        else:
            label = ""
            content = stripped

        # Apply voice-specific transformation.
        if label.upper() == "AVOID":
            # Never soften AVOID. Only add prefix for sarcastic.
            if personality == "sarcastic":
                content = f"{SARCASTIC_CALLOUTS['AVOID']}{content.lower()}"
            elif personality == "gentle":
                content = f"{transform['avoid_prefix']}{content}"
            result.append(f"{label}: {content}")
        else:
            # Transform the content.
            transformed = transform["transform"](content)
            if personality == "sarcastic":
                callout = SARCASTIC_CALLOUTS.get(label.upper(), "")
                transformed = f"{callout}{transformed.lower()}"
            elif personality == "gentle":
                transformed = f"{transform['prefix']}{transformed}{transform['suffix']}"
            result.append(f"{label}: {transformed}")

    return "\n".join(result)


# ─── Triage Agent ─────────────────────────────────────────────────────────────

# System-key-based avoid mapping (more reliable than label matching).
AVOID_MAP = {
    "brain": "late caffeine, deep-focus work before 11am",
    "liver": "more alcohol, fatty foods",
    "muscular": "high-intensity training, heavy lifts",
    "cardiovascular": "intervals, sauna, alcohol",
    "gut": "sugar, dairy, large meals",
}

# Health reasons per system, ~8 words. Used in the PRIORITY and
# SECONDARY lines to match the system prompt format:
#   PRIORITY: <system> <score> — <health reason in 8 words>
HEALTH_REASONS = {
    "brain": "Cognitive fatigue requires immediate neural rest",
    "liver": "Metabolic clearance needs reduced toxin load",
    "muscular": "Muscle damage needs protein and recovery time",
    "cardiovascular": "Cardiac strain demands lower heart rate today",
    "gut": "Digestive inflammation needs bland foods and rest",
}


def generate_triage(system_scores: list[dict]) -> str:
    """Produce the 3-line triage output matching the Triage Agent format.

    Format (from system prompt):
        PRIORITY: <system> <score>/100 — <health reason in 8 words>
        SECONDARY: <system> <score>/100 — <health reason in 8 words>
        AVOID: <one health thing to avoid + biological reason, 12 words max>

    Always emits exactly 3 lines. If the second-highest score is ≤ 10,
    still includes SECONDARY with the next-ranked system.
    """
    ranked = sorted(system_scores, key=lambda s: -s["score"])
    lines = []
    if ranked:
        top = ranked[0]
        reason = HEALTH_REASONS.get(top["system"], "Recovery needed for this system")
        lines.append(f"PRIORITY: {top['label']} {top['score']}/100 — {reason}")
    if len(ranked) > 1:
        sec = ranked[1]
        reason = HEALTH_REASONS.get(sec["system"], "Secondary system needs attention")
        lines.append(f"SECONDARY: {sec['label']} {sec['score']}/100 — {reason}")
    top_system = ranked[0]["system"] if ranked else "general"
    avoid = AVOID_MAP.get(top_system, "stress and stimulants")
    lines.append(f"AVOID: {avoid}")
    return "\n".join(lines)


# ─── Coach Agent ──────────────────────────────────────────────────────────────

# System-specific coach advice, 12-18 words per line, with biological
# reasons. Severity-tiered: high (>60), moderate (30-60), low (<=30).
# The RIGHT NOW line is always hydration (matches the original fallback).
# THIS MORNING, TODAY, and AVOID vary by severity tier and worst system.

COACH_RIGHT_NOW = (
    "Drink 500ml water with electrolytes now to restore cellular hydration and blood volume"
)

# THIS MORNING advice by severity + worst system
COACH_THIS_MORNING = {
    "high": {
        "brain": "Delay caffeine 90 minutes to protect cortisol rhythm and allow glymphatic clearance to finish",
        "liver": "Eat a protein-rich breakfast with no alcohol to support hepatic metabolic clearance pathways",
        "muscular": "Take a light walk only; damaged muscle fibers need protein synthesis before any load returns",
        "cardiovascular": "Avoid all cardio today; your heart rate variability indicates cardiac stress needs rest",
        "gut": "Stick to bland easily digestible foods to reduce gastrointestinal inflammation and microbiome stress",
    },
    "moderate": {
        "brain": "Have a protein-rich breakfast and take a short walk outside for natural light exposure",
        "liver": "Eat protein and hydrate well; avoid alcohol to let your liver finish clearing metabolites",
        "muscular": "Eat protein within two hours and do gentle mobility work to support muscle repair processes",
        "cardiovascular": "Light walk only; avoid intervals or sauna while your cardiovascular system recovers",
        "gut": "Choose simple whole foods and avoid sugar or dairy to let gut inflammation settle down",
    },
    "low": {
        "brain": "Normal routine is fine; a short walk and good hydration will clear residual cognitive fog",
        "liver": "Stay hydrated and eat normally; your liver is nearly clear and handling metabolism well",
        "muscular": "Gentle movement or light training is fine; protein intake will support ongoing muscle repair",
        "cardiovascular": "Light to moderate activity is fine; stay hydrated and listen to your heart rate",
        "gut": "Normal eating is fine; include fermented foods to support microbiome diversity and gut lining",
    },
}

# TODAY insight by severity + worst system
COACH_TODAY = {
    "high": {
        "brain": "Your cognitive capacity is significantly reduced; avoid deep-focus work and major decisions today",
        "liver": "Your liver is working hard on toxin clearance; prioritize sleep and hydration over everything else",
        "muscular": "Your muscles need full rest; no training today and prioritize protein intake for tissue repair",
        "cardiovascular": "Your cardiovascular system is under stress; no elevated heart rate activity until tomorrow",
        "gut": "Your digestive system is inflamed; eat small bland meals and avoid triggering foods entirely today",
    },
    "moderate": {
        "brain": "Light activity is fine but avoid heavy mental work; your brain is still clearing metabolic waste",
        "liver": "Light activity is okay; avoid alcohol and fatty foods while your liver completes clearance",
        "muscular": "Light movement is beneficial but avoid heavy lifts; give muscle fibers another day of repair",
        "cardiovascular": "Gentle activity is fine; avoid heart rate spikes and stay well hydrated throughout",
        "gut": "Light eating is fine; avoid sugar, dairy, and large meals while gut inflammation subsides",
    },
    "low": {
        "brain": "You are in good shape; train and work normally but maintain hydration and sleep hygiene",
        "liver": "Nearly recovered; normal activity is fine, just stay hydrated and avoid binge drinking tonight",
        "muscular": "Good to train; warm up properly and keep protein intake high to support muscle adaptation",
        "cardiovascular": "Good capacity today; normal training is fine, just stay hydrated and monitor effort",
        "gut": "Digestion is recovering well; normal eating is fine, include fiber and fermented foods",
    },
}

# AVOID by severity + worst system (12 words max, with biological reason)
COACH_AVOID = {
    "high": {
        "brain": "Caffeine after noon — it blocks adenosine clearance and deep sleep tonight",
        "liver": "Alcohol and fatty foods — they double hepatic workload during active clearance",
        "muscular": "Heavy training — damaged fibers need protein synthesis, not more mechanical stress",
        "cardiovascular": "Intense intervals — elevated heart rate stresses an already strained cardiac system",
        "gut": "Sugar, dairy, and large meals — they feed inflammation and delay gut lining repair",
    },
    "moderate": {
        "brain": "Deep-focus marathons — your prefrontal cortex needs rest not sustained high demand",
        "liver": "Evening alcohol — it restarts hepatic clearance and delays metabolic recovery overnight",
        "muscular": "Max-effort lifts — muscle fibers are still repairing and need another recovery day",
        "cardiovascular": "Sauna and intervals — heat stress compounds cardiovascular load before full recovery",
        "gut": "Processed sugar and fried foods — they trigger inflammation and slow microbiome recovery",
    },
    "low": {
        "brain": "All-nighters — even a good brain needs sleep to maintain glymphatic waste clearance",
        "liver": "Binge drinking — your liver is nearly clear, don't restart the metabolic clearance cycle",
        "muscular": "Skipping protein — muscle repair continues even at low debt and needs amino acid supply",
        "cardiovascular": "Dehydration — even light cardio needs adequate blood volume for safe heart function",
        "gut": "Skipping meals — your gut lining needs regular food to maintain microbiome stability",
    },
}


def generate_coach(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
) -> str:
    """Produce the 4-line coach output matching the Coach Agent format.

    Format (from system prompt):
        RIGHT NOW: <one specific health action with quantity, 12-18 words>
        THIS MORNING: <one specific health action for next 2-3 hours, 12-18 words>
        TODAY: <one key insight about physical capacity today, 12-18 words>
        AVOID: <one thing to avoid + biological reason, 12-18 words>

    Severity-tiered: high (>60), moderate (30-60), low (<=30).
    Each line varies by severity tier and the worst-scoring system.
    """
    severity = "high" if debt_score > 60 else ("moderate" if debt_score > 30 else "low")
    worst = max(system_scores, key=lambda s: s["score"]) if system_scores else None
    worst_system = worst["system"] if worst else "general"

    right_now = COACH_RIGHT_NOW
    this_morning = COACH_THIS_MORNING[severity].get(worst_system, COACH_THIS_MORNING[severity]["brain"])
    today = COACH_TODAY[severity].get(worst_system, COACH_TODAY[severity]["brain"])
    avoid = COACH_AVOID[severity].get(worst_system, COACH_AVOID[severity]["brain"])

    return f"RIGHT NOW: {right_now}\nTHIS MORNING: {this_morning}\nTODAY: {today}\nAVOID: {avoid}"
