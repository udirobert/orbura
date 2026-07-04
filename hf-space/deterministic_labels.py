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
        "500ml water + electrolytes, no caffeine",
        "Hydrate continues, light food only",
        "Protein-rich lunch, no alcohol",
        "No more alcohol, herbal tea, hydrate",
    ],
    "brain": [
        "No screens for 10 min, dim lights, breathe",
        "Light walk outside, natural light exposure",
        "No deep-focus work, gentle tasks only",
        "Wind down early, no screens after 8pm",
    ],
    "muscular": [
        "Gentle mobility, no lifting, protein within 2hrs",
        "Light walk, dynamic stretching only",
        "Protein-rich lunch, gentle movement",
        "No re-training same group, foam roll, rest",
    ],
    "cardiovascular": [
        "No cardio, walk only, hydrate well",
        "Light walk, no intervals or sauna",
        "Gentle activity, no heart rate spikes",
        "No intense activity, hydrate, rest",
    ],
    "gut": [
        "Bland foods only, no coffee on empty stomach",
        "Probiotic-rich snack, ginger tea",
        "Simple lunch, no sugar or dairy",
        "Light dinner, no large meals, hydrate",
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


# ─── Triage Agent (re-export from health_coach for convenience) ───────────────

# System-key-based avoid mapping (more reliable than label matching).
AVOID_MAP = {
    "brain": "late caffeine, deep-focus work before 11am",
    "liver": "more alcohol, fatty foods",
    "muscular": "high-intensity training, heavy lifts",
    "cardiovascular": "intervals, sauna, alcohol",
    "gut": "sugar, dairy, large meals",
}


def generate_triage(system_scores: list[dict]) -> str:
    """Produce the 3-line triage output matching the Triage Agent format.

    Ranks systems by score, picks PRIORITY (highest) and SECONDARY
    (next-highest with score > 10), and generates a system-specific
    AVOID line. Uses the system key (not label) for avoid mapping
    to avoid the label-mismatch bug in _fallback_plan.
    """
    ranked = sorted(system_scores, key=lambda s: -s["score"])
    lines = []
    if ranked:
        lines.append(f"PRIORITY: {ranked[0]['label']} {ranked[0]['score']}/100")
    if len(ranked) > 1 and ranked[1]["score"] > 10:
        lines.append(f"SECONDARY: {ranked[1]['label']} {ranked[1]['score']}/100")
    top_system = ranked[0]["system"] if ranked else "general"
    avoid = AVOID_MAP.get(top_system, "stress and stimulants")
    lines.append(f"AVOID: {avoid}")
    return "\n".join(lines)


# ─── Coach Agent (re-export from health_coach for convenience) ────────────────

def generate_coach(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
) -> str:
    """Produce the 4-line coach output matching the Coach Agent format.

    Uses _fallback_advice from health_coach.py, stripped to the 4
    prescription lines (removes the debt level header and priority line).
    """
    from health_coach import _fallback_advice

    raw = _fallback_advice(debt_score, system_scores, stressor_summary)
    # Extract only the 4 prescription lines, normalize to uppercase labels.
    label_map = {
        "right now": "RIGHT NOW",
        "this morning": "THIS MORNING",
        "today": "TODAY",
        "avoid": "AVOID",
    }
    lines = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        clean = stripped.replace("**", "")
        lower = clean.lower()
        for key, label in label_map.items():
            if lower.startswith(key):
                content = clean[len(key):].lstrip(":").strip()
                lines.append(f"{label}: {content}")
                break
    return "\n".join(lines)
