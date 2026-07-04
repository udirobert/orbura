"""
Generate the fine-tuning dataset for the AutoScientist Challenge.

Scales the 12-profile trace dataset to 3,200 programmatically-sampled
stressor profiles, produces deterministic ground-truth labels for all 4
QVAC agents (Triage, Coach, Schedule, Reflection), and writes 4 train +
4 test JSONL files in chat format ready for SFT.

Each JSONL line is a chat-formatted example:
    {"messages": [
        {"role": "system", "content": "<agent system prompt>"},
        {"role": "user", "content": "<formatted input>"},
        {"role": "assistant", "content": "<deterministic label>"}
    ]}

Usage:
    python generate_finetune_dataset.py
    # writes hf-space/datasets/*.jsonl

Options:
    --n-train 3000   # number of training profiles (default 3000)
    --n-test  200    # number of held-out test profiles (default 200)
    --seed    42     # random seed for reproducibility
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import numpy as np

from scoring import (
    Stressor,
    compute_live_score,
    compute_system_scores,
)
from deterministic_labels import (
    generate_triage,
    generate_coach,
    generate_schedule,
    apply_voice,
)

HERE = Path(__file__).parent
DATASETS_DIR = HERE / "datasets"

# ─── Agent system prompts (must match qvac-worker.mjs) ────────────────────────
#
# These are the exact prompts the QVAC pipeline sends to Qwen3-1.7B at
# inference time. The fine-tuned model must see the same prompts in training.

PERSONAL_CONTEXT = (
    "A person's body has physiological stress from poor sleep, alcohol, "
    "training, or illness. This is NOT financial debt — it is body health debt."
)

TRIAGE_SYSTEM = PERSONAL_CONTEXT + """

Output EXACTLY three lines, no other text:
PRIORITY: <body system name> <score> — <health reason in 8 words>
SECONDARY: <body system name> <score> — <health reason in 8 words>
AVOID: <one health thing to avoid + biological reason, 12 words max>"""

COACH_SYSTEM = PERSONAL_CONTEXT + """

Write a recovery prescription for this person. Output EXACTLY four lines:
RIGHT NOW: <one specific health action with quantity, 12-18 words>
THIS MORNING: <one specific health action for next 2-3 hours, 12-18 words>
TODAY: <one key insight about physical capacity today, 12-18 words>
AVOID: <one thing to avoid + biological reason, 12-18 words>"""

SCHEDULE_SYSTEM = PERSONAL_CONTEXT + """

Output EXACTLY 4 schedule blocks, one per line. Format:
<time range> | <health action> | <body system>

NOW-10AM | 500ml water + electrolytes, no caffeine | Liver
10AM-12PM | Light walk outside, natural light | Brain
12PM-3PM | Protein-rich lunch, gentle movement | Muscular
3PM-6PM | No intense activity, hydrate | Cardiovascular"""

REFLECTION_SYSTEM = (
    "You are the Reflection Agent in a multi-agent recovery system. "
    "The Recovery Coach has produced a prescription. Your job is to rewrite "
    "each line in the person's chosen voice, keeping all specific actions, "
    "quantities, and biology intact. Never invent new advice. "
    "Never soften the avoid line."
)

# ─── Profile sampling ─────────────────────────────────────────────────────────

ALCOHOL_TYPES = ["beer", "red_wine", "white_wine", "spirits", "cocktails", "champagne"]
ALCOHOL_COUNTS = ["1-2", "3-4", "5+", "lost_count"]
TRAINING_AREAS = ["legs", "full_body", "hiit", "cardio", "upper", "mobility"]
TRAINING_INTENSITIES = ["easy", "hard", "destroyed"]
SLEEP_HOURS = ["under_4", "4-6", "6-7"]
ILL_SEVERITIES = ["mild", "moderate", "floored"]
PERSONALITIES = ["honest", "gentle", "scientific", "sarcastic"]


def sample_profile(rng: np.random.Generator, profile_id: str) -> dict:
    """Sample a realistic stressor profile and compute all derived data."""
    stressors: list[Stressor] = []
    stressor_parts: list[str] = []

    # Alcohol (50% chance)
    if rng.random() < 0.5:
        atype = rng.choice(ALCOHOL_TYPES)
        # Weight counts toward lower consumption
        count = rng.choice(ALCOHOL_COUNTS, p=[0.35, 0.30, 0.25, 0.10])
        stressors.append(Stressor(type="alcohol", alcohol_type=atype, alcohol_count=count))
        count_str = count.replace("_", " ") if count != "lost_count" else "lost count"
        stressor_parts.append(f"{count_str} {atype.replace('_', ' ')}")

    # Training (60% chance)
    if rng.random() < 0.6:
        area = rng.choice(TRAINING_AREAS)
        # Mobility is always easy; destroyed is rare for non-legs
        if area == "mobility":
            intensity = "easy"
        else:
            intensity = rng.choice(TRAINING_INTENSITIES, p=[0.3, 0.5, 0.2])
        stressors.append(Stressor(type="training", training_area=area, training_intensity=intensity))
        stressor_parts.append(f"{intensity} {area.replace('_', ' ')} workout")

    # Bad sleep (40% chance)
    if rng.random() < 0.4:
        hours = rng.choice(SLEEP_HOURS, p=[0.2, 0.5, 0.3])
        stressors.append(Stressor(type="sleep", sleep_hours=hours))
        stressor_parts.append(f"{hours.replace('_', ' ')} hours sleep")

    # Stress (30% chance)
    if rng.random() < 0.3:
        carried = rng.choice(["yes", "mostly_gone"], p=[0.6, 0.4])
        stressors.append(Stressor(type="stress", stress_carried=carried))
        stressor_parts.append("high stress" + ("" if carried == "yes" else " (clearing)"))

    # Illness (15% chance)
    if rng.random() < 0.15:
        severity = rng.choice(ILL_SEVERITIES, p=[0.4, 0.4, 0.2])
        stressors.append(Stressor(type="ill", ill_severity=severity))
        stressor_parts.append(f"feeling {severity}")

    # Care / recovery action (20% chance)
    if rng.random() < 0.2:
        stressors.append(Stressor(type="care"))
        stressor_parts.append("took care of self")

    # Compute scores
    now = datetime.now()
    system_scores = compute_system_scores(stressors, now=now)
    debt_score = compute_live_score(stressors)
    score_dicts = [vars(s) for s in system_scores]
    stressor_summary = ", ".join(stressor_parts) if stressor_parts else "No major stressors reported"

    # Pick a personality for reflection
    personality = rng.choice(PERSONALITIES)

    return {
        "profile_id": profile_id,
        "stressors": stressor_parts,
        "stressor_summary": stressor_summary,
        "debt_score": debt_score,
        "system_scores": score_dicts,
        "personality": personality,
        "current_time": "morning",
        "recovery_time": "later today",
    }


# ─── Input formatting (must match qvac-worker.mjs prompt construction) ────────

def format_triage_input(profile: dict) -> str:
    """Format the user message for the Triage Agent."""
    systems = json.dumps(
        [{"system": s["system"], "label": s["label"], "score": s["score"], "clearedAt": s["cleared_at"]}
         for s in profile["system_scores"]]
    )
    return (
        f"Their body debt score: {profile['debt_score']}/100 (higher = more recovery needed)\n"
        f"Body systems affected:\n{systems}\n\n"
        f"Output the 3-line triage plan."
    )


def format_coach_input(profile: dict, triage_output: str) -> str:
    """Format the user message for the Coach Agent."""
    face_line = ""
    stressors = ", ".join(profile["stressors"]) if profile["stressors"] else "None reported"
    return (
        f"Triage:\n{triage_output}\n\n"
        f"Body debt score: {profile['debt_score']}/100 (higher = more recovery needed)\n"
        f"Stressors: {stressors}\n"
        f"{face_line}"
        f"Write the recovery prescription."
    )


def format_schedule_input(profile: dict, triage_output: str, coach_output: str) -> str:
    """Format the user message for the Schedule Agent."""
    return (
        f"Triage:\n{triage_output}\n\n"
        f"Prescription:\n{coach_output}\n\n"
        f"Current time: {profile['current_time']}\n"
        f"Recovery window: {profile['recovery_time']}\n\n"
        f"Output the 4 schedule blocks."
    )


def format_reflection_input(profile: dict, coach_output: str) -> str:
    """Format the user message for the Reflection Agent."""
    personality = profile["personality"]
    voice_guides = {
        "honest": "Direct. Knowledgeable. No fluff. Same meaning, tighter language.",
        "gentle": "Warmer. Supportive. Acknowledge the effort before the action. Still honest.",
        "scientific": "Data-driven. Cite the mechanism in one phrase (cortisol, HRV, glycogen, hepatic).",
        "sarcastic": "Dry wit. Call out the obvious choice that caused this. Still useful.",
    }
    voice_guide = voice_guides.get(personality, "Direct. No fluff.")
    return (
        f"User's voice: {personality}\n"
        f"Voice guide: {voice_guide}\n\n"
        f"Original prescription:\n{coach_output}\n\n"
        f"Output the 4 rewritten lines."
    )


# ─── Chat example builder ─────────────────────────────────────────────────────

def make_chat_example(system_prompt: str, user_content: str, assistant_content: str) -> dict:
    """Build a single chat-formatted training example."""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
            {"role": "assistant", "content": assistant_content},
        ]
    }


# ─── Dataset generation ───────────────────────────────────────────────────────

def generate_dataset(n_train: int, n_test: int, seed: int) -> dict:
    """Generate all 4 train + 4 test JSONL files.

    Returns a dict of {filename: list_of_examples}.
    """
    rng = np.random.default_rng(seed)

    # Generate all profiles (train + test, no overlap via different seed offsets)
    profiles = []
    for i in range(n_train + n_test):
        pid = f"synth_{i:05d}"
        profiles.append(sample_profile(rng, pid))

    train_profiles = profiles[:n_train]
    test_profiles = profiles[n_train:]

    datasets = {}

    for split, split_profiles in [("train", train_profiles), ("test", test_profiles)]:
        triage_examples = []
        coach_examples = []
        schedule_examples = []
        reflection_examples = []

        for profile in split_profiles:
            # Generate deterministic labels for all 4 agents
            triage_label = generate_triage(profile["system_scores"])
            coach_label = generate_coach(
                profile["debt_score"],
                profile["system_scores"],
                profile["stressor_summary"],
            )
            schedule_label = generate_schedule(
                profile["system_scores"],
                profile["current_time"],
                profile["recovery_time"],
            )
            reflection_label = apply_voice(coach_label, profile["personality"])

            # Build chat examples with the exact system prompts
            triage_examples.append(make_chat_example(
                TRIAGE_SYSTEM,
                format_triage_input(profile),
                triage_label,
            ))
            coach_examples.append(make_chat_example(
                COACH_SYSTEM,
                format_coach_input(profile, triage_label),
                coach_label,
            ))
            schedule_examples.append(make_chat_example(
                SCHEDULE_SYSTEM,
                format_schedule_input(profile, triage_label, coach_label),
                schedule_label,
            ))
            reflection_examples.append(make_chat_example(
                REFLECTION_SYSTEM,
                format_reflection_input(profile, coach_label),
                reflection_label,
            ))

        datasets[f"triage_{split}.jsonl"] = triage_examples
        datasets[f"coach_{split}.jsonl"] = coach_examples
        datasets[f"schedule_{split}.jsonl"] = schedule_examples
        datasets[f"reflection_{split}.jsonl"] = reflection_examples

    return datasets


def write_datasets(datasets: dict, output_dir: Path) -> None:
    """Write all JSONL files to the output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    for filename, examples in datasets.items():
        path = output_dir / filename
        with open(path, "w") as f:
            for ex in examples:
                f.write(json.dumps(ex) + "\n")
        print(f"  {path.name}: {len(examples)} examples")


def main():
    parser = argparse.ArgumentParser(description="Generate fine-tuning dataset for AutoScientist Challenge")
    parser.add_argument("--n-train", type=int, default=3000, help="Number of training profiles")
    parser.add_argument("--n-test", type=int, default=200, help="Number of held-out test profiles")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    total = args.n_train + args.n_test
    print(f"Generating {total} profiles ({args.n_train} train + {args.n_test} test)...")
    print(f"  Seed: {args.seed}")
    print()

    datasets = generate_dataset(args.n_train, args.n_test, args.seed)

    print(f"Writing {len(datasets)} JSONL files to {DATASETS_DIR}/...")
    write_datasets(datasets, DATASETS_DIR)

    # Print sample for verification
    print()
    print("=== Sample Triage Example ===")
    sample = datasets["triage_train.jsonl"][0]
    print(json.dumps(sample, indent=2))
    print()
    print("=== Sample Coach Example ===")
    sample = datasets["coach_train.jsonl"][0]
    print(json.dumps(sample, indent=2))
    print()
    print("=== Sample Schedule Example ===")
    sample = datasets["schedule_train.jsonl"][0]
    print(json.dumps(sample, indent=2))
    print()
    print("=== Sample Reflection Example ===")
    sample = datasets["reflection_train.jsonl"][0]
    print(json.dumps(sample, indent=2))

    # Print summary stats
    print()
    print("=== Dataset Summary ===")
    for filename, examples in sorted(datasets.items()):
        print(f"  {filename}: {len(examples)} examples")


if __name__ == "__main__":
    main()
