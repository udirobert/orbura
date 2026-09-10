#!/usr/bin/env python3
"""Validate a triage dataset (skeleton or Adaption-augmented) against hard constraints.

Usage:
  python3 validate.py --input data/skeleton_train_5k.jsonl
  python3 validate.py --input <adaption_output.jsonl> --skeleton data/skeleton_train_5k.jsonl

When --skeleton is provided, also checks that Adaption did not alter the
structured fields (recent_observations, allowed_actions, labels) — only
patient_message and explanation_text may differ.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path


TITRATION = {
    1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25,
    5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5,
    9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0,
}

DIAGNOSTIC_TERMS = [
    "gastritis", "gastroparesis", "pancreatitis", "diabetes", "diagnosed",
    "you have", "you are suffering from", "your condition is",
]
DOSE_TERMS = [
    "take 1.0 mg instead", "take 0.5 mg instead", "increase your dose",
    "decrease your dose", "double your dose", "skip your next dose",
    "change your dose", "adjust your dose",
]
OUTCOME_TERMS = [
    "will resolve", "will cure", "will fix", "guaranteed", "definitely",
    "certain to", "will eliminate",
]

REQUIRED_FIELDS = [
    "week", "current_dose_mg", "recent_observations", "patient_message",
    "allowed_actions", "observation_class", "severity_band",
    "temporal_pattern", "escalation_signal", "selected_action_id",
    "explanation_text", "clinician_summary_snippet",
]

VALID_OBS_CLASSES = {
    "no_symptom", "gi_mild", "gi_moderate", "gi_severe", "injection_site",
    "appetite_change", "fatigue", "dizziness", "sleep_disturbance",
    "mood_change", "dose_confusion", "missed_dose", "other",
}

VALID_SEVERITY = {"none", "mild", "moderate", "severe"}
VALID_TEMPORAL = {
    "isolated", "recurring_same_day", "recurring_multi_day",
    "worsening", "improving", "post_dose",
}

VALID_ACTION_IDS = {
    "hold_and_monitor", "rehydrate_small_sips", "eat_small_plain_meals",
    "rest_light_activity", "inject_site_rotate", "missed_dose_protocol",
    "reconfirm_dose", "escalate_clinician", "no_action_routine",
}


def load_jsonl(path):
    examples = []
    with open(path) as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                examples.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"  JSON parse error on line {i+1}: {e}", file=sys.stderr)
    return examples


def validate_example(ex, idx):
    """Return list of violation strings (empty if clean)."""
    violations = []

    # Field presence
    for field in REQUIRED_FIELDS:
        if field not in ex:
            violations.append(f"missing field: {field}")
            return violations  # can't check further

    # Type checks
    if not isinstance(ex["escalation_signal"], bool):
        violations.append("escalation_signal is not boolean")

    allowed_ids = {a["action_id"] for a in ex["allowed_actions"]}

    # Constraint 1: selected_action_id in allowed_actions
    if ex["selected_action_id"] not in allowed_ids:
        violations.append(
            f"selected_action_id '{ex['selected_action_id']}' not in allowed_actions"
        )

    # Constraint 2: escalation => escalate_clinician
    if ex.get("escalation_signal") is True and \
            ex["selected_action_id"] != "escalate_clinician":
        violations.append(
            "escalation_signal is True but action is not escalate_clinician"
        )

    # Constraint 3: no forbidden language
    expl_lower = ex["explanation_text"].lower()
    for term in DIAGNOSTIC_TERMS + DOSE_TERMS + OUTCOME_TERMS:
        if term in expl_lower:
            violations.append(f"forbidden term in explanation: '{term}'")

    snippet_lower = ex["clinician_summary_snippet"].lower()
    for term in DIAGNOSTIC_TERMS + DOSE_TERMS + OUTCOME_TERMS:
        if term in snippet_lower:
            violations.append(f"forbidden term in clinician snippet: '{term}'")

    # Constraint 4: dose consistent with week (unless dose_confusion/missed_dose)
    expected_dose = TITRATION.get(ex["week"])
    if expected_dose is not None and \
            ex["observation_class"] not in ("dose_confusion", "missed_dose"):
        if ex["current_dose_mg"] != expected_dose:
            violations.append(
                f"dose {ex['current_dose_mg']} != expected {expected_dose} "
                f"for week {ex['week']}"
            )

    # Enum validation
    if ex["observation_class"] not in VALID_OBS_CLASSES:
        violations.append(f"invalid observation_class: {ex['observation_class']}")

    if ex["severity_band"] not in VALID_SEVERITY:
        violations.append(f"invalid severity_band: {ex['severity_band']}")

    if ex["temporal_pattern"] not in VALID_TEMPORAL:
        violations.append(f"invalid temporal_pattern: {ex['temporal_pattern']}")

    for a in ex["allowed_actions"]:
        if a["action_id"] not in VALID_ACTION_IDS:
            violations.append(f"invalid action_id in allowed_actions: {a['action_id']}")

    # Week range
    if not isinstance(ex["week"], int) or ex["week"] < 1 or ex["week"] > 12:
        violations.append(f"week out of range: {ex['week']}")

    return violations


def check_structural_integrity(skeleton_exs, augmented_exs):
    """Verify Adaption only changed patient_message and explanation_text."""
    drift = []
    if len(skeleton_exs) != len(augmented_exs):
        print(f"  WARNING: row count changed {len(skeleton_exs)} -> {len(augmented_exs)}",
              file=sys.stderr)
        return drift

    immutable = [
        "week", "current_dose_mg", "recent_observations", "allowed_actions",
        "observation_class", "severity_band", "temporal_pattern",
        "escalation_signal", "selected_action_id", "clinician_summary_snippet",
    ]

    for i, (skel, aug) in enumerate(zip(skeleton_exs, augmented_exs)):
        for field in immutable:
            if skel.get(field) != aug.get(field):
                drift.append(f"row {i}: field '{field}' was altered")
                if len(drift) >= 20:
                    drift.append("... (truncated)")
                    return drift
    return drift


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Dataset to validate")
    parser.add_argument("--skeleton", help="Original skeleton to compare against")
    args = parser.parse_args()

    examples = load_jsonl(args.input)
    print(f"Loaded {len(examples)} examples from {args.input}\n")

    # Constraint validation
    total_violations = 0
    examples_with_violations = 0
    all_violations = Counter()

    for i, ex in enumerate(examples):
        v = validate_example(ex, i)
        if v:
            examples_with_violations += 1
            total_violations += len(v)
            for msg in v:
                # Normalize: strip specific values for counting
                key = msg.split("'")[0].split(":")[0].strip() if ":" in msg else msg
                all_violations[key] += 1

    print("=== Hard constraint validation ===")
    print(f"  Examples with violations: {examples_with_violations}/{len(examples)} "
          f"({100*examples_with_violations/len(examples):.2f}%)")
    print(f"  Total violations: {total_violations}")
    if all_violations:
        print(f"  Violation breakdown:")
        for v, c in all_violations.most_common():
            print(f"    {v}: {c}")
    else:
        print("  ALL CONSTRAINTS PASSED")

    # Escalation recall (only meaningful if we can check ground truth)
    esc_cases = [ex for ex in examples if ex.get("escalation_signal") is True]
    esc_correct = sum(1 for ex in esc_cases if ex["selected_action_id"] == "escalate_clinician")
    print(f"\n=== Escalation integrity ===")
    print(f"  Escalation cases: {len(esc_cases)}")
    print(f"  Correctly routed to escalate_clinician: {esc_correct}/{len(esc_cases)}", end="")
    if esc_cases:
        print(f" ({100*esc_correct/len(esc_cases):.1f}%)")
    else:
        print()

    # Distribution
    class_dist = Counter(ex["observation_class"] for ex in examples)
    print(f"\n=== Observation class distribution ===")
    for oc, c in class_dist.most_common():
        print(f"  {oc}: {c} ({100*c/len(examples):.1f}%)")

    esc_pct = 100 * len(esc_cases) / len(examples) if examples else 0
    print(f"\n=== Escalation rate: {len(esc_cases)} ({esc_pct:.1f}%) ===")

    # Structural integrity (if skeleton provided)
    if args.skeleton:
        print(f"\n=== Structural integrity (vs skeleton) ===")
        skel = load_jsonl(args.skeleton)
        drift = check_structural_integrity(skel, examples)
        if drift:
            print(f"  DRIFT DETECTED — {len(drift)} fields altered:")
            for d in drift[:20]:
                print(f"    {d}")
        else:
            print("  No structural drift — only patient_message/explanation_text changed")

    # Exit code
    if examples_with_violations > 0:
        print(f"\nRESULT: FAIL ({examples_with_violations} examples with violations)")
        sys.exit(1)
    print(f"\nRESULT: PASS")
    sys.exit(0)


if __name__ == "__main__":
    main()
