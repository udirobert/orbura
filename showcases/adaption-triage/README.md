# Adaption "Invent a Dataset" — GLP-1 check-in triage skeleton

Deterministic skeleton generator for testing Adaption Labs' "Invent a Dataset"
tool against a real Care Companion product need: non-diagnostic, non-prescribing
patient check-in triage during the first 12 weeks of UK GLP-1 initiation.

## What this is

`generate_skeleton.py` produces protocol-grounded examples with exact
ground-truth labels. The `patient_message` field uses templated phrasing — this
is the surface Adaption's tool is expected to enrich with realistic free-text
variation. The structured fields (`recent_observations`, `allowed_actions`,
labels) are deterministic and must not be altered by augmentation.

## Run

```bash
python3 generate_skeleton.py
```

Produces:
- `data/skeleton_train_5k.jsonl` — 5,000 training examples
- `data/skeleton_val_500.jsonl` — 500 held-out validation examples
- `data/skeleton_pilot_100.jsonl` — 100-example pilot for quick iteration

## Validate Adaption's output

```bash
python3 validate.py --input data/skeleton_train_5k.jsonl
python3 validate.py --input <adaption_output.jsonl>
```

Checks all five hard constraints and reports violation rate, escalation recall,
and class distribution.

## Schema

See the dataset intent description sent to Adaption (also in `DATASET_CARD.md`).

## Hard constraints

1. `selected_action_id` must be a member of `allowed_actions`.
2. `escalation_signal == true` => `selected_action_id == "escalate_clinician"`.
3. No diagnostic, dose-change, or outcome-promise language in explanations.
4. `current_dose_mg` consistent with `week` unless `dose_confusion` case.
5. No real patient data, clinician names, or clinic identifiers.

## License

Apache 2.0
