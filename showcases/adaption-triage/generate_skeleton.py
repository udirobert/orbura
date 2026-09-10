#!/usr/bin/env python3
"""Deterministic skeleton generator for the GLP-1 check-in triage dataset.

Produces protocol-grounded examples with exact ground-truth labels. The
patient_message field uses templated phrasing with variation — this is the
surface that Adaption "Invent a Dataset" is expected to enrich with realistic
free-text. The structured fields (observations, allowed_actions, labels) are
deterministic and must not be altered by the augmentation tool.

Titration schedule (semaglutide/Wegovy pattern):
  weeks 1-4:  0.25 mg
  weeks 5-8:  0.5 mg
  weeks 9-12: 1.0 mg
  weeks 13+:  1.7 mg, then 2.4 mg (extended protocol, not in default 12-week wedge)

Hard constraints enforced by construction:
  1. selected_action_id is always a member of allowed_actions.
  2. escalation_signal == True  =>  selected_action_id == "escalate_clinician".
  3. explanation_text contains no diagnostic/dose/outcome language.
  4. current_dose_mg is consistent with week unless dose_confusion case.
  5. No real patient data, clinician names, or clinic identifiers.
"""
import json
import random
from pathlib import Path

OUT_DIR = Path(__file__).parent / "data"

# ---------------------------------------------------------------------------
# Protocol constants
# ---------------------------------------------------------------------------

TITRATION = {
    1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25,
    5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5,
    9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0,
}

SYMPTOMS = [
    "nausea", "vomiting", "diarrhoea", "constipation", "cramping", "bloating",
    "heartburn", "injection_site_redness", "injection_site_itch",
    "appetite_loss", "appetite_increase", "fatigue", "dizziness",
    "insomnia", "vivid_dreams", "low_mood", "anxiety", "irritability",
    "headache", "dry_mouth", "thirst", "reduced_urination",
]

SEVERITY_LEVELS = ["mild", "moderate", "severe"]

OBSERVATION_CLASSES = [
    "no_symptom", "gi_mild", "gi_moderate", "gi_severe",
    "injection_site", "appetite_change", "fatigue", "dizziness",
    "sleep_disturbance", "mood_change", "dose_confusion", "missed_dose", "other",
]

TEMPORAL_PATTERNS = [
    "isolated", "recurring_same_day", "recurring_multi_day",
    "worsening", "improving", "post_dose",
]

# Allowed-action pool. Each example gets a subset appropriate to its scenario.
ACTION_POOL = {
    "hold_and_monitor": {
        "label": "Continue dose, monitor 24h",
        "applicable": "mild symptoms, no red flags",
    },
    "rehydrate_small_sips": {
        "label": "Small sips, bland food",
        "applicable": "mild GI symptoms",
    },
    "eat_small_plain_meals": {
        "label": "Small plain meals today",
        "applicable": "appetite loss with mild GI",
    },
    "rest_light_activity": {
        "label": "Rest, reduce activity",
        "applicable": "fatigue or dizziness, mild",
    },
    "inject_site_rotate": {
        "label": "Rotate injection site next dose",
        "applicable": "injection site reaction, mild",
    },
    "missed_dose_protocol": {
        "label": "Follow missed-dose rule",
        "applicable": "missed or uncertain dose",
    },
    "reconfirm_dose": {
        "label": "Verify dose before next injection",
        "applicable": "dose confusion, no harm",
    },
    "escalate_clinician": {
        "label": "Flag for clinician review",
        "applicable": "red flag present",
    },
    "no_action_routine": {
        "label": "Continue plan, no action needed",
        "applicable": "routine check-in, no symptoms",
    },
}

GI_SYMPTOMS = {"nausea", "vomiting", "diarrhoea", "constipation", "cramping",
                "bloating", "heartburn"}
DEHYDRATION_SIGNS = {"thirst", "reduced_urination", "dry_mouth"}
SITE_SYMPTOMS = {"injection_site_redness", "injection_site_itch"}
APPETITE_SYMPTOMS = {"appetite_loss", "appetite_increase"}
SLEEP_SYMPTOMS = {"insomnia", "vivid_dreams"}
MOOD_SYMPTOMS = {"low_mood", "anxiety", "irritability"}

# Red-flag triggers — any of these => escalation_signal = True
REDFLAG_TRIGGERS = [
    "severe_gi_dehydration",      # severe GI + dehydration sign
    "persistent_vomiting_24h",    # vomiting not resolved, onset > 24h
    "severe_abdominal_pain",      # cramping severe
    "syncope",                    # dizziness severe
    "severe_mood",                # low_mood severe or suicidal ideation phrase
    "allergic_reaction",          # injection_site_redness severe + other systemic
    "missed_dose_rebound",        # missed dose + appetite_increase
    "any_severe",                 # any symptom at severe band
]


# ---------------------------------------------------------------------------
# Scenario distribution (weights sum to 100)
# ---------------------------------------------------------------------------

SCENARIO_WEIGHTS = [
    ("routine", 40),
    ("gi_mild_mod", 35),
    ("dose_or_site", 15),
    ("escalation", 8),
    ("ambiguous", 2),
]


def weighted_scenario():
    population = []
    for name, weight in SCENARIO_WEIGHTS:
        population.extend([name] * weight)
    return random.choice(population)


# ---------------------------------------------------------------------------
# Patient message templates
# These are deliberately templated. Adaption's tool is expected to produce
# realistic free-text variation. The templates exist so the skeleton is
# self-validating: each template maps to exactly one ground-truth label set.
# ---------------------------------------------------------------------------

ROUTINE_MESSAGES = [
    "all good today, no issues",
    "feeling fine, took my dose as normal",
    "no problems to report",
    "doing well, no side effects",
    "good day today, nothing bothering me",
    "fine, just checking in",
    "all okay, no symptoms",
    "feeling normal today",
    "no complaints, going well",
    "regular check-in, nothing to note",
]

GI_MILD_MESSAGES = [
    "a bit nauseous since my jab",
    "felt queasy after last nights dose",
    "slightly sick to my stomach today",
    "bit of nausea but managing",
    "tummy's a bit off since the injection",
    "mild queasiness, not too bad",
    "feel a bit sick but eating okay",
    "slight nausea, drinking water fine",
    "stomach feels delicate today",
    "bit off but not terrible",
]

GI_MODERATE_MESSAGES = [
    "quite nauseous, struggling to eat",
    "been sick a couple times today",
    "nausea is bad today, barely eaten",
    "threw up once, feel rough",
    "stomach really bothering me today",
    "quite unwell, lots of nausea",
    "can't keep much down today",
    "feeling properly sick, not like usual",
    "vomiting on and off, feel awful",
    "GI issues bad today, hard to function",
]

DIARRHOEA_MESSAGES = [
    "been to the loo a lot today",
    "diarrhoea since this morning",
    "stomach's upset, loose since jab",
    "keep needing the toilet",
    "loose stools all day",
]

CONSTIPATION_MESSAGES = [
    "haven't been able to go for days",
    "constipated since starting the dose",
    "blocked up, uncomfortable",
    "not been to the loo properly in a while",
]

HEARTBURN_MESSAGES = [
    "bad heartburn today",
    "acid reflux since my injection",
    "burning in my chest after eating",
    "indigestion really bad today",
]

INJECTION_SITE_MESSAGES = [
    "red patch where I injected",
    "injection site is a bit itchy",
    "sore where I did my jab",
    "lump at injection site",
    "site's a bit red and warm",
]

MISSED_DOSE_MESSAGES = [
    "forgot my jab yesterday",
    "missed my dose, what do I do",
    "didn't take it on the right day",
    "skipped my injection by mistake",
    "missed yesterday's dose",
]

DOSE_CONFUSION_MESSAGES = [
    "not sure if I took the right amount",
    "think I might have taken too much",
    "did I do 0.25 or 0.5? can't remember",
    "unsure about my dose today",
    "might have mixed up the doses",
]

FATIGUE_MESSAGES = [
    "really tired today",
    "exhausted, no energy",
    "knackered since my jab",
    "can't stop yawning, so tired",
    "drained and worn out",
]

DIZZINESS_MESSAGES = [
    "a bit dizzy today",
    "lightheaded since my injection",
    "felt woozy this morning",
    "head spinning a bit",
]

APPETITE_LOSS_MESSAGES = [
    "not hungry at all today",
    "no appetite since the jab",
    "food doesn't appeal to me",
    "haven't wanted to eat much",
]

APPETITE_INCREASE_MESSAGES = [
    "really hungry today, more than usual",
    "craving food, appetite's back",
    "can't stop eating today",
]

MOOD_MESSAGES = [
    "feeling a bit low today",
    "down since starting the jabs",
    "mood's been off",
    "a bit anxious lately",
    "irritable and snappy today",
]

SLEEP_MESSAGES = [
    "can't sleep properly",
    "weird vivid dreams since the jab",
    "tossing and turning all night",
    "dreams are really intense",
]

# Escalation-specific messages (these always trigger escalation_signal)
ESCALATION_SEVERE_GI_MESSAGES = [
    "been vomiting all day, can't keep water down",
    "really sick, throwing up constantly",
    "can't stop being sick, feel dreadful",
    "vomiting nonstop, feel really weak",
]

ESCALATION_DEHYDRATION_MESSAGES = [
    "sick all day and barely peeing",
    "vomiting and really thirsty, dark urine",
    "can't keep fluids down, not peeing much",
]

ESCALATION_ABDOMINAL_MESSAGES = [
    "severe pain in my stomach, really bad",
    "agonising cramps, can't stand up",
    "awful abdominal pain, worse than usual",
]

ESCALATION_SYNCOPE_MESSAGES = [
    "nearly passed out, vision went black",
    "felt like I was going to faint",
    "got so dizzy I fell over",
    "everything went spinny and I collapsed",
]

ESCALATION_MOOD_MESSAGES = [
    "having really dark thoughts, don't want to be here",
    "feel like I can't go on",
    "really struggling mentally, bad thoughts",
    "feeling hopeless and desperate",
]

ESCALATION_ALLERGIC_MESSAGES = [
    "whole injection arm swollen and red, spreading",
    "hives everywhere since my jab, throat tight",
    "bad reaction, swelling and difficulty breathing",
]

ESCALATION_MISSED_REBOUND_MESSAGES = [
    "missed my dose and now I'm binge eating constantly",
    "forgot my jab and appetite's gone mad, eating everything",
]

# Ambiguous / low-literacy / multilingual-English messages
AMBIGUOUS_MESSAGES = [
    "the thing make me no good",
    "body not fine after the medicine",
    "me feel sick small small today",
    "the injection area is paining somehow",
    "I take the medicine but something is wrong",
    "since morning I am not feeling proper",
    "the jab give me problem in stomach area",
    "I am not understanding what is happening to me",
    "after medicine my body is doing something",
    "small problem with the injection but I don't know how to explain",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def dose_for_week(week):
    return TITRATION.get(week, 1.0)


def make_observation(symptom, severity, onset_hours, resolved):
    return {
        "symptom": symptom,
        "severity": severity,
        "onset_hours_ago": onset_hours,
        "resolved": resolved,
    }


def make_allowed_action_subset(keys):
    return [
        {"action_id": k, "action_label": ACTION_POOL[k]["label"],
         "when_applicable": ACTION_POOL[k]["applicable"]}
        for k in keys
    ]


def classify_observation(symptoms_with_severity):
    """Determine observation_class from the set of symptoms."""
    if not symptoms_with_severity:
        return "no_symptom"
    syms = {s for s, _ in symptoms_with_severity}
    sevs = {sev for _, sev in symptoms_with_severity}
    max_sev = "severe" if "severe" in sevs else ("moderate" if "moderate" in sevs else "mild")

    gi_present = syms & GI_SYMPTOMS
    site_present = syms & SITE_SYMPTOMS
    appetite_present = syms & APPETITE_SYMPTOMS
    sleep_present = syms & SLEEP_SYMPTOMS
    mood_present = syms & MOOD_SYMPTOMS

    # Priority: GI > site > appetite > mood > sleep > fatigue > dizziness
    if gi_present:
        if max_sev == "severe":
            return "gi_severe"
        elif max_sev == "moderate":
            return "gi_moderate"
        else:
            return "gi_mild"
    if site_present:
        return "injection_site"
    if appetite_present:
        return "appetite_change"
    if mood_present:
        return "mood_change"
    if sleep_present:
        return "sleep_disturbance"
    if "fatigue" in syms:
        return "fatigue"
    if "dizziness" in syms:
        return "dizziness"
    return "other"


def severity_band_from_observations(observations):
    if not observations:
        return "none"
    sevs = [o["severity"] for o in observations]
    if "severe" in sevs:
        return "severe"
    if "moderate" in sevs:
        return "moderate"
    if "mild" in sevs:
        return "mild"
    return "none"


def temporal_pattern_from_observations(observations, is_post_dose=False):
    if not observations:
        return "isolated"
    if is_post_dose:
        return "post_dose"
    onsets = [o["onset_hours_ago"] for o in observations]
    resolved = [o["resolved"] for o in observations]
    if all(r for r in resolved):
        return "improving"
    max_onset = max(onsets)
    if max_onset > 24:
        return "recurring_multi_day"
    if len(observations) > 1:
        return "recurring_same_day"
    return "isolated"


def check_red_flags(observations, observation_class, patient_message_lower):
    """Return (escalation_signal, trigger_name or None)."""
    syms_sev = {(o["symptom"], o["severity"]) for o in observations}
    syms = {o["symptom"] for o in observations}
    sevs = {o["severity"] for o in observations}

    # any severe band
    if "severe" in sevs:
        # Determine specific trigger for coverage tracking
        if "cramping" in syms:
            return True, "severe_abdominal_pain"
        if "dizziness" in syms:
            return True, "syncope"
        if "low_mood" in syms:
            return True, "severe_mood"
        if "injection_site_redness" in syms:
            return True, "allergic_reaction"
        if syms & GI_SYMPTOMS and syms & DEHYDRATION_SIGNS:
            return True, "severe_gi_dehydration"
        if "vomiting" in syms:
            vomit_obs = [o for o in observations if o["symptom"] == "vomiting"]
            if vomit_obs and vomit_obs[0]["onset_hours_ago"] > 24 and not vomit_obs[0]["resolved"]:
                return True, "persistent_vomiting_24h"
            return True, "severe_gi_dehydration"
        return True, "any_severe"

    # persistent vomiting > 24h (even if not labelled severe)
    vomit_obs = [o for o in observations if o["symptom"] == "vomiting"]
    if vomit_obs and vomit_obs[0]["onset_hours_ago"] > 24 and not vomit_obs[0]["resolved"]:
        return True, "persistent_vomiting_24h"

    # severe GI + dehydration (moderate vomiting + dehydration signs)
    if (syms & GI_SYMPTOMS) and (syms & DEHYDRATION_SIGNS):
        gi_sevs = [o["severity"] for o in observations if o["symptom"] in GI_SYMPTOMS]
        if "moderate" in gi_sevs or "severe" in gi_sevs:
            return True, "severe_gi_dehydration"

    # suicidal ideation phrases (even without severe label)
    ideation_phrases = ["dark thoughts", "don't want to be here",
                        "can't go on", "hopeless", "desperate", "end it"]
    if any(p in patient_message_lower for p in ideation_phrases):
        return True, "severe_mood"

    # missed dose + rebound hyperphagia
    if "appetite_increase" in syms:
        msg_has_missed = any(p in patient_message_lower for p in
                             ["missed", "forgot", "skipped"])
        if msg_has_missed:
            return True, "missed_dose_rebound"

    # allergic reaction: spreading/swelling/throat phrases
    allergic_phrases = ["swollen", "spreading", "hives", "throat tight",
                        "difficulty breathing", "swelling"]
    if any(p in patient_message_lower for p in allergic_phrases):
        return True, "allergic_reaction"

    return False, None


def select_action(allowed_keys, escalation_signal, observation_class, symptoms):
    """Select the best action from allowed_keys given the scenario."""
    if escalation_signal:
        # Hard constraint: must be escalate_clinician
        assert "escalate_clinician" in allowed_keys, \
            "escalate_clinician must be in allowed_actions when escalation_signal is True"
        return "escalate_clinician"

    if observation_class == "no_symptom":
        if "no_action_routine" in allowed_keys:
            return "no_action_routine"
        return "hold_and_monitor"

    syms = {s for s in symptoms}

    # GI symptoms
    if observation_class in ("gi_mild", "gi_moderate"):
        if syms & APPETITE_SYMPTOMS and "eat_small_plain_meals" in allowed_keys:
            return "eat_small_plain_meals"
        if "rehydrate_small_sips" in allowed_keys:
            return "rehydrate_small_sips"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "injection_site":
        if "inject_site_rotate" in allowed_keys:
            return "inject_site_rotate"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "appetite_change":
        if "eat_small_plain_meals" in allowed_keys and "appetite_loss" in syms:
            return "eat_small_plain_meals"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "fatigue":
        if "rest_light_activity" in allowed_keys:
            return "rest_light_activity"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "dizziness":
        if "rest_light_activity" in allowed_keys:
            return "rest_light_activity"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "sleep_disturbance":
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "mood_change":
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "missed_dose":
        if "missed_dose_protocol" in allowed_keys:
            return "missed_dose_protocol"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    if observation_class == "dose_confusion":
        if "reconfirm_dose" in allowed_keys:
            return "reconfirm_dose"
        if "hold_and_monitor" in allowed_keys:
            return "hold_and_monitor"

    # Fallback
    if "hold_and_monitor" in allowed_keys:
        return "hold_and_monitor"
    return allowed_keys[0]


def build_explanation(week, dose, observation_class, severity, temporal,
                      action_id, symptoms):
    """Generate non-prescriptive, second-person explanation text."""
    syms = list(symptoms)

    if action_id == "no_action_routine":
        return (f"Your week {week} check-in looks routine with no symptoms to flag. "
                f"Continue with your current plan and check in again tomorrow.")

    if action_id == "escalate_clinician":
        return (f"Your symptoms need a clinician's review before we suggest anything else. "
                f"I've flagged this for the care team — they'll be in touch within their "
                f"response window. In the meantime, keep sipping fluids if you can and "
                f"don't take your next dose until you've heard from them.")

    if action_id == "rehydrate_small_sips":
        return (f"Mild GI symptoms in week {week} on {dose} mg are common as your body "
                f"adjusts. Try small sips of water or an electrolyte drink, avoid food "
                f"for about an hour, then try something plain. Log how you feel tomorrow.")

    if action_id == "eat_small_plain_meals":
        return (f"Nausea and reduced appetite since your last dose can happen in week {week}. "
                f"Try small plain meals today — toast, rice, crackers — and keep sipping water. "
                f"If it gets worse or you can't keep fluids down, let us know and we'll flag "
                f"the care team.")

    if action_id == "hold_and_monitor":
        return (f"Your symptoms are mild and within what we'd expect for week {week} on "
                f"{dose} mg. Continue your current dose, monitor for 24 hours, and log "
                f"how you feel tomorrow. If things get worse, check in again.")

    if action_id == "rest_light_activity":
        return (f"Fatigue and dizziness can happen as your body adjusts. Take it easy today, "
                f"avoid driving if you feel lightheaded, and hydrate. If dizziness gets worse "
                f"or you feel faint, check in again straight away.")

    if action_id == "inject_site_rotate":
        return (f"Mild redness or itchiness at the injection site is common. Rotate to a "
                f"different site for your next dose and keep an eye on it. If the redness "
                f"spreads, swells, or you feel unwell more generally, let us know right away.")

    if action_id == "missed_dose_protocol":
        return (f"For a missed dose: if it's been more than 5 days since your last injection, "
                f"skip the missed one and resume on your next scheduled day. If it's been less "
                f"than 5 days, take it when you remember and then continue your normal schedule. "
                f"Don't double up.")

    if action_id == "reconfirm_dose":
        return (f"It's important we confirm your dose before your next injection. Check your "
                f"pen against your prescribed schedule for week {week} ({dose} mg) and if "
                f"you're still unsure, the care team can confirm. Don't inject until you're "
                f"certain.")

    return (f"Continue with your current plan for week {week}. Monitor your symptoms and "
            f"check in again tomorrow.")


def build_clinician_snippet(week, dose, observation_class, severity,
                            temporal, escalation_signal):
    esc = "ESCALATION SIGNAL" if escalation_signal else "no escalation signal"
    return (f"Week {week}, {dose} mg: {observation_class} ({severity}, {temporal}), "
            f"{esc}.")


# ---------------------------------------------------------------------------
# Scenario generators
# ---------------------------------------------------------------------------

def scenario_routine():
    week = random.randint(1, 12)
    dose = dose_for_week(week)
    msg = random.choice(ROUTINE_MESSAGES)
    observations = []
    allowed = make_allowed_action_subset(["no_action_routine", "hold_and_monitor"])
    obs_class = "no_symptom"
    sev = "none"
    temporal = "isolated"
    esc = False
    action = "no_action_routine"
    return _assemble(week, dose, msg, observations, allowed, obs_class,
                     sev, temporal, esc, action, [])


def scenario_gi_mild_mod():
    week = random.randint(1, 12)
    dose = dose_for_week(week)
    is_mild = random.random() < 0.6  # 60% mild, 40% moderate

    # Pick GI symptom(s)
    gi_pool = ["nausea", "bloating", "cramping", "heartburn", "diarrhoea",
               "constipation", "vomiting"]
    n_symptoms = random.choices([1, 2], weights=[70, 30])[0]
    chosen = random.sample(gi_pool, n_symptoms)

    severity = "mild" if is_mild else "moderate"
    onset = random.randint(2, 18)
    resolved = False

    observations = [make_observation(s, severity, onset, resolved) for s in chosen]

    # Sometimes add appetite loss
    if random.random() < 0.4 and "appetite_loss" not in chosen:
        observations.append(make_observation("appetite_loss", severity,
                                              random.randint(6, 24), False))

    # Pick message
    if is_mild:
        if "diarrhoea" in chosen:
            msg = random.choice(DIARRHOEA_MESSAGES)
        elif "constipation" in chosen:
            msg = random.choice(CONSTIPATION_MESSAGES)
        elif "heartburn" in chosen:
            msg = random.choice(HEARTBURN_MESSAGES)
        else:
            msg = random.choice(GI_MILD_MESSAGES)
    else:
        if "vomiting" in chosen:
            msg = random.choice(GI_MODERATE_MESSAGES)
        else:
            msg = random.choice(GI_MODERATE_MESSAGES)

    syms = [o["symptom"] for o in observations]
    obs_class = classify_observation([(o["symptom"], o["severity"]) for o in observations])
    sev = severity_band_from_observations(observations)
    is_post_dose = onset < 12
    temporal = temporal_pattern_from_observations(observations, is_post_dose)

    esc, _ = check_red_flags(observations, obs_class, msg.lower())

    allowed_keys = ["hold_and_monitor", "rehydrate_small_sips", "eat_small_plain_meals",
                    "escalate_clinician"]
    allowed = make_allowed_action_subset(allowed_keys)
    action = select_action(allowed_keys, esc, obs_class, syms)

    return _assemble(week, dose, msg, observations, allowed, obs_class,
                     sev, temporal, esc, action, syms)


def scenario_dose_or_site():
    week = random.randint(1, 12)
    dose = dose_for_week(week)
    sub = random.choice(["missed_dose", "dose_confusion", "injection_site"])

    if sub == "missed_dose":
        msg = random.choice(MISSED_DOSE_MESSAGES)
        # Sometimes dose confusion produces wrong dose in the record
        wrong_dose = dose
        if random.random() < 0.15:
            # dose_confusion edge case: reported dose doesn't match week
            wrong_dose = random.choice([d for d in [0.25, 0.5, 1.0] if d != dose])
        observations = []
        obs_class = "missed_dose"
        sev = "none"
        temporal = "isolated"
        allowed_keys = ["missed_dose_protocol", "hold_and_monitor", "escalate_clinician"]

    elif sub == "dose_confusion":
        msg = random.choice(DOSE_CONFUSION_MESSAGES)
        wrong_dose = dose
        if random.random() < 0.5:
            wrong_dose = random.choice([d for d in [0.25, 0.5, 1.0] if d != dose])
        observations = []
        obs_class = "dose_confusion"
        sev = "none"
        temporal = "isolated"
        allowed_keys = ["reconfirm_dose", "hold_and_monitor", "escalate_clinician"]

    else:  # injection_site
        msg = random.choice(INJECTION_SITE_MESSAGES)
        wrong_dose = dose
        severity = random.choice(["mild", "mild", "moderate"])
        site_sym = random.choice(["injection_site_redness", "injection_site_itch"])
        observations = [make_observation(site_sym, severity,
                                          random.randint(2, 48), False)]
        obs_class = "injection_site"
        sev = severity
        temporal = "post_dose" if random.random() < 0.5 else "isolated"
        allowed_keys = ["inject_site_rotate", "hold_and_monitor", "escalate_clinician"]

    allowed = make_allowed_action_subset(allowed_keys)
    esc, _ = check_red_flags(observations if sub == "injection_site" else [],
                              obs_class, msg.lower())
    syms = [o["symptom"] for o in observations]
    action = select_action(allowed_keys, esc, obs_class, syms)

    return _assemble(week, wrong_dose, msg, observations, allowed, obs_class,
                     sev, temporal, esc, action, syms, actual_dose=dose,
                     dose_mismatch=(wrong_dose != dose))


def scenario_escalation():
    week = random.randint(1, 12)
    dose = dose_for_week(week)
    trigger = random.choice(REDFLAG_TRIGGERS)

    if trigger == "severe_gi_dehydration":
        msg = random.choice(ESCALATION_DEHYDRATION_MESSAGES)
        observations = [
            make_observation("vomiting", "severe", random.randint(8, 30), False),
            make_observation("reduced_urination", "moderate", random.randint(12, 36), False),
        ]
    elif trigger == "persistent_vomiting_24h":
        msg = random.choice(ESCALATION_SEVERE_GI_MESSAGES)
        observations = [
            make_observation("vomiting", "moderate", random.randint(28, 48), False),
        ]
    elif trigger == "severe_abdominal_pain":
        msg = random.choice(ESCALATION_ABDOMINAL_MESSAGES)
        observations = [
            make_observation("cramping", "severe", random.randint(4, 12), False),
        ]
    elif trigger == "syncope":
        msg = random.choice(ESCALATION_SYNCOPE_MESSAGES)
        observations = [
            make_observation("dizziness", "severe", random.randint(1, 6), False),
        ]
    elif trigger == "severe_mood":
        msg = random.choice(ESCALATION_MOOD_MESSAGES)
        observations = [
            make_observation("low_mood", "severe", random.randint(24, 72), False),
        ]
    elif trigger == "allergic_reaction":
        msg = random.choice(ESCALATION_ALLERGIC_MESSAGES)
        observations = [
            make_observation("injection_site_redness", "severe", random.randint(1, 8), False),
        ]
    elif trigger == "missed_dose_rebound":
        msg = random.choice(ESCALATION_MISSED_REBOUND_MESSAGES)
        observations = [
            make_observation("appetite_increase", "moderate", random.randint(12, 48), False),
        ]
    else:  # any_severe — generic severe symptom
        severe_sym = random.choice(["nausea", "vomiting", "diarrhoea", "fatigue",
                                     "headache", "dizziness"])
        msg = f"my {severe_sym.replace('_', ' ')} is really severe today, can't cope"
        observations = [
            make_observation(severe_sym, "severe", random.randint(4, 24), False),
        ]

    syms = [o["symptom"] for o in observations]
    obs_class = classify_observation([(o["symptom"], o["severity"]) for o in observations])
    sev = severity_band_from_observations(observations)
    temporal = temporal_pattern_from_observations(observations,
                                                   is_post_dose=(observations[0]["onset_hours_ago"] < 12))

    esc, verified_trigger = check_red_flags(observations, obs_class, msg.lower())
    assert esc, f"Escalation scenario did not trigger red flag: {trigger}"

    allowed_keys = ["escalate_clinician", "hold_and_monitor"]
    allowed = make_allowed_action_subset(allowed_keys)
    action = "escalate_clinician"

    return _assemble(week, dose, msg, observations, allowed, obs_class,
                     sev, temporal, esc, action, syms,
                     redflag_trigger=verified_trigger)


def scenario_ambiguous():
    week = random.randint(1, 12)
    dose = dose_for_week(week)
    msg = random.choice(AMBIGUOUS_MESSAGES)

    # Ambiguous cases may or may not have observations; lean conservative
    has_obs = random.random() < 0.5
    if has_obs:
        sym = random.choice(["nausea", "fatigue", "injection_site_redness", "bloating"])
        observations = [make_observation(sym, "mild", random.randint(2, 24), False)]
    else:
        observations = []

    syms = [o["symptom"] for o in observations]
    obs_class = classify_observation([(o["symptom"], o["severity"]) for o in observations]) \
        if observations else "other"
    sev = severity_band_from_observations(observations)
    temporal = temporal_pattern_from_observations(observations)

    # Ambiguous messages: conservative — if we can't tell, lean toward hold_and_monitor
    # but check for red-flag phrases just in case
    esc, _ = check_red_flags(observations, obs_class, msg.lower())

    allowed_keys = ["hold_and_monitor", "escalate_clinician"]
    allowed = make_allowed_action_subset(allowed_keys)
    action = select_action(allowed_keys, esc, obs_class, syms)

    return _assemble(week, dose, msg, observations, allowed, obs_class,
                     sev, temporal, esc, action, syms)


# ---------------------------------------------------------------------------
# Assembly + validation
# ---------------------------------------------------------------------------

def _assemble(week, dose, msg, observations, allowed, obs_class, sev,
              temporal, esc, action, syms, redflag_trigger=None,
              actual_dose=None, dose_mismatch=False):
    explanation = build_explanation(week, dose, obs_class, sev, temporal,
                                     action, syms)
    snippet = build_clinician_snippet(week, dose, obs_class, sev, temporal, esc)

    example = {
        "week": week,
        "current_dose_mg": dose,
        "recent_observations": observations,
        "patient_message": msg,
        "allowed_actions": allowed,
        "observation_class": obs_class,
        "severity_band": sev,
        "temporal_pattern": temporal,
        "escalation_signal": esc,
        "selected_action_id": action,
        "explanation_text": explanation,
        "clinician_summary_snippet": snippet,
    }

    if redflag_trigger:
        example["_redflag_trigger"] = redflag_trigger
    if dose_mismatch:
        example["_dose_mismatch"] = True
        example["_actual_dose_mg"] = actual_dose

    _validate(example)
    return example


DIAGNOSTIC_TERMS = ["gastritis", "gastroparesis", "pancreatitis", "diabetes",
                    "diagnosed", "you have", "you are suffering from"]
DOSE_TERMS = ["take 1.0 mg instead", "take 0.5 mg instead", "increase your dose",
              "decrease your dose", "double your dose", "skip your next dose"]
OUTCOME_TERMS = ["will resolve", "will cure", "will fix", "guaranteed",
                 "definitely", "certain to"]


def _validate(ex):
    """Enforce the five hard constraints. Raises on violation."""
    allowed_ids = {a["action_id"] for a in ex["allowed_actions"]}

    # Constraint 1: selected_action_id must be in allowed_actions
    assert ex["selected_action_id"] in allowed_ids, \
        f"Action {ex['selected_action_id']} not in allowed_actions {allowed_ids}"

    # Constraint 2: escalation_signal True => escalate_clinician
    if ex["escalation_signal"]:
        assert ex["selected_action_id"] == "escalate_clinician", \
            "escalation_signal is True but action is not escalate_clinician"

    # Constraint 3: no diagnostic/dose/outcome language
    expl_lower = ex["explanation_text"].lower()
    for term in DIAGNOSTIC_TERMS + DOSE_TERMS + OUTCOME_TERMS:
        assert term not in expl_lower, \
            f"Forbidden term '{term}' in explanation_text"

    # Constraint 4: dose consistent with week unless dose_confusion/missed_dose
    expected = dose_for_week(ex["week"])
    if ex["observation_class"] not in ("dose_confusion", "missed_dose"):
        assert ex["current_dose_mg"] == expected, \
            f"Dose {ex['current_dose_mg']} != expected {expected} for week {ex['week']}"

    # Constraint 5: no real identifiers (structural — no names, no clinic IDs)
    # Enforced by construction; no real data enters the generator.


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

SCENARIO_FNS = {
    "routine": scenario_routine,
    "gi_mild_mod": scenario_gi_mild_mod,
    "dose_or_site": scenario_dose_or_site,
    "escalation": scenario_escalation,
    "ambiguous": scenario_ambiguous,
}


def make_example():
    scenario = weighted_scenario()
    return SCENARIO_FNS[scenario]()


def generate(count, seed, filename):
    random.seed(seed)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / filename

    trigger_counts = {}
    class_counts = {}
    esc_count = 0

    with open(path, "w") as f:
        for _ in range(count):
            ex = make_example()
            f.write(json.dumps(ex) + "\n")

            oc = ex["observation_class"]
            class_counts[oc] = class_counts.get(oc, 0) + 1
            if ex["escalation_signal"]:
                esc_count += 1
                t = ex.get("_redflag_trigger", "unknown")
                trigger_counts[t] = trigger_counts.get(t, 0) + 1

    print(f"Wrote {count} examples to {path}")
    print(f"  Escalation cases: {esc_count} ({100*esc_count/count:.1f}%)")
    print(f"  Observation class distribution:")
    for oc, c in sorted(class_counts.items(), key=lambda x: -x[1]):
        print(f"    {oc}: {c} ({100*c/count:.1f}%)")
    if trigger_counts:
        print(f"  Red-flag trigger coverage:")
        for t, c in sorted(trigger_counts.items(), key=lambda x: -x[1]):
            print(f"    {t}: {c}")


if __name__ == "__main__":
    generate(5_000, seed=42, filename="skeleton_train_5k.jsonl")
    generate(500, seed=2024, filename="skeleton_val_500.jsonl")
    generate(100, seed=999, filename="skeleton_pilot_100.jsonl")
