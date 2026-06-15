"""
Local LLM health coach using HuggingFace Transformers.
Generates personalized recovery advice from stressor + face scan data.
Falls back to a template-based response if model unavailable.
"""

from __future__ import annotations

import os
from typing import Optional

MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct"


def generate_advice(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float] = None,
    progress_callback=None,
) -> str:
    """Generate personalized recovery advice using a small local LLM."""
    try:
        if progress_callback:
            progress_callback(0.1, "Loading model...")
        chunks: list[str] = []
        for piece in _transformers_stream(
            debt_score, system_scores, stressor_summary, face_stress, progress_callback
        ):
            chunks.append(piece)
        return "".join(chunks)
    except Exception as e:
        print(f"LLM generation failed: {e}")
        return _fallback_advice(debt_score, system_scores, stressor_summary)


def stream_advice(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float] = None,
):
    """Yield advice tokens as they are produced.

    Yields strings (incremental text). Falls back to the template engine
    if the model cannot be loaded. Catches every exception so a streaming
    failure never breaks the surrounding UI.
    """
    try:
        yield from _transformers_stream(
            debt_score, system_scores, stressor_summary, face_stress, None
        )
    except Exception as e:
        print(f"LLM streaming failed: {e}")
        yield _fallback_advice(debt_score, system_scores, stressor_summary)


def _build_messages(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float],
) -> list[dict]:
    systems_text = "\n".join(
        f"- {s['label']}: {s['score']}/100 (clears {s['cleared_at']})"
        for s in system_scores
    )
    face_text = f"\nFacial stress indicator: {face_stress:.0f}/100" if face_stress else ""

    return [
        {
            "role": "system",
            "content": "You are a concise recovery coach. Given physiological debt data, provide specific, actionable recovery advice in 4 categories: Right Now, This Morning, Today, Avoid. Be direct, no fluff. Use the system scores to prioritize which body systems need attention most urgently.",
        },
        {
            "role": "user",
            "content": f"My body debt score: {debt_score}/100\nStressors: {stressor_summary}{face_text}\n\nSystem breakdown:\n{systems_text}\n\nGive me my recovery prescription.",
        },
    ]


def _transformers_stream(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float],
    progress_callback=None,
):
    """Stream tokens from a local SmolLM2 chat pipeline."""
    from threading import Thread
    from transformers import pipeline, TextIteratorStreamer

    if progress_callback:
        progress_callback(0.2, "Loading SmolLM2-360M (local)...")

    pipe = pipeline(
        "text-generation",
        model=MODEL_ID,
        device_map="auto",
        torch_dtype="auto",
    )

    if progress_callback:
        progress_callback(0.5, "Coaching on-device...")

    messages = _build_messages(debt_score, system_scores, stressor_summary, face_stress)
    streamer = TextIteratorStreamer(
        pipe.tokenizer,
        skip_prompt=True,
        skip_special_tokens=True,
    )
    gen_kwargs = dict(
        text_inputs=messages,
        max_new_tokens=280,
        temperature=0.7,
        do_sample=True,
        streamer=streamer,
    )
    thread = Thread(target=pipe, kwargs=gen_kwargs, daemon=True)
    thread.start()

    for piece in streamer:
        if piece:
            yield piece
    thread.join(timeout=2.0)


def _fallback_advice(debt_score: int, system_scores: list[dict], stressor_summary: str) -> str:
    worst = max(system_scores, key=lambda s: s["score"]) if system_scores else None
    severity = "high" if debt_score > 60 else ("moderate" if debt_score > 30 else "low")

    advice = f"**Debt Level: {severity.upper()}** (Score: {debt_score}/100)\n\n"
    if worst:
        advice += f"Priority system: {worst['label']} ({worst['score']}/100)\n\n"
    advice += "**Right Now:** 500ml water with electrolytes. No screens for 10 minutes.\n\n"
    if debt_score > 60:
        advice += "**This Morning:** Delay caffeine 90 minutes. Light walk only.\n\n"
        advice += "**Today:** No training. Prioritize sleep tonight. Bland foods.\n\n"
        advice += "**Avoid:** Alcohol, heavy decisions, intense exercise.\n"
    elif debt_score > 30:
        advice += "**This Morning:** Protein-rich breakfast. Gentle movement.\n\n"
        advice += "**Today:** Light activity OK. Avoid evening alcohol.\n\n"
        advice += "**Avoid:** High-intensity training, late caffeine.\n"
    else:
        advice += "**This Morning:** Normal routine — you're in good shape.\n\n"
        advice += "**Today:** Train if you want. Stay hydrated.\n\n"
        advice += "**Avoid:** Nothing specific — maintain the streak.\n"
    return advice


# ─── Plan step ────────────────────────────────────────────────────────────────
#
# A small but real "agentic" step. The LLM is given the system scores and
# must produce a 3-line plan: PRIORITY / SECONDARY / AVOID. Structured
# output is much more reliable than free-form from a 360M model. The plan
# is shown in the agent trace panel and fed into the final prescription
# prompt as additional context.

PLAN_PROMPT_SYSTEM = (
    "You are a triage planner. Given a 5-system body debt breakdown, "
    "output EXACTLY three lines, in this format, with no other text:\n"
    "PRIORITY: <system name> <score>\n"
    "SECONDARY: <system name> <score>\n"
    "AVOID: <one specific thing to avoid today>\n"
    "Pick the highest-scoring system for PRIORITY, the next-highest for "
    "SECONDARY, and a concrete avoidance based on the worst system. "
    "No commentary, no extra lines."
)


def _build_plan_messages(system_scores: list[dict]) -> list[dict]:
    systems_text = "\n".join(
        f"- {s['label']}: {s['score']}/100"
        for s in sorted(system_scores, key=lambda x: -x["score"])
    )
    return [
        {"role": "system", "content": PLAN_PROMPT_SYSTEM},
        {"role": "user", "content": f"System scores:\n{systems_text}\n\nOutput the 3-line plan."},
    ]


def _parse_plan(raw: str, system_scores: list[dict]) -> dict:
    """Best-effort parse of the LLM's 3-line plan.

    Falls back to a deterministic plan computed from the system scores
    if the LLM output is malformed. The fallback is what we render.
    """
    text = raw.strip()
    plan = {"priority": None, "secondary": None, "avoid": None}
    for line in text.splitlines():
        up = line.upper().strip()
        if up.startswith("PRIORITY:") and not plan["priority"]:
            plan["priority"] = line.split(":", 1)[1].strip()
        elif up.startswith("SECONDARY:") and not plan["secondary"]:
            plan["secondary"] = line.split(":", 1)[1].strip()
        elif up.startswith("AVOID:") and not plan["avoid"]:
            plan["avoid"] = line.split(":", 1)[1].strip()
    return plan


def _fallback_plan(system_scores: list[dict]) -> dict:
    """Deterministic plan from the system scores alone (no LLM)."""
    ranked = sorted(system_scores, key=lambda s: -s["score"])
    plan = {"priority": None, "secondary": None, "avoid": None}
    if ranked:
        plan["priority"] = f"{ranked[0]['label']} {ranked[0]['score']}/100"
    if len(ranked) > 1 and ranked[1]["score"] > 10:
        plan["secondary"] = f"{ranked[1]['label']} {ranked[1]['score']}/100"
    top = ranked[0]["label"].lower() if ranked else "this system"
    avoid_map = {
        "brain": "late caffeine, deep-focus work before 11am",
        "liver": "more alcohol, fatty foods",
        "muscular / cns": "high-intensity training, heavy lifts",
        "cardiovascular": "intervals, sauna, alcohol",
        "gut": "sugar, dairy, large meals",
    }
    plan["avoid"] = avoid_map.get(top, "stress and stimulants")
    return plan


def generate_plan(system_scores: list[dict], plan_lines: list[str]) -> dict:
    """Try the LLM plan first, fall back to deterministic.

    `plan_lines` is filled with the LLM's raw output line-by-line as it
    streams, so the UI can show the plan being formed in the agent trace.
    """
    try:
        from transformers import pipeline

        pipe = pipeline("text-generation", model=MODEL_ID, device_map="auto", torch_dtype="auto")
        messages = _build_plan_messages(system_scores)
        out = pipe(messages, max_new_tokens=60, temperature=0.3, do_sample=False)
        raw = out[0]["generated_text"][-1]["content"]
        for line in raw.splitlines():
            if line.strip():
                plan_lines.append(line.strip())
        plan = _parse_plan(raw, system_scores)
        if not plan["priority"] or not plan["avoid"]:
            return _fallback_plan(system_scores)
        return plan
    except Exception as e:
        print(f"Plan generation failed: {e}")
        return _fallback_plan(system_scores)


def stream_plan(system_scores: list[dict]):
    """Yield (plan_dict_so_far, raw_line) tuples as the LLM produces them.

    On failure, yield a single deterministic plan.
    """
    lines: list[str] = []
    plan = generate_plan(system_scores, lines)
    if not lines:
        # Fallback path: emit the deterministic lines so the UI can show them
        for piece in (
            f"PRIORITY: {plan['priority']}",
            f"SECONDARY: {plan['secondary']}" if plan["secondary"] else "",
            f"AVOID: {plan['avoid']}",
        ):
            if piece:
                lines.append(piece)
                yield plan, piece
        return
    for line in lines:
        yield plan, line

