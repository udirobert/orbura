# GLP-1 Check-in Triage Dataset

## Dataset Description

A synthetic instruction-tuning dataset for a non-diagnostic, non-prescribing
patient check-in triage model used during the first 12 weeks of UK GLP-1
receptor agonist initiation and dose escalation (semaglutide-style titration).

Every example is a patient free-text check-in message paired with a structured
triage output and a single selected self-care action from a clinic-approved
allowed-action set. The model never diagnoses, never prescribes, never changes
a dose, and never suppresses an escalation signal. A separate deterministic
safety policy — not this model — decides whether a human clinician must be
alerted.

### Titration schedule

| Weeks | Dose |
|---|---|
| 1–4 | 0.25 mg |
| 5–8 | 0.5 mg |
| 9–12 | 1.0 mg |

### Observation classes

`no_symptom`, `gi_mild`, `gi_moderate`, `gi_severe`, `injection_site`,
`appetite_change`, `fatigue`, `dizziness`, `sleep_disturbance`, `mood_change`,
`dose_confusion`, `missed_dose`, `other`

### Allowed actions

`hold_and_monitor`, `rehydrate_small_sips`, `eat_small_plain_meals`,
`rest_light_activity`, `inject_site_rotate`, `missed_dose_protocol`,
`reconfirm_dose`, `escalate_clinician`, `no_action_routine`

### Red-flag triggers (escalation_signal = true)

- `severe_gi_dehydration` — severe GI + dehydration sign
- `persistent_vomiting_24h` — vomiting unresolved, onset > 24h
- `severe_abdominal_pain` — cramping at severe band
- `syncope` — dizziness at severe band
- `severe_mood` — low_mood severe or suicidal ideation phrase
- `allergic_reaction` — injection_site_redness severe or swelling/throat phrases
- `missed_dose_rebound` — missed dose + appetite_increase
- `any_severe` — any symptom at severe band

## Files

| File | Rows | Description |
|---|---|---|
| `skeleton_train_5k.jsonl` | 5,000 | Skeleton training set (templated messages) |
| `skeleton_val_500.jsonl` | 500 | Held-out validation set |
| `skeleton_pilot_100.jsonl` | 100 | Quick-iteration pilot |

## Generation

```bash
python3 generate_skeleton.py        # → data/skeleton_*.jsonl
python3 validate.py --input data/skeleton_train_5k.jsonl
```

Deterministic with seed 42 (train), 2024 (val), 999 (pilot).

## Distribution targets

| Scenario | Target | Actual |
|---|---|---|
| Routine (no_symptom) | ~40% | 39.3% |
| Mild–moderate GI | ~35% | 36.9% |
| Dose/site issues | ~15% | 16.2% |
| Escalation | ~8% | 8.1% |
| Ambiguous | ~2% | ~2% |

## Hard constraints

1. `selected_action_id` must be a member of `allowed_actions`.
2. `escalation_signal == true` => `selected_action_id == "escalate_clinician"`.
3. No diagnostic, dose-change, or outcome-promise language.
4. `current_dose_mg` consistent with `week` unless `dose_confusion` case.
5. No real patient data, clinician names, or clinic identifiers.

## What Adaption's tool should do

Enrich `patient_message` with realistic free-text variation (phrasing, literacy
levels, British English, abbreviations, emoji, multilingual-English). The
structured fields must remain unchanged. Run `validate.py --input <adaption_output>
--skeleton data/skeleton_train_5k.jsonl` to verify structural integrity.

## License

Apache 2.0
