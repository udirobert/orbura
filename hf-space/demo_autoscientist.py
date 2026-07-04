"""
Body Debt — AutoScientist Challenge Demo

A focused before/after comparison demo showing the base Llama-3.2-3B
vs the AutoScientist fine-tuned model on structured health recovery
prescriptions.

This is designed as a standalone Gradio app or as a tab within the
main Body Debt HF Space.

Usage:
    # Standalone
    python demo_autoscientist.py

    # The fine-tuned model endpoint (Together AI)
    export TOGETHER_API_KEY=...
    FINETUNED_MODEL=your-model-name python demo_autoscientist.py
"""

from __future__ import annotations

import os
import json
import time
from datetime import datetime

import gradio as gr
import requests

from scoring import (
    Stressor,
    compute_live_score,
    compute_system_scores,
    STRESSOR_DEFS,
)

# ─── Config ───────────────────────────────────────────────────────────────────

BASELINE_MODEL = os.environ.get("BASELINE_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
FINETUNED_MODEL = os.environ.get("FINETUNED_MODEL", "")  # Set when AutoScientist completes
TOGETHER_API = "https://api.together.xyz/v1/chat/completions"

# ─── Design tokens (matches main app) ─────────────────────────────────────────

BRAND_PRIMARY = "#EA580C"
BRAND_SECONDARY = "#F59E0B"
RECOVERY_GREEN = "#4ADE80"

LT_BG_BASE = "#FAFAF9"
LT_BG_SURFACE = "#FFFFFF"
LT_BG_ELEVATED = "#F5F5F4"
LT_BORDER = "rgba(0, 0, 0, 0.08)"
LT_TEXT_PRIMARY = "#1C1917"
LT_TEXT_SECONDARY = "#57534E"
LT_TEXT_MUTED = "#78716C"

# ─── System prompts (exact match from qvac-worker.mjs) ─────────────────────────

TRIAGE_SYSTEM = (
    "A person's body has physiological stress from poor sleep, alcohol, "
    "training, or illness. This is NOT financial debt — it is body health debt.\n\n"
    "Output EXACTLY three lines, no other text:\n"
    "PRIORITY: <body system name> <score> — <health reason in 8 words>\n"
    "SECONDARY: <body system name> <score> — <health reason in 8 words>\n"
    "AVOID: <one health thing to avoid + biological reason, 12 words max>"
)

COACH_SYSTEM = (
    "A person's body has physiological stress from poor sleep, alcohol, "
    "training, or illness. This is NOT financial debt — it is body health debt.\n\n"
    "Write a recovery prescription for this person. Output EXACTLY four lines:\n"
    "RIGHT NOW: <one specific health action with quantity, 12-18 words>\n"
    "THIS MORNING: <one specific health action for next 2-3 hours, 12-18 words>\n"
    "TODAY: <one key insight about physical capacity today, 12-18 words>\n"
    "AVOID: <one thing to avoid + biological reason, 12-18 words>"
)

SCHEDULE_SYSTEM = (
    "A person's body has physiological stress from poor sleep, alcohol, "
    "training, or illness. This is NOT financial debt — it is body health debt.\n\n"
    "Output EXACTLY 4 schedule blocks, one per line. Format:\n"
    "<time range> | <health action> | <body system>"
)

REFLECTION_SYSTEM = (
    "You are the Reflection Agent in a multi-agent recovery system. "
    "The Recovery Coach has produced a prescription. Your job is to rewrite "
    "each line in the person's chosen voice, keeping all specific actions, "
    "quantities, and biology intact. Never invent new advice. Never soften "
    "the avoid line."
)

# ─── Together AI inference ────────────────────────────────────────────────────

def together_inference(model: str, messages: list[dict], api_key: str, max_tokens: int = 300) -> str:
    """Call Together AI chat completions."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "stream": False,
    }
    resp = requests.post(TOGETHER_API, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def deterministic_triage(system_scores: list[dict]) -> str:
    """Deterministic triage label (ground truth)."""
    ranked = sorted(system_scores, key=lambda s: -s["score"])
    lines = []
    if ranked:
        s = ranked[0]
        lines.append(f"PRIORITY: {s['label']} {s['score']}/100")
    if len(ranked) > 1 and ranked[1]["score"] > 10:
        s = ranked[1]
        lines.append(f"SECONDARY: {s['label']} {s['score']}/100")
    top = ranked[0]["label"].lower() if ranked else ""
    avoid_map = {
        "brain": "late caffeine, deep-focus work before 11am",
        "liver": "more alcohol, fatty foods",
        "muscular / cns": "high-intensity training, heavy lifts",
        "cardiovascular": "intervals, sauna, alcohol",
        "gut": "sugar, dairy, large meals",
    }
    lines.append(f"AVOID: {avoid_map.get(top, 'stress and stimulants')}")
    return "\n".join(lines)


def deterministic_coach(debt_score: int, system_scores: list[dict]) -> str:
    """Deterministic coach label (ground truth)."""
    lines = ["RIGHT NOW: 500ml water with electrolytes. No screens for 10 minutes."]
    if debt_score > 60:
        lines.append("THIS MORNING: Delay caffeine 90 minutes. Light walk only.")
        lines.append("TODAY: No training. Prioritize sleep tonight. Bland foods.")
        lines.append("AVOID: Alcohol, heavy decisions, intense exercise.")
    elif debt_score > 30:
        lines.append("THIS MORNING: Protein-rich breakfast. Gentle movement.")
        lines.append("TODAY: Light activity OK. Avoid evening alcohol.")
        lines.append("AVOID: High-intensity training, late caffeine.")
    else:
        lines.append("THIS MORNING: Normal routine — you're in good shape.")
        lines.append("TODAY: Train if you want. Stay hydrated.")
        lines.append("AVOID: Nothing specific — maintain the streak.")
    return "\n".join(lines)


# ─── Build prompts from stressor inputs ───────────────────────────────────────

def build_system_scores(stressors_args: dict) -> tuple[int, list[dict]]:
    """Build stressor list, compute scores, return (debt_score, system_dicts)."""
    stressors = []
    if stressors_args.get("alcohol"):
        stressors.append(Stressor(
            type="alcohol",
            alcohol_type=stressors_args.get("alcohol_type", "red_wine"),
            alcohol_count=stressors_args.get("alcohol_count", "3-4"),
        ))
    if stressors_args.get("training"):
        stressors.append(Stressor(
            type="training",
            training_area=stressors_args.get("training_area", "full_body"),
            training_intensity=stressors_args.get("training_intensity", "hard"),
        ))
    if stressors_args.get("sleep"):
        stressors.append(Stressor(
            type="sleep",
            sleep_hours=stressors_args.get("sleep_hours", "4-6"),
        ))
    if stressors_args.get("stress"):
        stressors.append(Stressor(
            type="stress",
            stress_carried=stressors_args.get("stress_carried", "yes"),
        ))
    if stressors_args.get("ill"):
        stressors.append(Stressor(
            type="ill",
            ill_severity=stressors_args.get("ill_severity", "moderate"),
        ))
    if stressors_args.get("care"):
        stressors.append(Stressor(type="care"))

    debt_score = compute_live_score(stressors)
    system_scores = compute_system_scores(stressors, now=datetime.now())
    system_dicts = [
        {"label": s.label, "score": s.score, "cleared_at": s.cleared_at}
        for s in system_scores
    ]
    return debt_score, system_dicts


def build_triage_prompt(system_dicts: list[dict], debt_score: int) -> list[dict]:
    """Build the triage chat messages."""
    systems_json = json.dumps([
        {"system": s["label"].lower().replace(" / cns", "").replace(" / cognition", ""),
         "label": s["label"], "score": s["score"], "clearedAt": s["cleared_at"]}
        for s in system_dicts
    ])
    user_content = (
        f"Their body debt score: {debt_score}/100 (higher = more recovery needed)\n"
        f"Body systems affected:\n{systems_json}\n\n"
        f"Output the 3-line triage plan."
    )
    return [
        {"role": "system", "content": TRIAGE_SYSTEM},
        {"role": "user", "content": user_content},
    ]


def build_coach_prompt(debt_score: int, system_dicts: list[dict], triage: str) -> list[dict]:
    """Build the coach chat messages."""
    worst = max(system_dicts, key=lambda s: s["score"]) if system_dicts else None
    stressor_summary = "poor sleep, alcohol, training, stress"
    user_content = (
        f"Triage:\n{triage}\n\n"
        f"Body debt score: {debt_score}/100 (higher = more recovery needed)\n"
        f"Stressors: {stressor_summary}\n"
        f"Write the recovery prescription."
    )
    return [
        {"role": "system", "content": COACH_SYSTEM},
        {"role": "user", "content": user_content},
    ]


# ─── Comparison runner ────────────────────────────────────────────────────────

def run_comparison(
    alcohol, alcohol_type, alcohol_count,
    training, training_area, training_intensity,
    sleep, sleep_hours,
    stress, stress_carried,
    ill, ill_severity,
    care,
):
    """Run both models and return comparison HTML."""
    api_key = os.environ.get("TOGETHER_API_KEY", "")

    stressor_args = {
        "alcohol": alcohol, "alcohol_type": alcohol_type, "alcohol_count": alcohol_count,
        "training": training, "training_area": training_area, "training_intensity": training_intensity,
        "sleep": sleep, "sleep_hours": sleep_hours,
        "stress": stress, "stress_carried": stress_carried,
        "ill": ill, "ill_severity": ill_severity,
        "care": care,
    }

    debt_score, system_dicts = build_system_scores(stressor_args)

    # Build prompts
    triage_msgs = build_triage_prompt(system_dicts, debt_score)
    triage_gt = deterministic_triage(system_dicts)
    coach_msgs = build_coach_prompt(debt_score, system_dicts, triage_gt)
    coach_gt = deterministic_coach(debt_score, system_dicts)

    results = {"debt_score": debt_score, "systems": system_dicts}

    # Run baseline
    baseline_triage = ""
    baseline_coach = ""
    if api_key and BASELINE_MODEL:
        try:
            baseline_triage = together_inference(BASELINE_MODEL, triage_msgs, api_key)
        except Exception as e:
            baseline_triage = f"[Error: {e}]"
        try:
            baseline_coach = together_inference(BASELINE_MODEL, coach_msgs, api_key)
        except Exception as e:
            baseline_coach = f"[Error: {e}]"
    else:
        baseline_triage = "[Set TOGETHER_API_KEY to run baseline]"
        baseline_coach = "[Set TOGETHER_API_KEY to run baseline]"

    # Run fine-tuned
    finetuned_triage = ""
    finetuned_coach = ""
    if api_key and FINETUNED_MODEL:
        try:
            finetuned_triage = together_inference(FINETUNED_MODEL, triage_msgs, api_key)
        except Exception as e:
            finetuned_triage = f"[Error: {e}]"
        try:
            finetuned_coach = together_inference(FINETUNED_MODEL, coach_msgs, api_key)
        except Exception as e:
            finetuned_coach = f"[Error: {e}]"
    else:
        # Use deterministic as placeholder when model isn't ready
        finetuned_triage = triage_gt + "\n\n[AutoScientist model pending — showing deterministic ground truth]"
        finetuned_coach = coach_gt + "\n\n[AutoScientist model pending — showing deterministic ground truth]"

    results["baseline_triage"] = baseline_triage
    results["baseline_coach"] = baseline_coach
    results["finetuned_triage"] = finetuned_triage
    results["finetuned_coach"] = finetuned_coach
    results["ground_truth_triage"] = triage_gt
    results["ground_truth_coach"] = coach_gt

    return render_comparison(results)


def render_comparison(results: dict) -> str:
    """Render the comparison as HTML."""
    debt = results["debt_score"]
    systems = results["systems"]

    systems_html = "<br>".join(
        f"<span style='color: var(--text-muted);'>{s['label']}: {s['score']}/100</span>"
        for s in sorted(systems, key=lambda x: -x["score"])
    )

    def format_output(text: str, label: str, color: str) -> str:
        safe = text.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
        return f"""
        <div style="border: 1px solid {LT_BORDER}; border-radius: 12px; padding: 16px; background: {LT_BG_SURFACE};">
            <div style="font-size: 13px; font-weight: 600; color: {color}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">{label}</div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; color: {LT_TEXT_PRIMARY}; white-space: pre-wrap;">{safe}</div>
        </div>
        """

    return f"""
    <div style="font-family: Inter, sans-serif;">
        <!-- Score header -->
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; font-weight: 800; color: {BRAND_PRIMARY};">{debt}/100</div>
            <div style="font-size: 14px; color: {LT_TEXT_MUTED}; margin-top: 4px;">Body Debt Score</div>
            <div style="margin-top: 12px;">{systems_html}</div>
        </div>

        <!-- Triage comparison -->
        <div style="margin-bottom: 32px;">
            <h3 style="font-size: 18px; font-weight: 700; color: {LT_TEXT_PRIMARY}; margin-bottom: 12px;">
                🏥 Triage Plan
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                {format_output(results["baseline_triage"], "Baseline (Llama-3.2-3B)", "#DC2626")}
                {format_output(results["finetuned_triage"], "Fine-tuned (AutoScientist)", "#16A34A")}
                {format_output(results["ground_truth_triage"], "Ground Truth (Deterministic)", "#7C3AED")}
            </div>
        </div>

        <!-- Coach comparison -->
        <div style="margin-bottom: 32px;">
            <h3 style="font-size: 18px; font-weight: 700; color: {LT_TEXT_PRIMARY}; margin-bottom: 12px;">
                📋 Recovery Prescription
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                {format_output(results["baseline_coach"], "Baseline (Llama-3.2-3B)", "#DC2626")}
                {format_output(results["finetuned_coach"], "Fine-tuned (AutoScientist)", "#16A34A")}
                {format_output(results["ground_truth_coach"], "Ground Truth (Deterministic)", "#7C3AED")}
            </div>
        </div>

        <!-- Info footer -->
        <div style="text-align: center; padding: 16px; border-top: 1px solid {LT_BORDER}; margin-top: 24px;">
            <p style="font-size: 13px; color: {LT_TEXT_MUTED};">
                Built with <a href="https://adaptionlabs.ai">Adaption AutoScientist</a> ·
                Dataset + weights on <a href="https://huggingface.co/Papajams">Hugging Face</a> and <a href="https://kaggle.com/udirobert">Kaggle</a>
            </p>
        </div>
    </div>
    """


# ─── Presets ──────────────────────────────────────────────────────────────────

def preset_bad_night():
    return True, "red_wine", "3-4", False, "full_body", "hard", True, "4-6", True, "yes", False, "moderate", False

def preset_hit_hard():
    return True, "spirits", "5+", True, "full_body", "destroyed", True, "under_4", True, "yes", False, "moderate", False

def preset_recovery():
    return False, "red_wine", "3-4", True, "full_body", "easy", False, "4-6", False, "yes", False, "moderate", True

def preset_sick():
    return False, "red_wine", "3-4", False, "full_body", "hard", True, "4-6", True, "yes", True, "moderate", False


# ─── Gradio UI ────────────────────────────────────────────────────────────────

CUSTOM_CSS = """
:root {
    --bg-base: #FAFAF9;
    --bg-surface: #FFFFFF;
    --border: rgba(0, 0, 0, 0.08);
    --text-primary: #1C1917;
    --text-secondary: #57534E;
    --text-muted: #78716C;
    --brand: #EA580C;
}

.gradio-container { max-width: 1200px !important; }
"""

APP_THEME = gr.themes.Soft(
    primary_hue="orange",
    secondary_hue="amber",
    neutral_hue="stone",
    font=[gr.themes.GoogleFont("Inter"), "system-ui", "sans-serif"],
    font_mono=[gr.themes.GoogleFont("JetBrains Mono"), "monospace"],
)

with gr.Blocks(title="Body Debt — AutoScientist Demo") as demo:
    gr.HTML("""
    <div style="text-align: center; padding: 24px 0;">
        <h1 style="font-size: 32px; font-weight: 800; color: #1C1917; margin-bottom: 8px;">
            🫀 Body Debt × AutoScientist
        </h1>
        <p style="font-size: 16px; color: #78716C; max-width: 600px; margin: 0 auto;">
            See how a fine-tuned Llama-3.2-3B produces structured health recovery
            prescriptions compared to the base model. Trained with Adaption Labs'
            AutoScientist platform on a deterministic physiological scoring engine.
        </p>
        <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <span style="background: #FEF3C7; color: #92400E; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">Healthcare Category</span>
            <span style="background: #DBEAFE; color: #1E40AF; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">Llama-3.2-3B · LoRA</span>
            <span style="background: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">Quality: C → A (+31.9%)</span>
        </div>
    </div>
    """)

    with gr.Row():
        # Input panel
        with gr.Column(scale=1):
            gr.HTML('<div style="font-size: 14px; font-weight: 600; color: #57534E; margin-bottom: 12px;">Pick a scenario or customize:</div>')

            with gr.Row():
                btn_bad = gr.Button("🌙 Bad night", size="sm")
                btn_hard = gr.Button("🔥 Hit it hard", size="sm")
                btn_recovery = gr.Button("♻️ Recovery", size="sm")
                btn_sick = gr.Button("🤒 Sick", size="sm")

            with gr.Accordion("Customize", open=False):
                alcohol = gr.Checkbox(label="🍺 Drank", value=False)
                with gr.Group(visible=False) as alcohol_details:
                    alcohol_type = gr.Dropdown(
                        choices=["beer", "red_wine", "white_wine", "spirits", "cocktails", "champagne"],
                        value="red_wine", label="What?",
                    )
                    alcohol_count = gr.Dropdown(
                        choices=["1-2", "3-4", "5+", "lost_count"],
                        value="3-4", label="How many?",
                    )

                training = gr.Checkbox(label="💪 Trained", value=False)
                with gr.Group(visible=False) as training_details:
                    training_area = gr.Dropdown(
                        choices=["legs", "upper", "cardio", "hiit", "full_body", "mobility"],
                        value="full_body", label="What?",
                    )
                    training_intensity = gr.Dropdown(
                        choices=["easy", "hard", "destroyed"],
                        value="hard", label="Intensity?",
                    )

                sleep = gr.Checkbox(label="😴 Slept badly", value=False)
                with gr.Group(visible=False) as sleep_details:
                    sleep_hours = gr.Dropdown(
                        choices=["under_4", "4-6", "6-7"],
                        value="4-6", label="How many hours?",
                    )

                stress = gr.Checkbox(label="😤 High stress", value=False)
                with gr.Group(visible=False) as stress_details:
                    stress_carried = gr.Dropdown(
                        choices=["yes", "mostly_gone"],
                        value="yes", label="Still carrying it?",
                    )

                ill = gr.Checkbox(label="🤒 Feeling ill", value=False)
                with gr.Group(visible=False) as ill_details:
                    ill_severity = gr.Dropdown(
                        choices=["mild", "moderate", "floored"],
                        value="moderate", label="How bad?",
                    )

                care = gr.Checkbox(label="✦ Took care of myself", value=False)

            run_btn = gr.Button("Compare Models →", variant="primary", size="lg")

        # Output panel
        with gr.Column(scale=2):
            output = gr.HTML(value="<div style='text-align: center; padding: 48px; color: #78716C;'>Pick a scenario and click Compare to see the before/after comparison.</div>")

    # Toggle detail sections
    alcohol.change(lambda v: gr.Group(visible=v), alcohol, alcohol_details)
    training.change(lambda v: gr.Group(visible=v), training, training_details)
    sleep.change(lambda v: gr.Group(visible=v), sleep, sleep_details)
    stress.change(lambda v: gr.Group(visible=v), stress, stress_details)
    ill.change(lambda v: gr.Group(visible=v), ill, ill_details)

    # Preset buttons
    INPUTS = [alcohol, alcohol_type, alcohol_count,
              training, training_area, training_intensity,
              sleep, sleep_hours,
              stress, stress_carried,
              ill, ill_severity,
              care]

    for btn, fn in [
        (btn_bad, preset_bad_night),
        (btn_hard, preset_hit_hard),
        (btn_recovery, preset_recovery),
        (btn_sick, preset_sick),
    ]:
        btn.click(fn=fn, outputs=INPUTS).then(
            fn=run_comparison,
            inputs=INPUTS,
            outputs=output,
        )

    run_btn.click(
        fn=run_comparison,
        inputs=INPUTS,
        outputs=output,
    )

    gr.HTML("""
    <div style="text-align: center; padding: 16px; border-top: 1px solid rgba(0,0,0,0.08); margin-top: 24px;">
        <p style="font-size: 13px; color: #78716C;">
            Built for the <a href="https://adaptionlabs.ai/blog/autoscientist-challenge">AutoScientist Challenge</a> ·
            <a href="https://adaptionlabs.ai">Adaption Labs</a> ·
            Dataset + weights: <a href="https://huggingface.co/Papajams">Hugging Face</a> · <a href="https://kaggle.com/udirobert">Kaggle</a>
        </p>
    </div>
    """)


if __name__ == "__main__":
    demo.launch(theme=APP_THEME, css=CUSTOM_CSS)
