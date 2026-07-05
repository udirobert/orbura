"""
Five-system deterministic scoring engine.
Ported from src/lib/systemScoring.ts and src/lib/stressor-scoring.ts
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

# ─── Types ────────────────────────────────────────────────────────────────────

STRESSOR_TYPES = ["alcohol", "sleep", "training", "stress", "ill", "care"]

RECOVERY_SYSTEMS = ["cardiovascular", "brain", "liver", "muscular", "gut"]

SYSTEM_META = {
    "cardiovascular": {"label": "Cardiovascular", "icon": "🫀", "base_window_hrs": 18},
    "brain": {"label": "Brain / Cognition", "icon": "🧠", "base_window_hrs": 24},
    "liver": {"label": "Liver", "icon": "🫁", "base_window_hrs": 30},
    "muscular": {"label": "Muscular / CNS", "icon": "💪", "base_window_hrs": 48},
    "gut": {"label": "Gut", "icon": "🦠", "base_window_hrs": 36},
}

# ─── Stressor definitions ─────────────────────────────────────────────────────

STRESSOR_DEFS = {
    "alcohol": {"label": "Drank", "icon": "🍺", "base_points": 32},
    "training": {"label": "Trained", "icon": "💪", "base_points": 18},
    "sleep": {"label": "Slept badly", "icon": "😴", "base_points": 24},
    "stress": {"label": "High stress", "icon": "😤", "base_points": 14},
    "ill": {"label": "Feeling ill", "icon": "🤒", "base_points": 35},
    "care": {"label": "Took care of myself", "icon": "✦", "base_points": -10},
}

# ─── Modifiers ────────────────────────────────────────────────────────────────

DRINK_TYPE_MOD = {
    "beer": {"liver": 0.8, "brain": 0.4, "gut": 1.3, "cardio": 0.7},
    "red_wine": {"liver": 1.0, "brain": 0.8, "gut": 0.9, "cardio": 0.8},
    "white_wine": {"liver": 1.0, "brain": 0.7, "gut": 0.8, "cardio": 0.7},
    "spirits": {"liver": 1.4, "brain": 1.3, "gut": 1.0, "cardio": 1.1},
    "cocktails": {"liver": 1.3, "brain": 1.4, "gut": 1.2, "cardio": 1.0},
    "champagne": {"liver": 0.9, "brain": 0.6, "gut": 1.0, "cardio": 0.7},
}

DRINK_COUNT_MOD = {"1-2": 0.5, "3-4": 0.8, "5+": 1.0, "lost_count": 1.2}

TRAINING_CNS = {
    "legs": 1.0,
    "full_body": 1.0,
    "hiit": 0.8,
    "cardio": 0.6,
    "upper": 0.5,
    "mobility": -0.5,
}

TRAINING_CARDIO = {
    "hiit": 1.0,
    "cardio": 0.9,
    "legs": 0.6,
    "full_body": 0.7,
    "upper": 0.3,
    "mobility": -0.3,
}

INTENSITY_MOD = {"easy": 0.4, "hard": 0.85, "destroyed": 1.2}

SLEEP_BRAIN = {"under_4": 1.0, "4-6": 0.75, "6-7": 0.40}

# ─── Science citations ────────────────────────────────────────────────────────

SCIENCE = {
    "liver": {
        "fact": "The liver metabolises approximately one standard drink per hour. Processing speed cannot be accelerated by sleep, coffee, or exercise.",
        "cite": "Lieber, Physiological Reviews, 1997",
    },
    "muscular": {
        "fact": "Alcohol consumed within 24 hours of resistance training reduces muscle protein synthesis by up to 37%, even when protein intake is maintained.",
        "cite": "Parr et al., PLOS ONE, 2014",
    },
    "gut": {
        "fact": "A single episode of heavy drinking alters gut microbiome composition within 24 hours, increasing intestinal permeability and systemic inflammation.",
        "cite": "Bishehsari et al., Alcohol Research, 2017",
    },
    "brain": {
        "fact": "Sleep deprivation of even one night impairs prefrontal cortex function equivalently to 0.08% blood alcohol concentration.",
        "cite": "Harrison & Horne, Journal of Sleep Research, 2000",
    },
    "cardiovascular": {
        "fact": "Resting heart rate remains elevated for 12–24 hours after alcohol consumption as the autonomic nervous system works to restore balance.",
        "cite": "Spaak et al., Journal of the American College of Cardiology, 2008",
    },
}


# ─── Data classes ─────────────────────────────────────────────────────────────


@dataclass
class Stressor:
    type: str
    alcohol_type: Optional[str] = None
    alcohol_count: Optional[str] = None
    training_area: Optional[str] = None
    training_intensity: Optional[str] = None
    sleep_hours: Optional[str] = None
    stress_carried: Optional[str] = None
    ill_severity: Optional[str] = None


@dataclass
class SystemScore:
    system: str
    label: str
    icon: str
    score: int
    cleared_at: str
    recovery_hrs: float
    cause_text: str
    action_text: str
    science_fact: Optional[str] = None
    science_cite: Optional[str] = None


# ─── Live score (quick meter) ─────────────────────────────────────────────────


def compute_live_score(stressors: list[Stressor]) -> int:
    score = 0
    for s in stressors:
        defn = STRESSOR_DEFS.get(s.type)
        if not defn:
            continue
        score += defn["base_points"]
        if s.type == "training" and s.training_area == "mobility":
            score -= int(defn["base_points"] * 1.5)
        if s.type == "training" and s.training_intensity == "destroyed":
            score += 8
        if s.type == "alcohol" and s.alcohol_type == "spirits":
            score += 6
        if s.type == "alcohol" and s.alcohol_count == "5+":
            score += 8
        if s.type == "alcohol" and s.alcohol_count == "lost_count":
            score += 12
    return max(0, min(100, score))


# ─── Five-system scoring ──────────────────────────────────────────────────────


def compute_system_scores(
    stressors: list[Stressor],
    now: Optional[datetime] = None,
    bed_time: Optional[str] = None,
    wake_time: Optional[str] = None,
) -> list[SystemScore]:
    if now is None:
        now = datetime.now()

    raw = {s: 0.0 for s in RECOVERY_SYSTEMS}

    for s in stressors:
        if s.type == "alcohol":
            drink_mod = DRINK_TYPE_MOD.get(s.alcohol_type or "beer", DRINK_TYPE_MOD["beer"])
            count_mod = DRINK_COUNT_MOD.get(s.alcohol_count or "3-4", 0.8)
            base = 30
            raw["liver"] += base * drink_mod["liver"] * count_mod
            raw["brain"] += base * drink_mod["brain"] * count_mod
            raw["gut"] += base * drink_mod["gut"] * count_mod
            raw["cardiovascular"] += base * drink_mod["cardio"] * count_mod * 0.5

        if s.type == "training":
            area = s.training_area or "full_body"
            intensity = s.training_intensity or "hard"
            cns = TRAINING_CNS.get(area, 0.5) * INTENSITY_MOD.get(intensity, 0.85)
            cardio = TRAINING_CARDIO.get(area, 0.5) * INTENSITY_MOD.get(intensity, 0.85)
            raw["muscular"] += 40 * cns
            raw["cardiovascular"] += 35 * cardio

        if s.type == "sleep":
            brain_hit = SLEEP_BRAIN.get(s.sleep_hours or "4-6", 0.75)
            raw["brain"] += 35 * brain_hit
            raw["gut"] += 15 * brain_hit

        if s.type == "stress":
            carried = s.stress_carried != "mostly_gone"
            raw["brain"] += 28 if carried else 14
            raw["cardiovascular"] += 15 if carried else 7

        if s.type == "ill":
            sev_mod = 1.2 if s.ill_severity == "floored" else (0.6 if s.ill_severity == "mild" else 0.9)
            raw["gut"] += 30 * sev_mod
            raw["brain"] += 20 * sev_mod
            raw["muscular"] += 15 * sev_mod
            raw["cardiovascular"] += 12 * sev_mod

        if s.type == "care":
            raw["brain"] -= 8
            raw["cardiovascular"] -= 8
            raw["liver"] -= 5
            raw["muscular"] -= 5
            raw["gut"] -= 5

    if bed_time and wake_time:
        penalty = circadian_penalty(bed_time, wake_time)
        raw["brain"] += penalty["brain_pts"]
        raw["cardiovascular"] += penalty["cardio_pts"]

    results = []
    for system in RECOVERY_SYSTEMS:
        meta = SYSTEM_META[system]
        score = max(0, min(100, round(raw[system])))
        recovery_hrs = (score / 100) * meta["base_window_hrs"]
        cleared_at = now + timedelta(hours=recovery_hrs)
        science = SCIENCE.get(system)

        results.append(
            SystemScore(
                system=system,
                label=meta["label"],
                icon=meta["icon"],
                score=score,
                cleared_at=cleared_at.strftime("%I:%M%p %A").lstrip("0"),
                recovery_hrs=round(recovery_hrs, 1),
                cause_text=_build_cause_text(system, stressors),
                action_text=_build_action_text(system, stressors),
                science_fact=science["fact"] if science else None,
                science_cite=science["cite"] if science else None,
            )
        )
    return results


# ─── Circadian penalty ────────────────────────────────────────────────────────


def _parse_hour(time_str: str) -> Optional[float]:
    import re

    clean = time_str.strip().upper()
    m = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)?$", clean)
    if not m:
        return None
    h = int(m.group(1))
    mins = int(m.group(2))
    period = m.group(3)
    if period == "PM" and h != 12:
        h += 12
    if period == "AM" and h == 12:
        h = 0
    return h + mins / 60


def circadian_penalty(bed_time: str, wake_time: str) -> dict:
    bed = _parse_hour(bed_time)
    wake = _parse_hour(wake_time)
    if bed is None or wake is None:
        return {"brain_pts": 0, "cardio_pts": 0, "label": "unknown"}

    sleep_hrs = (24 - bed) + wake if bed > wake else wake - bed

    brain_pts = 0
    cardio_pts = 0
    label = "aligned"

    if 0 <= bed < 2:
        brain_pts, cardio_pts, label = 10, 5, "mild misalignment"
    elif 2 <= bed < 4:
        brain_pts, cardio_pts, label = 22, 10, "significant misalignment"
    elif 4 <= bed < 6:
        brain_pts, cardio_pts, label = 32, 16, "severe misalignment"

    if 0 < sleep_hrs < 6:
        brain_pts += round((6 - sleep_hrs) * 4)

    return {"brain_pts": brain_pts, "cardio_pts": cardio_pts, "label": label}


# ─── Helper text builders ─────────────────────────────────────────────────────


def _build_cause_text(system: str, stressors: list[Stressor]) -> str:
    alcohol = next((s for s in stressors if s.type == "alcohol"), None)
    training = next((s for s in stressors if s.type == "training"), None)
    sleep = next((s for s in stressors if s.type == "sleep"), None)
    stress = next((s for s in stressors if s.type == "stress"), None)
    ill = next((s for s in stressors if s.type == "ill"), None)

    if system == "liver":
        if alcohol:
            t = (alcohol.alcohol_type or "alcohol").replace("_", " ")
            c = alcohol.alcohol_count or "several drinks"
            return f"{t.capitalize()} — {c} units to process"
        return "No significant liver load"

    if system == "brain":
        if alcohol and alcohol.alcohol_type in ("spirits", "cocktails"):
            return "Spirits/cocktails hit cognition hardest. Decision quality reduced."
        if sleep:
            return f"{(sleep.sleep_hours or 'Poor sleep').replace('_', ' ')} — cognitive recovery in progress"
        if stress and stress.stress_carried != "mostly_gone":
            return "Stress hormones still elevated. Focus window reduced."
        return "Mild cognitive load"

    if system == "cardiovascular":
        if training and training.training_area in ("hiit", "cardio"):
            return f"{training.training_area.upper()} session — heart rate recovery active"
        if alcohol:
            return "Alcohol elevates resting HR for 12–18hrs"
        return "Mild cardiovascular load"

    if system == "muscular":
        if training:
            area = (training.training_area or "training").replace("_", " ").capitalize()
            intensity = training.training_intensity or "hard"
            return f"{area} session at {intensity} intensity — CNS repair ongoing"
        return "No significant muscular load"

    if system == "gut":
        if alcohol and alcohol.alcohol_type == "beer":
            return "Beer — carbonation and fermentation byproducts affecting gut"
        if alcohol and alcohol.alcohol_type == "cocktails":
            return "Cocktail mixers adding fructose and gut load"
        if sleep:
            return "Poor sleep disrupts gut microbiome rhythm"
        if ill:
            return "Illness affecting gut barrier function"
        return "Minimal gut load"

    return ""


def _build_action_text(system: str, stressors: list[Stressor]) -> str:
    alcohol = next((s for s in stressors if s.type == "alcohol"), None)
    training = next((s for s in stressors if s.type == "training"), None)

    if system == "liver":
        return (
            "Avoid further alcohol. 500ml water + electrolytes now."
            if alcohol
            else "Liver clear — no action needed."
        )
    if system == "brain":
        return "No decisions requiring deep focus until your window opens."
    if system == "cardiovascular":
        return (
            "No cardio today. Walk only."
            if training and training.training_intensity == "destroyed"
            else "Keep activity light until cleared."
        )
    if system == "muscular":
        return (
            "Protein within 2 hrs. No re-training the same group today."
            if training
            else "No significant muscular debt."
        )
    if system == "gut":
        return (
            "Bland foods, no coffee on an empty stomach, no more alcohol."
            if alcohol
            else "Probiotic-rich foods will help speed gut clearance."
        )
    return ""


# ─── Counterfactual engine ────────────────────────────────────────────────────
#
# "If you had slept 7+ hours, Brain debt would drop from 67 to 22."
#
# The most leveraged single change to the user's stress profile. We find the
# highest non-cleared system, identify the stressor contributing most to it,
# and propose a single reversible flip (e.g. sleep 4-6 -> 6-7) that would
# lower the score the most. Returned as a renderable sentence.

COUNTERFACTUAL_FLIPS = {
    "sleep": {
        "field": "sleep_hours",
        "from_to": {"under_4": "6-7", "4-6": "6-7", "6-7": "6-7"},
        "label": "slept 7+ hours",
    },
    "training": {
        "field": "training_intensity",
        "from_to": {"destroyed": "easy", "hard": "easy", "easy": "easy"},
        "label": "trained easy instead of hard",
    },
    "alcohol": {
        "field": "alcohol_count",
        "from_to": {"lost_count": "1-2", "5+": "1-2", "3-4": "1-2", "1-2": "1-2"},
        "label": "kept it to 1–2 drinks",
    },
    "stress": {
        "field": "stress_carried",
        "from_to": {"yes": "mostly_gone", "mostly_gone": "mostly_gone"},
        "label": "let the stress clear",
    },
    "ill": {
        "field": "ill_severity",
        "from_to": {"floored": "mild", "moderate": "mild", "mild": "mild"},
        "label": "caught the illness earlier",
    },
}

SYSTEM_LABEL_NICE = {
    "cardiovascular": "Cardiovascular",
    "brain": "Brain",
    "liver": "Liver",
    "muscular": "Muscular / CNS",
    "gut": "Gut",
}


def compute_counterfactual(
    stressors: list,
    current_system_scores: list,
    bed_time: Optional[str] = None,
    wake_time: Optional[str] = None,
) -> Optional[dict]:
    """Return the single highest-leverage change the user could make.

    Returns a dict {system, from_score, to_score, drop, lever_label} or None
    if no clear lever exists.
    """
    ranked = sorted(current_system_scores, key=lambda s: -s.score)
    target = next((s for s in ranked if s.score > 20), None)
    if not target:
        return None

    for s in stressors:
        if s.type not in COUNTERFACTUAL_FLIPS:
            continue
        flip = COUNTERFACTUAL_FLIPS[s.type]
        field = flip["field"]
        current_val = getattr(s, field, None)
        if current_val is None:
            continue
        target_val = flip["from_to"].get(current_val)
        if target_val is None or target_val == current_val:
            continue
        modified = []
        for s2 in stressors:
            if s2 is s:
                modified.append(Stressor(**{**s2.__dict__, field: target_val}))
            else:
                modified.append(s2)
        new_scores = compute_system_scores(
            modified,
            now=datetime.now(),
            bed_time=bed_time,
            wake_time=wake_time,
        )
        new_target = next((x for x in new_scores if x.system == target.system), None)
        if new_target is None:
            continue
        drop = target.score - new_target.score
        if drop <= 0:
            continue
        return {
            "system": target.system,
            "system_label": SYSTEM_LABEL_NICE.get(target.system, target.system),
            "from_score": target.score,
            "to_score": new_target.score,
            "drop": drop,
            "lever_label": flip["label"],
        }
    return None

