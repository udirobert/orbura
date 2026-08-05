# Orbura AutoScientist Data Visualization Dataset

## Dataset Description

A synthetic instruction-tuning corpus for data visualization tasks, built for
the [AutoScientist Challenge](https://adaptionlabs.ai/blog/autoscientist-challenge)
Part 2 (Data Visualization). Every example is deterministically generated —
no human annotation, no LLM-generated labels — so the ground truth is exact
and reproducible.

### Task types

| Task | Weight | Description |
|---|---|---|
| `chart_qa` | 45% | Arithmetic, comparison, and trend questions about chart data (max, min, sum, avg, median, range, pct_total, ratio, rank, above_avg, trend, difference, counterfactual, percentage_change) |
| `chart_to_code` | 15% | Generate matplotlib code from a chart type + data table |
| `fix_code` | 10% | Repair common matplotlib bugs (typos, missing imports, mismatched lengths, invalid kwargs, string values, swapped axes) |
| `code_to_desc` | 10% | Describe what a matplotlib code block produces, including key statistics |
| `style_transfer` | 10% | Modify an existing plot (change chart type, add grid, rotate labels, change color) |
| `chart_choice` | 5% | Select the most appropriate chart type for given data |
| `data_to_code` | 5% | Convert CSV data into a matplotlib chart |

### Chart types covered

- **line** — trend visualization
- **bar** — category comparison
- **scatter** — correlation
- **pie** — proportion of a whole

### Multimodal extension

A 100-row multimodal pilot (`generate_multimodal_pilot.py`) generates rendered
chart images (PNG) with chart-QA pairs. This extends the text-only dataset with
visual reasoning: the model sees a rendered chart and answers questions about
it. The pilot covers bar, grouped bar, stacked bar, line, multi-line, scatter,
pie, donut, area, and mixed (bar + line overlay) chart types.

## Files

| File | Rows | Description |
|---|---|---|
| `adaption_train_10k.jsonl` | 10,000 | Training set (column-mapped for Adaption) |
| `adaption_val_2k.jsonl` | 2,000 | Validation set (held-out) |
| `adaption_pilot_500.jsonl` | 500 | Small pilot for quick iteration |
| `train_10k.jsonl` | 10,000 | Training set (raw, pre-Adaption-mapping) |
| `val_2k.jsonl` | 2,000 | Validation set (raw, pre-Adaption-mapping) |
| `multimodal_pilot/` | 100 | Rendered chart images + metadata |

## Schema

| Field | Description |
|---|---|
| `instruction` | Task prompt |
| `input` | Context (data table, CSV, code, or chart metadata) |
| `output` | Ground-truth completion (deterministic) |
| `task` | Sub-task name |
| `category` | Always `data_visualization` |
| `messages` | Chat-formatted version for SFT |

## Generation

Generated deterministically by `generate_full.py` with seed 42 (train) and
seed 2024 (val). The Adaption column mapping is applied by
`prepare_adaption.py`.

```bash
python3 generate_full.py        # → train_10k.jsonl + val_2k.jsonl
python3 prepare_adaption.py     # → adaption_train_10k.jsonl + adaption_val_2k.jsonl
python3 generate_multimodal_pilot.py  # → multimodal_pilot/
```

## Augmentation

The dataset is designed to be augmented via Adaption Adaptive Data with:
- `reasoning_traces`: enabled
- `prompt_rephrase`: **disabled** (rewrites system prompts, causing
  train/inference mismatch — learned from Part 1 post-mortem)
- `deduplication`: enabled

## Usage

```python
import json

with open("adaption_train_10k.jsonl") as f:
    for line in f:
        example = json.loads(line)
        # example["instruction"], example["input"], example["output"], example["task"]
```

## License

Apache 2.0
