# Build Small Hackathon — Submission Tracker

## Submission

- **Space (hackathon org)**: https://huggingface.co/spaces/build-small-hackathon/body-debt
- **Space (personal)**: https://huggingface.co/spaces/Papajams/body-debt
- **Track**: Backyard AI (practical, local, personal)
- **Model**: SmolLM2-360M-Instruct (360M params — well under 32B cap)

## Requirements Checklist

| # | Requirement | Status | Notes |
|---|---|---|---|
| REQ-01 | Under 32B params | ✅ Done | SmolLM2-360M + 2KB ONNX stress classifier |
| REQ-02 | Gradio Space | ✅ Done | Live at `build-small-hackathon/body-debt` |
| REQ-03 | Demo video | ⬜ TODO | Record walkthrough of stressor → score → advice flow |
| REQ-04 | Social post | ⬜ TODO | Post on X/LinkedIn linking to Space |
| REQ-05 | GPU limit | ✅ N/A | Runs on CPU-basic |
| REQ-06 | Tag README | ✅ Done | build-small, backyard-ai, tiny-titan, best-agent, off-brand, openai-codex |

## Prize Targets

| Prize | Category | Eligible? | Notes |
|---|---|---|---|
| Backyard AI 1st–4th | Track | ✅ | Practical health recovery app |
| Tiny Titan ($1,500) | Bonus badge | ✅ | 360M param model — `The 360M model is the right size` section in README |
| Best Agent ($1,000) | Bonus badge | ✅ | Visible agent trace: parse → score → face → LLM coach |
| Off Brand ($1,500) | Bonus badge | ✅ | Custom dark Gradio theme (10KB CSS) — DM Serif Display hero, system accent tokens, breathing orb, monogram glyphs, agent trace panel |
| Best Demo ($1,000) | Bonus badge | ⬜ | Needs demo video |
| OpenAI Codex | Sponsor | ✅ | README documents Codex-built subsystems |
| Bonus Quest Champion ($2,000) | Bonus badge | ✅ | Hitting multiple badges |

## Architecture (Gradio Space)

```
Stressor Intake (Gradio form)
  → Agent trace: parse_stressors → compute_live_score → face_scan → llm_coach
  → Deterministic 5-system scoring (Python port of TS engine)
  → Face scan via webcam (MediaPipe FaceMesh → 7 features → ONNX MLP)
  → SmolLM2-360M-Instruct streams recovery prescription token-by-token
  → Dark hero number, system meters, recovery protocol timeline, science citations
```

## Recent Polish (June 15)

- **Dark "off-brand" UI** — full custom CSS theme: `DM Serif Display` hero number with breathing-orb glow, system accent tokens (`#F43F5E` / `#22D3EE` / `#EAB308` / `#A78BFA` / `#2DD4BF`) matching the Next.js design system, monogram glyphs (C/N/L/M/G) on system meters, vertical timeline for protocol steps, science citations with system-coloured left borders.
- **Visible agent trace** — every step of the analysis streams into a side panel: `parse_stressors` → `compute_live_score` → `face_scan` → `llm_coach`, with active/done/error states. This makes the "agent" behaviour unmissable for judges.
- **Streaming LLM advice** — `TextIteratorStreamer` renders tokens as they are produced, with a blinking cursor. Compelling in the demo video.
- **Model Card narrative** — README now has a "**The 360M model is the right size, not a compromise**" section explaining why 360M wins on privacy, latency, footprint, and output shape.

## Remaining Steps

1. ~~**Join Build Small org**~~ ✅ Joined and duplicated to `build-small-hackathon/body-debt`
2. ~~**Dark custom UI**~~ ✅ Off-brand dark theme, agent trace, streaming
3. **Record demo video** — screen-record the full flow: hook → live demo with face scan + streaming LLM → model card → Codex credit
4. **Social post** — share on X/LinkedIn with link to Space + 15-second teaser clip
5. **Update README** — add demo video URL and social post link to the README

## Local Files

All Gradio app files live in `hf-space/`:
- `app.py` — main Gradio UI (10KB custom CSS, dark off-brand theme)
- `scoring.py` — 5-system scoring engine
- `face_scan.py` — MediaPipe face analysis
- `stress_model.py` — ONNX stress classifier
- `health_coach.py` — SmolLM2 LLM advice generator (now with `stream_advice` generator)
- `generate_model.py` — ONNX model generation script
- `models/stress_model.onnx` — pre-built classifier
