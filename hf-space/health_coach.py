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
