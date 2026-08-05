# AutoScientist Part 2 — Data Visualization submission

Default category: **Data Visualization**.

Why this category: we can generate unlimited verified training data, the held-out test is likely objective, and a demo is trivial to build.

## Files

- `generate_full.py` — full-scale deterministic dataset generator (10k train / 2k val).
- `generate_seed.py` — tiny 100-example generator for quick iteration.
- `naive_baseline.py` — rule-based baseline; accepts `--input`.
- `requirements.txt` — dependencies for later image rendering / training.
- `data/` — generated JSONL datasets.

## Quick start

```bash
python3 generate_full.py
python3 naive_baseline.py --input data/val_2k.jsonl
```

## Next steps

1. Inspect `data/train_10k.jsonl` and `data/val_2k.jsonl`.
2. Replace `predict()` in `naive_baseline.py` with a call to the real base model (AutoScientist API or local model) to measure the actual gap.
3. Add chart image rendering (`--render`) if the held-out test is vision-based.
4. Upload dataset + weights to Hugging Face and Kaggle.
