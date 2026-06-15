"""
Local LLM health coach using llama-cpp-python.
Generates personalized recovery advice from stressor + face scan data.
Falls back to a template-based response if model unavailable.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from huggingface_hub import hf_hub_download

MODEL_REPO = "hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF"
MODEL_FILE = "llama-3.2-1b-instruct-q4_k_m.gguf"
CACHE_DIR = Path.home() / ".cache" / "body-debt-models"


def get_model_path() -> Path:
    local = CACHE_DIR / MODEL_FILE
    if local.exists():
        return local
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILE,
        local_dir=str(CACHE_DIR),
    )
    return Path(path)


def generate_advice(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float] = None,
    progress_callback=None,
) -> str:
    """Generate personalized recovery advice using local Llama-3.2-1B."""
    try:
        if progress_callback:
            progress_callback(0.1, "Loading model...")
        model_path = get_model_path()
        if progress_callback:
            progress_callback(0.5, "Model loaded, generating advice...")
        return _llm_generate(model_path, debt_score, system_scores, stressor_summary, face_stress)
    except Exception as e:
        return _fallback_advice(debt_score, system_scores, stressor_summary)


def _build_prompt(
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float],
) -> str:
    systems_text = "\n".join(
        f"- {s['label']}: {s['score']}/100 (clears {s['cleared_at']})"
        for s in system_scores
    )
    face_text = f"\nFacial stress indicator: {face_stress:.0f}/100" if face_stress else ""

    return f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a concise recovery coach. Given physiological debt data, provide specific, actionable recovery advice in 4 categories: Right Now, This Morning, Today, Avoid. Be direct, no fluff. Use the system scores to prioritize which body systems need attention most urgently.<|eot_id|><|start_header_id|>user<|end_header_id|>
My body debt score: {debt_score}/100
Stressors: {stressor_summary}{face_text}

System breakdown:
{systems_text}

Give me my recovery prescription.<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""


def _llm_generate(
    model_path: Path,
    debt_score: int,
    system_scores: list[dict],
    stressor_summary: str,
    face_stress: Optional[float],
) -> str:
    from llama_cpp import Llama

    llm = Llama(
        model_path=str(model_path),
        n_ctx=2048,
        n_threads=4,
        verbose=False,
    )
    prompt = _build_prompt(debt_score, system_scores, stressor_summary, face_stress)
    output = llm(
        prompt,
        max_tokens=512,
        temperature=0.7,
        top_p=0.9,
        stop=["<|eot_id|>"],
    )
    return output["choices"][0]["text"].strip()


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
