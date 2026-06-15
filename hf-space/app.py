"""
Body Debt — Gradio App
Quantifies physiological debt from lifestyle stressors and provides
AI-backed recovery prescriptions using a local 1B parameter model.
"""

from __future__ import annotations

import time
from datetime import datetime

import gradio as gr
import numpy as np

from scoring import (
    Stressor,
    compute_live_score,
    compute_system_scores,
    STRESSOR_DEFS,
)
from face_scan import run_face_scan, features_to_array
from stress_model import predict_stress_score
from health_coach import generate_advice

# ─── Theme ────────────────────────────────────────────────────────────────────

theme = gr.themes.Base(
    primary_hue=gr.themes.colors.orange,
    secondary_hue=gr.themes.colors.stone,
    neutral_hue=gr.themes.colors.stone,
    font=gr.themes.GoogleFont("Inter"),
).set(
    body_background_fill="#0a0a0a",
    body_background_fill_dark="#0a0a0a",
    block_background_fill="#141414",
    block_background_fill_dark="#141414",
    block_border_color="#262626",
    block_border_color_dark="#262626",
    button_primary_background_fill="#ea580c",
    button_primary_background_fill_dark="#ea580c",
    button_primary_text_color="white",
)

# ─── Scoring logic wrappers ───────────────────────────────────────────────────


def build_stressors(
    alcohol: bool,
    alcohol_type: str,
    alcohol_count: str,
    training: bool,
    training_area: str,
    training_intensity: str,
    sleep: bool,
    sleep_hours: str,
    stress: bool,
    stress_carried: str,
    ill: bool,
    ill_severity: str,
    care: bool,
) -> list[Stressor]:
    stressors = []
    if alcohol:
        stressors.append(
            Stressor(type="alcohol", alcohol_type=alcohol_type, alcohol_count=alcohol_count)
        )
    if training:
        stressors.append(
            Stressor(type="training", training_area=training_area, training_intensity=training_intensity)
        )
    if sleep:
        stressors.append(Stressor(type="sleep", sleep_hours=sleep_hours))
    if stress:
        stressors.append(Stressor(type="stress", stress_carried=stress_carried))
    if ill:
        stressors.append(Stressor(type="ill", ill_severity=ill_severity))
    if care:
        stressors.append(Stressor(type="care"))
    return stressors


def run_analysis(
    alcohol,
    alcohol_type,
    alcohol_count,
    training,
    training_area,
    training_intensity,
    sleep,
    sleep_hours,
    stress,
    stress_carried,
    ill,
    ill_severity,
    care,
    bed_time,
    wake_time,
    face_image,
    progress=gr.Progress(),
):
    stressors = build_stressors(
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours,
        stress, stress_carried,
        ill, ill_severity,
        care,
    )

    if not stressors:
        return (
            "## No stressors logged\nLog at least one stressor to calculate your debt.",
            "",
            "",
        )

    progress(0.1, desc="Calculating debt score...")
    live_score = compute_live_score(stressors)
    system_scores = compute_system_scores(
        stressors,
        now=datetime.now(),
        bed_time=bed_time or None,
        wake_time=wake_time or None,
    )

    # Face scan
    face_stress = None
    face_text = ""
    if face_image is not None:
        progress(0.3, desc="Analyzing face...")
        features = run_face_scan(face_image)
        if features:
            arr = features_to_array(features)
            face_stress, is_healthy = predict_stress_score(arr)
            status = "✅ Healthy" if is_healthy else "⚠️ Stressed"
            face_text = f"### 🔬 Face Scan\n**Facial stress:** {face_stress:.0f}/100 ({status})\n\n"
            face_text += "Features detected: "
            face_text += f"Eye aspect={features.left_eye_aspect:.3f}/{features.right_eye_aspect:.3f}, "
            face_text += f"Brow tension={features.brow_tension:.4f}, "
            face_text += f"Eye symmetry={features.eye_symmetry:.3f}\n\n"
            face_text += "*Processed entirely on-device. No biometric data leaves your machine.*"

    # Build score display
    progress(0.5, desc="Building system breakdown...")
    score_emoji = "🟢" if live_score < 30 else ("🟡" if live_score < 60 else "🔴")
    verdict = (
        "You're clear. Minimal debt."
        if live_score < 20
        else (
            "Low debt. Minor adjustments needed."
            if live_score < 40
            else (
                "Moderate debt. Recovery actions recommended."
                if live_score < 60
                else (
                    "High debt. Prioritize recovery."
                    if live_score < 80
                    else "Critical debt. Full rest mode."
                )
            )
        )
    )

    score_md = f"# {score_emoji} Body Debt: {live_score}/100\n\n"
    score_md += f"**{verdict}**\n\n---\n\n"
    score_md += "### Five-System Breakdown\n\n"
    score_md += "| System | Load | Clears | Action |\n|---|---|---|---|\n"
    for s in system_scores:
        bar = "█" * (s.score // 10) + "░" * (10 - s.score // 10)
        score_md += f"| {s.icon} {s.label} | {bar} {s.score} | {s.cleared_at} | {s.action_text} |\n"

    score_md += "\n---\n\n### Cause Analysis\n\n"
    for s in system_scores:
        if s.score > 0:
            score_md += f"**{s.icon} {s.label}:** {s.cause_text}\n\n"

    if any(s.science_fact for s in system_scores if s.score > 20):
        score_md += "---\n\n### 🔬 Science\n\n"
        for s in system_scores:
            if s.score > 20 and s.science_fact:
                score_md += f"> {s.science_fact}\n> — *{s.science_cite}*\n\n"

    # LLM advice
    progress(0.6, desc="Generating recovery prescription (local LLM)...")
    stressor_summary = ", ".join(
        f"{STRESSOR_DEFS[s.type]['icon']} {STRESSOR_DEFS[s.type]['label']}" for s in stressors
    )
    system_dicts = [
        {"label": s.label, "score": s.score, "cleared_at": s.cleared_at} for s in system_scores
    ]
    advice = generate_advice(
        debt_score=live_score,
        system_scores=system_dicts,
        stressor_summary=stressor_summary,
        face_stress=face_stress,
        progress_callback=lambda p, msg: progress(0.6 + p * 0.35, desc=msg),
    )
    progress(1.0, desc="Done!")

    advice_md = "### 🤖 Recovery Prescription\n\n"
    advice_md += f"*Generated by Llama-3.2-1B running locally*\n\n{advice}"

    return score_md, face_text, advice_md


# ─── UI ───────────────────────────────────────────────────────────────────────

css = """
.dark { --body-background-fill: #0a0a0a; }
.stressor-section { border: 1px solid #262626; border-radius: 8px; padding: 12px; margin: 4px 0; }
footer { display: none !important; }
"""

with gr.Blocks(title="Body Debt") as demo:
    gr.Markdown(
        """
        # 🫀 Body Debt
        **Quantify your physiological debt. Get AI-backed recovery prescriptions.**

        Log what happened last night → get a precise, system-level recovery plan powered by
        a local 1B-parameter model. Everything runs on-device.
        """,
    )

    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### Log Stressors")

            alcohol = gr.Checkbox(label="🍺 Drank", value=False)
            with gr.Group(visible=False) as alcohol_details:
                alcohol_type = gr.Dropdown(
                    choices=["beer", "red_wine", "white_wine", "spirits", "cocktails", "champagne"],
                    value="beer",
                    label="What?",
                )
                alcohol_count = gr.Dropdown(
                    choices=["1-2", "3-4", "5+", "lost_count"],
                    value="3-4",
                    label="How many?",
                )

            training = gr.Checkbox(label="💪 Trained", value=False)
            with gr.Group(visible=False) as training_details:
                training_area = gr.Dropdown(
                    choices=["legs", "upper", "cardio", "hiit", "full_body", "mobility"],
                    value="full_body",
                    label="What?",
                )
                training_intensity = gr.Dropdown(
                    choices=["easy", "hard", "destroyed"],
                    value="hard",
                    label="Intensity?",
                )

            sleep = gr.Checkbox(label="😴 Slept badly", value=False)
            with gr.Group(visible=False) as sleep_details:
                sleep_hours = gr.Dropdown(
                    choices=["under_4", "4-6", "6-7"],
                    value="4-6",
                    label="How many hours?",
                )

            stress = gr.Checkbox(label="😤 High stress", value=False)
            with gr.Group(visible=False) as stress_details:
                stress_carried = gr.Dropdown(
                    choices=["yes", "mostly_gone"],
                    value="yes",
                    label="Still carrying it?",
                )

            ill = gr.Checkbox(label="🤒 Feeling ill", value=False)
            with gr.Group(visible=False) as ill_details:
                ill_severity = gr.Dropdown(
                    choices=["mild", "moderate", "floored"],
                    value="moderate",
                    label="How bad?",
                )

            care = gr.Checkbox(label="✦ Took care of myself", value=False)

            gr.Markdown("### Timing")
            bed_time = gr.Textbox(label="Bedtime (e.g. 2:00 AM)", placeholder="2:00 AM")
            wake_time = gr.Textbox(label="Wake time (e.g. 8:30 AM)", placeholder="8:30 AM")

            gr.Markdown("### 📷 Face Scan (Optional)")
            face_image = gr.Image(
                label="Capture or upload a photo",
                sources=["webcam", "upload"],
                type="numpy",
            )

            analyze_btn = gr.Button("⚡ Calculate Body Debt", variant="primary", size="lg")

        with gr.Column(scale=2):
            score_output = gr.Markdown(
                value="### Results will appear here\nLog your stressors and click Calculate.",
            )
            face_output = gr.Markdown(value="")
            advice_output = gr.Markdown(value="")

    # Toggle detail sections
    alcohol.change(lambda v: gr.Group(visible=v), alcohol, alcohol_details)
    training.change(lambda v: gr.Group(visible=v), training, training_details)
    sleep.change(lambda v: gr.Group(visible=v), sleep, sleep_details)
    stress.change(lambda v: gr.Group(visible=v), stress, stress_details)
    ill.change(lambda v: gr.Group(visible=v), ill, ill_details)

    analyze_btn.click(
        fn=run_analysis,
        inputs=[
            alcohol, alcohol_type, alcohol_count,
            training, training_area, training_intensity,
            sleep, sleep_hours,
            stress, stress_carried,
            ill, ill_severity,
            care,
            bed_time, wake_time,
            face_image,
        ],
        outputs=[score_output, face_output, advice_output],
    )

    gr.Markdown(
        """
        ---
        *Body Debt uses Llama-3.2-1B (1 billion parameters) running locally via llama-cpp-python.
        Face analysis uses MediaPipe FaceMesh — no biometric data leaves your device.
        Built for the [Build Small Hackathon](https://huggingface.co/spaces/huggingface/build-small-hackathon).*
        """
    )


if __name__ == "__main__":
    demo.launch(theme=theme, css=css)
