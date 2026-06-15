"""
Body Debt — Gradio App (dark "off-brand" edition)
Quantifies physiological debt from lifestyle stressors and provides
AI-backed recovery prescriptions using a local small model.
"""

from __future__ import annotations

import html
import time
from datetime import datetime

import gradio as gr
import numpy as np

from scoring import (
    Stressor,
    compute_live_score,
    compute_system_scores,
    compute_counterfactual,
    STRESSOR_DEFS,
    SYSTEM_META,
)
from face_scan import run_face_scan, features_to_array
from stress_model import predict_stress_score
from health_coach import stream_advice, stream_plan, _fallback_advice, _fallback_plan

# ─── Design tokens (mirrors src/lib/design-tokens.ts) ────────────────────────

BG_BASE       = "#0A0A0B"
BG_SURFACE    = "#141416"
BG_ELEVATED   = "#1C1C1F"
BORDER        = "rgba(168, 162, 158, 0.10)"
BORDER_SOFT   = "rgba(168, 162, 158, 0.06)"

TEXT_PRIMARY   = "#F5F5F4"
TEXT_SECONDARY = "#A8A29E"
TEXT_MUTED     = "#524F4C"
TEXT_FAINT     = "#3a3835"

BRAND_PRIMARY   = "#EA580C"
BRAND_SECONDARY = "#F59E0B"
RECOVERY_GREEN  = "#4ADE80"

# Light mode tokens
LT_BG_BASE       = "#FAFAF9"
LT_BG_SURFACE    = "#F5F5F4"
LT_BG_ELEVATED   = "#E7E5E4"
LT_BORDER        = "rgba(0, 0, 0, 0.08)"
LT_BORDER_SOFT   = "rgba(0, 0, 0, 0.04)"
LT_TEXT_PRIMARY   = "#1C1917"
LT_TEXT_SECONDARY = "#57534E"
LT_TEXT_MUTED     = "#7A7672"
LT_TEXT_FAINT     = "#B8B4B0"

SYSTEM_ACCENTS = {
    "cardiovascular": ("#F43F5E", "rgba(244, 63, 94, 0.18)", "rgba(244, 63, 94, 0.40)"),
    "brain":          ("#22D3EE", "rgba(34, 211, 238, 0.18)", "rgba(34, 211, 238, 0.40)"),
    "liver":          ("#EAB308", "rgba(234, 179, 8, 0.18)",  "rgba(234, 179, 8, 0.40)"),
    "muscular":       ("#A78BFA", "rgba(167, 139, 250, 0.18)","rgba(167, 139, 250, 0.40)"),
    "gut":            ("#2DD4BF", "rgba(45, 212, 191, 0.18)", "rgba(45, 212, 191, 0.40)"),
}

SYSTEM_GLYPHS = {
    "cardiovascular": "C",
    "brain": "N",
    "liver": "L",
    "muscular": "M",
    "gut": "G",
}

DEBT_TIERS = [
    (0,  20, "#4ADE80", "You're clear. Minimal debt.",         "low"),
    (20, 40, "#F59E0B", "Low debt. Minor adjustments needed.", "low"),
    (40, 60, "#EA580C", "Moderate debt. Recovery recommended.","moderate"),
    (60, 80, "#DC2626", "High debt. Prioritize recovery.",     "high"),
    (80, 101,"#991B1B", "Critical debt. Full rest mode.",      "critical"),
]

TIME_OPTIONS = []
for h in range(12):
    for m in ["00", "30"]:
        if h == 0:
            TIME_OPTIONS.append(f"12:{m} AM")
        else:
            TIME_OPTIONS.append(f"{h}:{m} AM")
for h in range(12):
    for m in ["00", "30"]:
        if h == 0:
            TIME_OPTIONS.append(f"12:{m} PM")
        else:
            TIME_OPTIONS.append(f"{h}:{m} PM")

WINDOW_COLORS = {
    "RIGHT NOW":     "#DC2626",
    "THIS MORNING":  "#EA580C",
    "TODAY":         "#F59E0B",
    "AVOID":         "#A78BFA",
}


def debt_tier(score: int) -> tuple[str, str, str]:
    for lo, hi, color, verdict, _ in DEBT_TIERS:
        if lo <= score < hi:
            return color, verdict, DEBT_TIERS[DEBT_TIERS.index((lo, hi, color, verdict, _))][4]
    return "#4ADE80", "You're clear. Minimal debt.", "low"


# ─── Custom CSS (off-brand dark theme) ───────────────────────────────────────

CUSTOM_CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

:root {{
    --bg-base: {BG_BASE};
    --bg-surface: {BG_SURFACE};
    --bg-elevated: {BG_ELEVATED};
    --border: {BORDER};
    --border-soft: {BORDER_SOFT};
    --text-primary: {TEXT_PRIMARY};
    --text-secondary: {TEXT_SECONDARY};
    --text-muted: {TEXT_MUTED};
    --text-faint: {TEXT_FAINT};
    --brand: {BRAND_PRIMARY};
    --brand-secondary: {BRAND_SECONDARY};
    --recovery-green: {RECOVERY_GREEN};
}}

body.light-mode {{
    --bg-base: {LT_BG_BASE};
    --bg-surface: {LT_BG_SURFACE};
    --bg-elevated: {LT_BG_ELEVATED};
    --border: {LT_BORDER};
    --border-soft: {LT_BORDER_SOFT};
    --text-primary: {LT_TEXT_PRIMARY};
    --text-secondary: {LT_TEXT_SECONDARY};
    --text-muted: {LT_TEXT_MUTED};
    --text-faint: {LT_TEXT_FAINT};
    --brand: {BRAND_PRIMARY};
    --brand-secondary: {BRAND_SECONDARY};
    --recovery-green: {RECOVERY_GREEN};
}}

html, body, .gradio-container {{
    background: var(--bg-base) !important;
    color: var(--text-primary) !important;
    font-family: 'Inter', system-ui, sans-serif !important;
}}

.gradio-container {{ max-width: 1180px !important; padding: 0 24px 60px !important; }}
footer {{ display: none !important; }}

/* Hide default Gradio chrome we don't need */
.block.padded, .panel, .gap, .form {{ background: transparent !important; border: none !important; }}

/* The giant debt score number */
.debt-hero {{
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: clamp(7rem, 22vw, 11rem);
    font-weight: 400;
    line-height: 0.9;
    letter-spacing: -0.04em;
    margin: 0;
    text-shadow: 0 0 60px currentColor;
    transition: color 0.6s ease;
    animation: heroDrop 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}}

.debt-hero-label {{
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 8px;
    animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s backwards;
}}

.debt-verdict {{
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-top: 6px;
    animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s backwards;
}}

/* The breathing orb behind the score */
.orb-wrap {{
    position: relative;
    display: inline-block;
    padding: 40px 60px 30px;
}}

.orb-wrap::before {{
    content: '';
    position: absolute;
    inset: -30px;
    background: radial-gradient(circle, currentColor 0%, transparent 65%);
    opacity: 0.18;
    border-radius: 50%;
    animation: orbBreath 4s ease-in-out infinite;
    z-index: -2;
}}

.orb-wrap::after {{
    content: '';
    position: absolute;
    inset: -50px;
    background: radial-gradient(circle, currentColor 0%, transparent 70%);
    opacity: 0.06;
    border-radius: 50%;
    animation: orbBreath 4s ease-in-out infinite 0.5s;
    z-index: -3;
    filter: blur(8px);
}}

@keyframes orbBreath {{
    0%, 100% {{ transform: scale(1); }}
    50%      {{ transform: scale(1.10); }}
}}

@keyframes heroDrop {{
    0%   {{ opacity: 0; transform: scale(0.6) translateY(8px); filter: blur(8px); }}
    100% {{ opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }}
}}

@keyframes fadeUp {{
    0%   {{ opacity: 0; transform: translateY(6px); }}
    100% {{ opacity: 1; transform: translateY(0); }}
}}

/* Section labels */
.section-label {{
    font-family: 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}}

.section-label::after {{
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-soft);
}}

/* System meter */
.sys-meter {{
    padding: 10px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: border-color 0.2s, background 0.2s;
    animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}}
.sys-meter:nth-child(1) {{ animation-delay: 0.05s; }}
.sys-meter:nth-child(2) {{ animation-delay: 0.10s; }}
.sys-meter:nth-child(3) {{ animation-delay: 0.15s; }}
.sys-meter:nth-child(4) {{ animation-delay: 0.20s; }}
.sys-meter:nth-child(5) {{ animation-delay: 0.25s; }}
.sys-meter.is-primary {{
    background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
}}
.sys-glyph {{
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
}}
.sys-body {{ flex: 1; min-width: 0; }}
.sys-row {{ display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }}
.sys-label {{ font-size: 13px; font-weight: 600; color: var(--text-primary); }}
.sys-time {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--text-muted); }}
.sys-bar {{ margin-top: 8px; height: 3px; background: rgba(168, 162, 158, 0.10); border-radius: 2px; overflow: hidden; }}
.sys-bar-fill {{ height: 100%; border-radius: 2px; transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1); }}
.sys-cause {{ font-size: 11px; color: var(--text-muted); margin-top: 6px; line-height: 1.4; }}

/* Protocol step */
.proto-step {{ display: flex; gap: 12px; padding: 8px 0; }}
.proto-rail {{ display: flex; flex-direction: column; align-items: center; width: 30px; flex-shrink: 0; }}
.proto-num {{
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700;
    border: 1px solid currentColor;
    background: rgba(255,255,255,0.02);
}}
.proto-conn {{ flex: 1; width: 1px; background: var(--border); min-height: 18px; margin-top: 4px; }}
.proto-window {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
    margin-bottom: 4px;
}}
.proto-action {{
    font-size: 13px; color: var(--text-primary); line-height: 1.55;
    font-weight: 500;
}}

/* Science cards */
.sci-card {{
    padding: 12px 14px;
    background: var(--bg-elevated);
    border-left: 2px solid currentColor;
    border-radius: 0 8px 8px 0;
    margin-bottom: 8px;
}}
.sci-fact {{ font-size: 12px; color: var(--text-secondary); line-height: 1.55; margin: 0 0 4px; }}
.sci-cite {{ font-size: 10px; color: var(--text-faint); font-style: italic; margin: 0; font-family: 'JetBrains Mono', monospace; }}

/* Face scan pill */
.face-pill {{
    padding: 14px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}}
.face-pill-placeholder {{
    padding: 20px;
    background: var(--bg-surface);
    border: 1.5px dashed var(--border);
    border-radius: 12px;
    text-align: center;
    margin-bottom: 16px;
    transition: border-color 0.2s;
}}
.face-pill-placeholder:hover {{
    border-color: var(--brand);
}}
.face-pill-placeholder .icon {{ font-size: 28px; opacity: 0.4; margin-bottom: 6px; }}
.face-pill-placeholder .label {{ font-size: 11px; color: var(--text-muted); font-weight: 500; }}
.face-pill-placeholder .sub {{ font-size: 9px; color: var(--text-faint); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }}
.face-num {{ font-family: 'DM Serif Display', serif; font-size: 36px; line-height: 1; }}
.face-label {{ font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-muted); }}
.face-status {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }}
.face-meta {{ font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-faint); margin-top: 4px; }}
.face-bar {{ margin-top: 8px; height: 4px; background: rgba(168, 162, 158, 0.08); border-radius: 2px; overflow: hidden; }}
.face-bar-fill {{ height: 100%; border-radius: 2px; transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }}

/* Agent trace */
.trace-step {{
    display: flex; align-items: center; gap: 10px;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 4px;
}}
.trace-step.is-active {{ color: var(--brand); background: rgba(234, 88, 12, 0.06); }}
.trace-step.is-done   {{ color: var(--recovery-green); }}
.trace-dot {{ width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }}
.trace-step.is-active .trace-dot {{ animation: pulse 1.2s ease-in-out infinite; }}
@keyframes pulse {{ 0%,100% {{ opacity: 1; }} 50% {{ opacity: 0.3; }} }}

/* AI coach block */
.coach-block {{
    padding: 20px 22px;
    background: linear-gradient(180deg, var(--bg-surface), var(--bg-base));
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-top: 8px;
}}
.coach-header {{
    display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--brand);
}}
.coach-pill {{
    background: var(--bg-elevated);
    color: var(--text-muted);
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9px;
}}
.coach-body {{
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.7;
    white-space: pre-wrap;
    min-height: 60px;
}}
.coach-cursor {{
    display: inline-block;
    width: 7px; height: 14px;
    background: var(--brand);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s steps(2, start) infinite;
}}
@keyframes blink {{ to {{ visibility: hidden; }} }}

/* Buttons */
button.primary, .gr-button-primary {{
    background: var(--brand) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 0.02em !important;
    transition: transform 0.15s, box-shadow 0.15s !important;
}}
button.primary:hover, .gr-button-primary:hover {{
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(234, 88, 12, 0.35) !important;
}}

/* Inputs */
input, textarea, .gr-input, .gr-text-input, .gr-dropdown {{
    background: var(--bg-surface) !important;
    border: 1px solid var(--border) !important;
    color: var(--text-primary) !important;
    border-radius: 8px !important;
}}
input:focus, textarea:focus {{ border-color: var(--brand) !important; outline: none !important; }}

/* Checkbox */
.gr-checkbox {{ background: transparent !important; }}
.gr-checkbox input[type="checkbox"] {{
    appearance: none;
    width: 18px; height: 18px;
    border: 1.5px solid var(--text-muted);
    border-radius: 4px;
    background: var(--bg-surface);
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
}}
.gr-checkbox input[type="checkbox"]:checked {{
    background: var(--brand);
    border-color: var(--brand);
}}
.gr-checkbox input[type="checkbox"]:checked::after {{
    content: '✓';
    color: white;
    position: absolute;
    top: -2px; left: 3px;
    font-size: 14px; font-weight: 800;
}}
.gr-checkbox label {{ color: var(--text-primary) !important; font-weight: 500 !important; }}

/* Care checkbox — green when checked (positive stressor) */
#care-checkbox input[type="checkbox"]:checked {{
    background: var(--recovery-green) !important;
    border-color: var(--recovery-green) !important;
}}
#care-checkbox label {{ color: var(--recovery-green) !important; }}

/* Image upload area */
.gr-image, .gr-image-upload {{
    background: var(--bg-surface) !important;
    border: 1px dashed var(--border) !important;
    border-radius: 10px !important;
}}

/* Empty state */
.empty-state {{
    text-align: center;
    padding: 80px 20px;
    color: var(--text-faint);
}}
.empty-state .icon {{ font-size: 48px; opacity: 0.3; margin-bottom: 12px; }}
.empty-state .label {{ font-size: 14px; font-weight: 500; color: var(--text-muted); }}
.empty-state .sub {{ font-size: 12px; color: var(--text-faint); margin-top: 4px; }}

/* Hide group labels for cleaner look */
.gr-group {{ background: transparent !important; border: none !important; }}
.gr-form {{ background: transparent !important; }}

/* App header */
.app-header {{ text-align: center; padding: 36px 0 28px; border-bottom: 1px solid var(--border-soft); margin-bottom: 28px; }}
.app-title {{
    font-family: 'Inter', sans-serif;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 12px;
    color: var(--text-primary);
    margin: 0 0 6px;
}}
.app-subtitle {{
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    max-width: 480px;
    margin: 0 auto;
}}

/* Footer */
.app-footer {{
    text-align: center;
    padding: 28px 16px 16px;
    margin-top: 36px;
    border-top: 1px solid var(--border-soft);
    font-size: 10px;
    color: var(--text-faint);
    font-family: 'JetBrains Mono', monospace;
}}
.app-footer a {{ color: var(--brand); text-decoration: none; }}

/* Header attribution pills */
.attr-row {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
    flex-wrap: wrap;
}}
.attr-pill {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-surface);
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
}}
.attr-pill:hover {{
    border-color: var(--brand);
    color: var(--text-primary);
}}
.attr-pill .dot {{
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--recovery-green);
    box-shadow: 0 0 8px var(--recovery-green);
}}

/* Ready pulse for empty coach/trace */
.ready-pulse {{
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--brand);
    margin-right: 8px;
    animation: pulse 1.6s ease-in-out infinite;
}}

/* Triage plan */
.plan-block {{
    margin-bottom: 20px;
    animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s backwards;
}}
.plan-source {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--text-faint);
    font-weight: 600;
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0.1em;
}}
.plan-line {{
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--border-soft);
    animation: fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}}
.plan-line:last-child {{ border-bottom: none; }}
.plan-tag {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.14em;
    padding: 3px 8px;
    border: 1px solid;
    border-radius: 4px;
    flex-shrink: 0;
    min-width: 78px;
    text-align: center;
}}
.plan-text {{
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
}}

/* Counterfactual hint */
.cf-block {{
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-left: 2px solid;
    border-radius: 0 10px 10px 0;
    margin: 16px 0;
    animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s backwards;
}}
.cf-label {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
    flex-shrink: 0;
    padding-top: 2px;
    min-width: 140px;
}}
.cf-body {{
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.55;
}}

/* Running debt pill */
.debt-pill {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    transition: all 0.15s;
    margin-bottom: 14px;
}}

/* Preset scenario chips */
.preset-row {{
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 18px;
}}
.preset-chip {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px !important;
    font-weight: 700 !important;
    padding: 5px 14px !important;
    border-radius: 999px !important;
    border: 1px solid var(--border) !important;
    background: var(--bg-surface) !important;
    color: var(--text-secondary) !important;
    letter-spacing: 0.04em !important;
    transition: all 0.15s !important;
    box-shadow: none !important;
}}
.preset-chip:hover {{
    border-color: var(--brand) !important;
    color: var(--text-primary) !important;
    background: rgba(234, 88, 12, 0.06) !important;
}}

/* Clear all button */
button.clear-all {{
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    padding: 4px 12px !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    background: transparent !important;
    color: var(--text-muted) !important;
    transition: all 0.15s !important;
    margin-bottom: 8px !important;
}}
button.clear-all:hover {{
    border-color: var(--text-faint) !important;
    color: var(--text-secondary) !important;
}}

/* Sample badge */
.sample-badge {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}}
.sample-badge .dot {{
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--brand);
    animation: pulse 1.6s ease-in-out infinite;
}}

/* Theme toggle button */
.theme-toggle {{
    position: fixed;
    top: 16px;
    right: 20px;
    z-index: 9999;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    backdrop-filter: blur(8px);
}}
.theme-toggle:hover {{
    border-color: var(--brand);
    color: var(--brand);
    transform: scale(1.08);
}}

/* Smooth theme transitions — 0.2s matches existing hover rhythms */
.gradio-container,
.sys-meter, .coach-block, .coach-pill, .tl-wrap, .face-pill, .face-pill-placeholder, .cf-block,
.debt-pill, .attr-pill,
input, textarea, .gr-input, .gr-text-input, .gr-dropdown,
.gr-checkbox input[type="checkbox"]:not(:checked),
.gr-checkbox label,
.theme-toggle,
.sci-card, .trace-step,
.plan-line, .plan-tag,
.sample-badge, .app-header, .app-footer,
.section-label, .section-label::after,
.debt-hero-label, .debt-verdict,
.sys-label, .sys-time, .sys-cause, .sys-bar-fill,
.proto-conn, .proto-action,
.face-label, .face-meta,
.plan-source, .plan-text,
.cf-label, .cf-body,
.empty-state .label, .empty-state .sub,
.orb-wrap::before, .orb-wrap::after,
#care-checkbox input[type="checkbox"]:not(:checked) {{
    transition: background 0.2s ease,
                color 0.2s ease,
                border-color 0.2s ease;
}}

/* These have !important on their existing transitions, so !important needed here too */
.preset-chip,
button.clear-all,
button.primary, .gr-button-primary {{
    transition: background 0.2s ease,
                color 0.2s ease,
                border-color 0.2s ease !important;
}}

/* Comparison card carousel */
.cmp-section {{ margin-top: 28px; }}
.cmp-row {{
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 4px 0 12px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}}
.cmp-card {{
    min-width: 170px;
    max-width: 200px;
    flex-shrink: 0;
    scroll-snap-align: start;
    padding: 12px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    position: relative;
}}
.cmp-hero {{
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 30px;
    line-height: 1;
    margin-bottom: 2px;
}}
.cmp-label {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
}}
.cmp-time {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    color: var(--text-faint);
    margin-top: 2px;
    margin-bottom: 8px;
}}
.cmp-sys {{
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
    font-size: 10px;
}}
.cmp-sys-glyph {{
    width: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    flex-shrink: 0;
}}
.cmp-sys-bar {{
    flex: 1;
    height: 3px;
    background: rgba(168, 162, 158, 0.10);
    border-radius: 2px;
    overflow: hidden;
}}
.cmp-sys-fill {{
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
}}
.cmp-del {{
    position: absolute;
    top: 4px;
    right: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-faint);
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: system-ui, sans-serif;
}}
.cmp-del:hover {{
    background: rgba(244, 63, 94, 0.15);
    color: #F43F5E;
}}
.cmp-empty {{
    text-align: center;
    padding: 24px;
    color: var(--text-faint);
    font-size: 12px;
}}

/* Timeline chart */
.tl-wrap {{
    margin: 16px 0;
    padding: 14px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 12px;
}}
.tl-label {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-faint);
    min-width: 32px;
    flex-shrink: 0;
}}
.tl-row {{
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
}}
.tl-bar-wrap {{
    flex: 1;
    height: 10px;
    background: rgba(168, 162, 158, 0.06);
    border-radius: 5px;
    overflow: hidden;
    position: relative;
}}
.tl-bar {{
    height: 100%;
    border-radius: 5px;
    transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}}
.tl-bar-stack {{
    height: 100%;
    display: flex;
    border-radius: 5px;
    overflow: hidden;
}}
.tl-seg {{
    height: 100%;
    transition: flex 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}}
.tl-seg:first-child {{ border-radius: 5px 0 0 5px; }}
.tl-seg:last-child {{ border-radius: 0 5px 5px 0; }}
.tl-seg:only-child {{ border-radius: 5px; }}
.tl-score {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    min-width: 22px;
    text-align: right;
    flex-shrink: 0;
}}
.tl-now {{
    display: inline-block;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--brand);
    margin-left: 4px;
}}
.tl-dom {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    font-weight: 800;
    min-width: 16px;
    text-align: center;
    flex-shrink: 0;
}}
/* Timeline legend */
.tl-legend {{
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-soft);
}}
.tl-leg {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}}
.tl-leg-swatch {{
    width: 8px;
    height: 8px;
    border-radius: 2px;
    display: inline-block;
    flex-shrink: 0;
}}

/* Save compare button */
.save-compare {{
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    padding: 5px 12px !important;
    border-radius: 8px !important;
    border: 1px solid var(--border) !important;
    background: transparent !important;
    color: var(--text-secondary) !important;
    transition: all 0.15s !important;
}}
.save-compare:hover {{
    border-color: var(--brand) !important;
    color: var(--brand) !important;
}}

/* Mobile / narrow viewport */
@media (max-width: 900px) {{
    .gradio-container {{ padding: 0 16px 40px !important; }}
    .app-header {{ padding: 24px 0 20px; margin-bottom: 18px; }}
    .debt-hero {{ font-size: clamp(5.5rem, 28vw, 8rem); }}
    .orb-wrap {{ padding: 28px 20px 22px; }}
    .theme-toggle {{ top: 12px; right: 12px; width: 32px; height: 32px; font-size: 14px; }}
    .gradio-row > div {{ flex-wrap: wrap !important; }}
}}
@media (max-width: 600px) {{
    .gradio-container {{ padding: 0 10px 28px !important; }}
    .app-header {{ padding: 18px 0 16px; margin-bottom: 14px; }}
    .app-title {{ font-size: 10px; }}
    .app-subtitle {{ font-size: 11px; }}
    .attr-pill {{ font-size: 8px; padding: 2px 8px; }}
    .debt-hero {{ font-size: clamp(3.8rem, 24vw, 5.5rem) !important; }}
    .debt-hero-label {{ font-size: 8px; }}
    .debt-verdict {{ font-size: 12px; }}
    .orb-wrap {{ padding: 20px 12px 16px; }}
    .orb-wrap::before {{ inset: -20px; }}
    .orb-wrap::after {{ inset: -35px; }}
    .section-label {{ font-size: 8px; margin: 0 0 8px; }}
    .sys-meter {{ padding: 8px 10px; gap: 8px; }}
    .sys-glyph {{ width: 22px; height: 22px; font-size: 10px; }}
    .sys-label {{ font-size: 11px; }}
    .sys-time {{ font-size: 8px; }}
    .sys-cause {{ font-size: 10px; }}
    .coach-block {{ padding: 14px 16px; }}
    .coach-body {{ font-size: 12px; min-height: 40px; }}
    .proto-action {{ font-size: 11px; }}
    .proto-step {{ gap: 8px; }}
    .preset-chip {{ font-size: 9px !important; padding: 4px 10px !important; }}
    .debt-pill {{ font-size: 9px; padding: 4px 10px; }}
    .face-pill {{ padding: 10px 12px; gap: 10px; }}
    .face-num {{ font-size: 28px; }}
    .cf-block {{ padding: 10px 12px; flex-direction: column; gap: 6px; }}
    .cf-label {{ min-width: auto; font-size: 8px; }}
    .cf-body {{ font-size: 11px; }}
    .plan-line {{ gap: 8px; padding: 7px 0; }}
    .plan-tag {{ font-size: 8px; min-width: 64px; padding: 2px 6px; }}
    .plan-text {{ font-size: 11px; }}
    .trace-step {{ font-size: 9px; padding: 4px 8px; }}
    .tl-legend {{ gap: 6px; }}
    .tl-leg {{ font-size: 7px; }}
    .tl-leg-swatch {{ width: 6px; height: 6px; }}
    .tl-dom {{ font-size: 7px; min-width: 12px; }}
    .cmp-card {{ min-width: 140px; max-width: 160px; padding: 10px 10px; }}
    .cmp-hero {{ font-size: 24px; }}
    .cmp-label {{ font-size: 8px; }}
    .empty-state {{ padding: 40px 16px; }}
    .empty-state .icon {{ font-size: 36px; }}
    .empty-state .label {{ font-size: 12px; }}
    .empty-state .sub {{ font-size: 10px; }}
    .sci-card {{ padding: 10px 12px; }}
    .sci-fact {{ font-size: 11px; }}
    .sci-cite {{ font-size: 9px; }}
    .theme-toggle {{ top: 10px; right: 10px; width: 28px; height: 28px; font-size: 12px; }}
    .face-meta {{ font-size: 8px; }}
    .face-status {{ font-size: 9px; }}
    input, textarea {{ font-size: 14px !important; }}
    .gr-checkbox input[type="checkbox"] {{ width: 22px; height: 22px; }}
    .gr-checkbox input[type="checkbox"]:checked::after {{ font-size: 16px; top: -1px; left: 5px; }}
    .gr-checkbox label {{ font-size: 14px !important; }}
    .gr-dropdown {{ font-size: 13px !important; }}
}}
@media (max-width: 420px) {{
    .gradio-container {{ padding: 0 8px 24px !important; }}
    .app-header {{ padding: 14px 0 12px; margin-bottom: 12px; }}
    .app-title {{ font-size: 9px; letter-spacing: 0.16em; }}
    .debt-hero {{ font-size: clamp(2.8rem, 22vw, 3.8rem) !important; }}
    .orb-wrap {{ padding: 14px 8px 12px; }}
    .orb-wrap::before {{ inset: -14px; }}
    .orb-wrap::after {{ inset: -24px; }}
    .preset-row {{ gap: 4px; }}
    .preset-chip {{ font-size: 8px !important; padding: 3px 8px !important; }}
    .attr-pill {{ font-size: 7px; padding: 2px 6px; gap: 4px; }}
    .cmp-card {{ min-width: 120px; max-width: 140px; padding: 8px; }}
    .cmp-hero {{ font-size: 20px; }}
    .plan-tag {{ font-size: 7px; min-width: 54px; }}
    .coach-block {{ padding: 12px 12px; }}
    .coach-header {{ font-size: 8px; }}
    .coach-pill {{ font-size: 8px; padding: 2px 6px; }}
    button.clear-all {{ font-size: 9px !important; padding: 3px 8px !important; }}
    .save-compare {{ font-size: 9px !important; padding: 3px 10px !important; }}
}}
"""

# ─── Theme toggle JS ─────────────────────────────────────────────────────────

THEME_TOGGLE_HTML = """
<button class="theme-toggle" id="themeToggleBtn" onclick="toggleBodyDebtTheme()" aria-label="Toggle theme">🌙</button>
<script>
function toggleBodyDebtTheme() {
    var body = document.body;
    var btn = document.getElementById('themeToggleBtn');
    body.classList.toggle('light-mode');
    var isLight = body.classList.contains('light-mode');
    btn.textContent = isLight ? '☀️' : '🌙';
    try { localStorage.setItem('bodydebt-theme', isLight ? 'light' : 'dark'); } catch(e) {}
}
function removeCompare(idx) {
    var el = document.querySelector('#cmp-remove-idx input');
    if (el) { el.value = idx; el.dispatchEvent(new Event('input', { bubbles: true })); }
}
try {
    if (localStorage.getItem('bodydebt-theme') === 'light') {
        document.body.classList.add('light-mode');
        setTimeout(function() {
            var btn = document.getElementById('themeToggleBtn');
            if (btn) btn.textContent = '☀️';
        }, 0);
    }
} catch(e) {}
</script>
"""

# ─── HTML renderers ──────────────────────────────────────────────────────────


def render_hero(score: int, verdict: str, is_sample: bool = False) -> str:
    color, _, _ = debt_tier(score)
    badge = ""
    if is_sample:
        badge = (
            '<div class="sample-badge">'
            '<span class="dot"></span>'
            "SAMPLE · adjust the form and click <strong>Calculate</strong> for your own"
            "</div>"
        )
    return f"""
    {badge}
    <div class="orb-wrap" style="color: {color};">
        <div class="debt-hero-label">Body Debt Score</div>
        <div class="debt-hero" style="color: {color};">{score}</div>
        <div class="debt-verdict" style="color: var(--text-primary);">{html.escape(verdict)}</div>
    </div>
    """


def render_system_meters(system_scores) -> str:
    max_score = max((s.score for s in system_scores), default=0)
    primary_system = None
    if max_score > 0:
        primary_system = max(system_scores, key=lambda s: s.score).system

    rows = []
    for s in system_scores:
        accent_active, accent_soft, accent_muted = SYSTEM_ACCENTS.get(
            s.system, ("var(--text-secondary)", "var(--border-soft)", "var(--text-muted)")
        )
        is_primary = s.system == primary_system
        glyph = SYSTEM_GLYPHS.get(s.system, "•")
        bar_color = accent_active if is_primary else accent_muted
        label_color = "var(--text-primary)" if is_primary else "var(--text-secondary)"
        pct = max(0, min(100, s.score))
        glyph_bg = accent_soft if is_primary else "rgba(168, 162, 158, 0.06)"

        rows.append(f"""
        <div class="sys-meter {'is-primary' if is_primary else ''}" style="border-color: {accent_soft if is_primary else 'var(--border)'};">
            <div class="sys-glyph" style="background: {glyph_bg}; color: {bar_color};">{glyph}</div>
            <div class="sys-body">
                <div class="sys-row">
                    <span class="sys-label">{s.icon} {html.escape(s.label)}</span>
                    <span class="sys-time" style="color: {bar_color};">clears {s.cleared_at}</span>
                </div>
                <div class="sys-bar">
                    <div class="sys-bar-fill" style="width: {pct}%; background: {bar_color};"></div>
                </div>
                <div class="sys-cause">{html.escape(s.cause_text)}</div>
            </div>
        </div>
        """)

    return f"""
    <div>
        <div class="section-label">Five-system breakdown</div>
        {''.join(rows)}
    </div>
    """


def render_prescription(system_scores, debt_score: int) -> str:
    if debt_score < 20:
        return f"""
        <div class="coach-block">
            <div class="coach-header">Recovery Protocol · Cleared</div>
            <div class="coach-body" style="color: var(--recovery-green);">All five systems below threshold. Maintain the streak.</div>
        </div>
        """

    # Map system actions into the four temporal windows based on severity
    windows = ["RIGHT NOW", "THIS MORNING", "TODAY", "AVOID"]
    active = [s for s in system_scores if s.score > 15]
    if not active:
        active = system_scores[:3]

    # Sort: highest-debt system goes to RIGHT NOW
    active.sort(key=lambda s: -s.score)

    steps = []
    for i, s in enumerate(active[:4]):
        window = windows[min(i, 3)]
        color = WINDOW_COLORS[window]
        steps.append((i + 1, window, s.action_text, color))

    is_last = lambda i: i == len(steps) - 1
    steps_html = ""
    for i, (num, window, action, color) in enumerate(steps):
        connector = "" if is_last(i) else '<div class="proto-conn"></div>'
        steps_html += f"""
        <div class="proto-step">
            <div class="proto-rail">
                <div class="proto-num" style="color: {color};">{str(num).zfill(2)}</div>
                {connector}
            </div>
            <div style="flex: 1; padding-bottom: {'0' if is_last(i) else '16px'};">
                <div class="proto-window" style="color: {color};">{window} · {html.escape(active[i].label)}</div>
                <p class="proto-action">{html.escape(action)}</p>
            </div>
        </div>
        """

    return f"""
    <div class="coach-block">
        <div class="coach-header">Recovery Protocol</div>
        {steps_html}
    </div>
    """


def render_science(system_scores) -> str:
    items = []
    for s in system_scores:
        if s.score > 20 and s.science_fact and s.science_cite:
            accent = SYSTEM_ACCENTS.get(s.system, ("var(--text-secondary)",))[0]
            items.append((accent, s.science_fact, s.science_cite))

    if not items:
        return ""

    cards = "".join(
        f"""
        <div class="sci-card" style="color: {accent};">
            <p class="sci-fact">{html.escape(fact)}</p>
            <p class="sci-cite">— {html.escape(cite)}</p>
        </div>
        """ for accent, fact, cite in items
    )

    return f"""
    <div style="margin-top: 24px;">
        <div class="section-label">The science</div>
        {cards}
    </div>
    """


def render_face_scan(face_stress, is_healthy, _features) -> str:
    status_color = "var(--recovery-green)" if is_healthy else "var(--brand)"
    status_text = "Healthy" if is_healthy else "Stressed"
    status_bg = "rgba(74, 222, 128, 0.10)" if is_healthy else "rgba(234, 88, 12, 0.10)"
    pct = max(0, min(100, face_stress))

    return f"""
    <div class="face-pill">
        <div>
            <div class="face-label">Face Scan</div>
            <div class="face-num" style="color: {status_color};">{face_stress:.0f}<span style="font-size: 14px; color: var(--text-faint);">/100</span></div>
        </div>
        <div style="flex: 1;">
            <span class="face-status" style="color: {status_color}; background: {status_bg};">{status_text}</span>
            <div class="face-bar">
                <div class="face-bar-fill" style="width: {pct}%; background: {status_color};"></div>
            </div>
            <div class="face-meta" style="margin-top: 6px; font-style: italic;">Processed on-device. No biometric data transmitted.</div>
        </div>
    </div>
    """


def render_face_scan_placeholder() -> str:
    """Call-to-action placeholder for face scan before the user runs an analysis."""
    return f"""
    <div class="face-pill-placeholder">
        <div class="icon">📷</div>
        <div class="label">Capture a photo or use your webcam</div>
        <div class="sub">MediaPipe FaceMesh → 7 features → stress MLP · all on-device</div>
    </div>
    """


# ─── Debt timeline chart ─────────────────────────────────────────────────


def compute_debt_timeline(system_scores, now=None):
    """Compute how total body debt changes over the recovery window.

    Each system decays linearly from its current score to 0 over its
    recovery window. Returns list of dicts, each with total score, per-system
    breakdown, and the dominant system at that point.
    """
    if now is None:
        now = datetime.now()

    max_window = max((s for s in system_scores), default=None, key=lambda s: s.recovery_hrs)
    max_hrs = max_window.recovery_hrs if max_window else 10
    max_hrs = max(max_hrs, 8)
    max_hrs = min(max_hrs, 48)

    system_order = ["cardiovascular", "brain", "liver", "muscular", "gut"]

    points = []
    for h in range(0, int(max_hrs) + 2, 2):
        total = 0
        systems_at_h = []
        for sys_name in system_order:
            s = next((x for x in system_scores if x.system == sys_name), None)
            if s is None:
                continue
            if s.recovery_hrs > 0 and h <= s.recovery_hrs:
                remaining_frac = (s.recovery_hrs - h) / s.recovery_hrs
                sys_score = round(s.score * remaining_frac, 1)
            else:
                sys_score = 0.0
            total += sys_score
            accent = SYSTEM_ACCENTS.get(sys_name, ("var(--text-muted)",))[0]
            systems_at_h.append({
                "name": sys_name,
                "glyph": SYSTEM_GLYPHS.get(sys_name, "•"),
                "score": round(sys_score),
                "color": accent,
            })

        total = round(total)
        color, _, _ = debt_tier(total)
        label = "Now" if h == 0 else f"+{h}h"

        # Find dominant system (highest contributing)
        dominant = max(systems_at_h, key=lambda x: x["score"]) if systems_at_h else None

        points.append({
            "hour": h,
            "score": total,
            "color": color,
            "label": label,
            "systems": systems_at_h,
            "dominant": dominant["name"] if dominant and dominant["score"] > 0 else None,
            "dominant_glyph": dominant["glyph"] if dominant and dominant["score"] > 0 else "",
        })

    return points


def render_timeline(points: list[dict]) -> str:
    """Render the debt timeline as a horizontal bar chart with system breakdown.

    Each bar is a stacked segment showing each system's contribution in its
    accent color. The dominant system is labeled to the right of the bar.
    """
    if not points:
        return ""

    max_score = max(p["score"] for p in points) or 1

    rows = []
    for p in points:
        now_tag = '<span class="tl-now">· now</span>' if p["hour"] == 0 else ""

        # Build stacked bar segments — each system gets a proportional slice
        bar_pct = max(2.0, (p["score"] / max_score) * 100)
        segments = []
        if p["systems"] and p["score"] > 0:
            total_sys = sum(x["score"] for x in p["systems"])
            for sys in p["systems"]:
                if sys["score"] <= 0:
                    continue
                share = (sys["score"] / total_sys) * 100
                sys_label = {"cardiovascular":"Cardiovascular","brain":"Brain","liver":"Liver","muscular":"Muscular","gut":"Gut"}.get(sys["name"], sys["name"])
                segments.append(f'<span class="tl-seg" style="flex:{share:.1f};background:{sys["color"]}" title="{sys_label}: {sys["score"]} pts"></span>')
        else:
            segments = []

        seg_html = "".join(segments) if segments else f'<span class="tl-bar" style="width:100%;background:{p["color"]}"></span>'

        # Dominant system indicator
        dom_html = ""
        if p["dominant"] and p["dominant_glyph"]:
            dom_color = SYSTEM_ACCENTS.get(p["dominant"], ("var(--text-secondary)",))[0]
            dom_html = f'<span class="tl-dom" style="color:{dom_color};">{p["dominant_glyph"]}</span>'

        rows.append(f"""
        <div class="tl-row">
            <span class="tl-label">{p['label']}{now_tag}</span>
            <div class="tl-bar-wrap">
                <div class="tl-bar-stack" style="width:{bar_pct:.0f}%;">
                    {seg_html}
                </div>
            </div>
            <span class="tl-score" style="color: {p['color']};">{p['score']}</span>
            {dom_html}
        </div>
        """)

    # Build a legend showing system glyphs
    legend_items = []
    for sys_name in ["cardiovascular", "brain", "liver", "muscular", "gut"]:
        accent = SYSTEM_ACCENTS.get(sys_name, ("var(--text-muted)",))[0]
        glyph = SYSTEM_GLYPHS.get(sys_name, "•")
        label = {
            "cardiovascular": "Cardio",
            "brain": "Brain",
            "liver": "Liver",
            "muscular": "Muscle",
            "gut": "Gut",
        }.get(sys_name, sys_name)
        legend_items.append(f'<span class="tl-leg" style="color:{accent};"><span class="tl-leg-swatch" style="background:{accent};"></span>{glyph} {label}</span>')

    legend_html = f'<div class="tl-legend">{" ".join(legend_items)}</div>' if len(legend_items) > 0 else ""

    return f"""
    <div class="tl-wrap">
        <div class="section-label" style="margin-bottom: 10px;">Recovery forecast</div>
        {legend_html}
        {"".join(rows)}
    </div>
    """


def render_plan(plan: dict | None, lines_so_far: list[str] | None = None) -> str:
    """Triage plan: 3 lines from SmolLM2's structured plan step.

    `lines_so_far` lets the UI show the plan being formed (one line at a
    time) as the LLM streams. Falls back to `plan` dict for the final
    render.
    """
    if lines_so_far is None:
        lines_so_far = []
        if plan:
            if plan.get("priority"):
                lines_so_far.append(f"PRIORITY: {plan['priority']}")
            if plan.get("secondary"):
                lines_so_far.append(f"SECONDARY: {plan['secondary']}")
            if plan.get("avoid"):
                lines_so_far.append(f"AVOID: {plan['avoid']}")

    if not lines_so_far and not plan:
        return ""

    rendered_lines = []
    for line in lines_so_far:
        up = line.upper().strip()
        if up.startswith("PRIORITY:"):
            color = "#DC2626"
            label = "PRIORITY"
        elif up.startswith("SECONDARY:"):
            color = "#EA580C"
            label = "SECONDARY"
        elif up.startswith("AVOID:"):
            color = "#A78BFA"
            label = "AVOID"
        else:
            color = "var(--text-muted)"
            label = ""
        rest = line.split(":", 1)[1].strip() if ":" in line else line
        rendered_lines.append(f"""
        <div class="plan-line">
            <span class="plan-tag" style="color: {color}; border-color: {color}40; background: {color}10;">{label}</span>
            <span class="plan-text">{html.escape(rest)}</span>
        </div>
        """)

    return f"""
    <div class="plan-block">
        <div class="section-label">Triage plan <span class="plan-source">SmolLM2-360M</span></div>
        {''.join(rendered_lines)}
    </div>
    """


def render_counterfactual(cf: dict | None) -> str:
    if not cf:
        return ""
    accent = SYSTEM_ACCENTS.get(cf["system"], ("var(--text-secondary)",))[0]
    return f"""
    <div class="cf-block" style="border-left-color: {accent};">
        <span class="cf-label" style="color: {accent};">WHAT WOULD CHANGE THIS</span>
        <span class="cf-body">
            If you had <strong style="color: var(--text-primary);">{html.escape(cf['lever_label'])}</strong>,
            <strong style="color: {accent};">{html.escape(cf['system_label'])}</strong> debt would drop
            from <strong style="color: var(--text-primary);">{cf['from_score']}</strong> to
            <strong style="color: var(--recovery-green);">{cf['to_score']}</strong>.
        </span>
    </div>
    """


def render_agent_trace(steps: list[tuple[str, str, str]]) -> str:
    """steps: list of (label, status, message) where status is pending|active|done|error."""
    if steps:
        items = []
        for label, status, message in steps:
            items.append(f"""
            <div class="trace-step is-{status}">
                <span class="trace-dot"></span>
                <span style="flex: 1;">{html.escape(label)}</span>
                <span style="color: var(--text-faint); font-size: 10px;">{html.escape(message)}</span>
            </div>
            """)
        body = "".join(items)
    else:
        body = f"""
        <div class="trace-step">
            <span class="trace-dot" style="background: var(--text-faint);"></span>
            <span style="flex: 1; color: var(--text-faint);">parse_stressors</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: var(--text-faint);"></span>
            <span style="flex: 1; color: var(--text-faint);">compute_live_score</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: var(--text-faint);"></span>
            <span style="flex: 1; color: var(--text-faint);">face_scan</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: var(--text-faint);"></span>
            <span style="flex: 1; color: var(--text-faint);">llm_coach</span>
        </div>
        <div class="trace-step" style="margin-top: 8px;">
            <span class="ready-pulse"></span>
            <span style="color: var(--text-muted); font-size: 10px;">Awaiting analysis</span>
        </div>
        """

    return f"""
    <div>
        <div class="section-label">Agent trace</div>
        {body}
    </div>
    """


def render_empty_state() -> str:
    return f"""
    <div class="empty-state">
        <div class="icon">🫀</div>
        <div class="label">Your debt will appear here</div>
        <div class="sub">Log your stressors on the left. Tap calculate.</div>
    </div>
    """


# ─── Running estimate (live debt pill) ───────────────────────────────────────


def compute_running_estimate(
    alcohol, alcohol_type, alcohol_count,
    training, training_area, training_intensity,
    sleep, sleep_hours,
    stress, stress_carried,
    ill, ill_severity,
    care,
    bed_time, wake_time,
) -> str:
    """Return a small HTML pill showing the current running debt score."""
    stressors = build_stressors(
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours, stress, stress_carried,
        ill, ill_severity, care,
    )
    score = compute_live_score(stressors)
    color, _, _ = debt_tier(score)
    return f'<span class="debt-pill" style="color: {color};">Running debt · <strong>{score}</strong>/100</span>'


# ─── Preset scenario fillers ─────────────────────────────────────────────────


def _fill_preset(
    a, a_t, a_c, a_v,
    t, t_a, t_i, t_v,
    s, s_h, s_v,
    st, st_c, st_v,
    i, i_s, i_v,
    c,
    bt, wt,
):
    """Return (20-element) tuple matching the preset outputs list below."""
    return (a, a_t, a_c, gr.Group(visible=a_v),
            t, t_a, t_i, gr.Group(visible=t_v),
            s, s_h, gr.Group(visible=s_v),
            st, st_c, gr.Group(visible=st_v),
            i, i_s, gr.Group(visible=i_v),
            c, bt, wt)


def fill_bad_night():
    """Drank red wine 3-4, trained legs hard, slept 4-6."""
    return _fill_preset(
        True, "red_wine", "3-4", True,
        True, "legs", "hard", True,
        True, "4-6", True,
        False, "yes", False,
        False, "moderate", False,
        False,
        "2:00 AM", "8:00 AM",
    )


def fill_recovery_day():
    """Beer 1-2, slept 6-7, took care of myself."""
    return _fill_preset(
        True, "beer", "1-2", True,
        False, "full_body", "hard", False,
        True, "6-7", True,
        False, "yes", False,
        False, "moderate", False,
        True,
        "10:00 PM", "6:30 AM",
    )


def fill_hit_it_hard():
    """No alcohol, trained destroyed, slept okay, took care."""
    return _fill_preset(
        False, "red_wine", "3-4", False,
        True, "legs", "destroyed", True,
        True, "6-7", True,
        False, "yes", False,
        False, "moderate", False,
        True,
        "10:30 PM", "6:00 AM",
    )


def fill_sick():
    """Slept terribly, high stress, floored by illness."""
    return _fill_preset(
        False, "red_wine", "3-4", False,
        False, "full_body", "hard", False,
        True, "under_4", True,
        True, "yes", True,
        True, "floored", True,
        False,
        "11:00 PM", "7:00 AM",
    )


def clear_all_form():
    """Reset all form inputs to defaults."""
    return _fill_preset(
        False, "red_wine", "3-4", False,
        False, "full_body", "hard", False,
        False, "4-6", False,
        False, "yes", False,
        False, "moderate", False,
        False,
        "", "",
    )


# ─── Sample preview builder ──────────────────────────────────────────────────


def render_sample_preview():
    """Pre-render a sample analysis so the right column has content on first load."""
    sample_stressors = build_stressors(
        True, "red_wine", "3-4",
        True, "legs", "hard",
        True, "4-6",
        False, "yes",
        False, "moderate",
        False,
    )
    sample_now = datetime.now()
    sample_score = compute_live_score(sample_stressors)
    sample_system_scores = compute_system_scores(
        sample_stressors,
        now=sample_now,
        bed_time="2:00 AM",
        wake_time="8:00 AM",
    )

    _, sample_verdict, _ = debt_tier(sample_score)
    hero_html = render_hero(sample_score, sample_verdict, is_sample=True)
    meters_html = render_system_meters(sample_system_scores)
    rx_html = render_prescription(sample_system_scores, sample_score)
    science_html = render_science(sample_system_scores)

    system_dicts = [
        {"label": s.label, "score": s.score, "cleared_at": s.cleared_at}
        for s in sample_system_scores
    ]
    fallback_plan = _fallback_plan(system_dicts)
    plan_html = render_plan(fallback_plan)

    cf = compute_counterfactual(sample_stressors, sample_system_scores, "2:00 AM", "8:00 AM")
    cf_html = render_counterfactual(cf)

    sample_trace = [
        ("parse_stressors", "done", "3 stressors"),
        ("compute_live_score", "done", f"score={sample_score}/100"),
        ("triage_plan", "done", "PRIORITY · SECONDARY · AVOID"),
        ("llm_coach", "done", "sample"),
    ]
    trace_html = render_agent_trace(sample_trace)

    face_html = render_face_scan_placeholder()
    timeline_html = render_timeline(compute_debt_timeline(sample_system_scores, now=sample_now))
    return hero_html, plan_html, meters_html, face_html, timeline_html, rx_html + science_html, trace_html, cf_html, _sample_coach()


def _sample_coach() -> str:
    return f"""
    <div class="coach-block">
        <div class="coach-header">
            <span>AI Recovery Coach</span>
            <span class="coach-pill">SmolLM2-360M · local</span>
        </div>
        <div class="coach-body" style="color: var(--text-faint);">
            <span class="ready-pulse"></span>
            Sample advice shown. Tap <strong style="color: var(--text-secondary);">Calculate Body Debt</strong> for your own.
        </div>
    </div>
    """


# ─── Main analysis pipeline (yields streaming trace updates) ─────────────────


def build_stressors(
    alcohol, alcohol_type, alcohol_count,
    training, training_area, training_intensity,
    sleep, sleep_hours,
    stress, stress_carried,
    ill, ill_severity,
    care,
):
    stressors = []
    if alcohol:
        stressors.append(Stressor(type="alcohol", alcohol_type=alcohol_type, alcohol_count=alcohol_count))
    if training:
        stressors.append(Stressor(type="training", training_area=training_area, training_intensity=training_intensity))
    if sleep:
        stressors.append(Stressor(type="sleep", sleep_hours=sleep_hours))
    if stress:
        stressors.append(Stressor(type="stress", stress_carried=stress_carried))
    if ill:
        stressors.append(Stressor(type="ill", ill_severity=ill_severity))
    if care:
        stressors.append(Stressor(type="care"))
    return stressors


def run_analysis_stream(
    alcohol, alcohol_type, alcohol_count,
    training, training_area, training_intensity,
    sleep, sleep_hours,
    stress, stress_carried,
    ill, ill_severity,
    care,
    bed_time, wake_time,
    face_image,
    progress=gr.Progress(),
):
    """Streaming generator. Yield tuple:

        (hero, meters, rx, face, timeline, plan, trace, counterfactual, coach)
    """
    stressors = build_stressors(
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours, stress, stress_carried,
        ill, ill_severity, care,
    )

    EMPTY = render_empty_state()
    NUL = ""
    E_C = _empty_coach()
    E_P = ""
    E_T = render_agent_trace([])
    E_CF = ""

    # Step 1: parse stressors
    trace = [("parse_stressors", "active", f"{len(stressors)} selected")]
    yield (EMPTY, EMPTY, NUL, NUL, "", E_P, E_T, E_CF, E_C)
    time.sleep(0.05)

    if not stressors:
        trace[-1] = ("parse_stressors", "error", "none selected")
        msg = (
            f'<div class="empty-state"><div class="icon">🫀</div>'
            f'<div class="label">Log at least one stressor</div>'
            f'<div class="sub">Tap a checkbox on the left to begin.</div></div>'
        )
        yield (msg, NUL, NUL, NUL, "", E_P, render_agent_trace(trace), E_CF, E_C)
        return

    trace[-1] = ("parse_stressors", "done", f"{len(stressors)} stressors")
    progress(0.1, desc="Computing debt score...")

    # Step 2: compute scores
    trace.append(("compute_live_score", "active", "deterministic engine"))
    yield (NUL, NUL, NUL, NUL, "", E_P, render_agent_trace(trace), E_CF, E_C)
    time.sleep(0.05)

    live_score = compute_live_score(stressors)
    system_scores = compute_system_scores(
        stressors,
        now=datetime.now(),
        bed_time=bed_time or None,
        wake_time=wake_time or None,
    )
    trace[-1] = ("compute_live_score", "done", f"score={live_score}/100")
    progress(0.3, desc="Mapping 5 systems...")

    # Compute timeline once system scores are available
    timeline_html = render_timeline(compute_debt_timeline(system_scores))

    # Step 3: face scan
    face_html = ""
    face_stress = None
    if face_image is not None:
        trace.append(("face_scan", "active", "MediaPipe FaceMesh"))
        yield (NUL, NUL, NUL, NUL, timeline_html, E_P, render_agent_trace(trace), E_CF, E_C)
        time.sleep(0.05)

        features = run_face_scan(face_image)
        if features:
            arr = features_to_array(features)
            face_stress, is_healthy = predict_stress_score(arr)
            face_html = render_face_scan(face_stress, is_healthy, features)
            trace[-1] = ("face_scan", "done", f"stress={face_stress:.0f}/100")
        else:
            trace[-1] = ("face_scan", "error", "no face detected")
    else:
        trace.append(("face_scan", "done", "skipped"))

    # Step 3.5: triage plan (the real "agent" step)
    system_dicts = [
        {"label": s.label, "score": s.score, "cleared_at": s.cleared_at}
        for s in system_scores
    ]
    trace.append(("triage_plan", "active", "SmolLM2-360M"))
    plan_html = render_plan(None, [])
    yield (NUL, NUL, NUL, NUL, timeline_html, plan_html, render_agent_trace(trace), E_CF, E_C)

    plan_dict: dict = {"priority": None, "secondary": None, "avoid": None}
    plan_lines: list[str] = []
    try:
        for plan_dict, line in stream_plan(system_dicts):
            if line:
                plan_lines.append(line)
                plan_html = render_plan(None, list(plan_lines))
                yield (NUL, NUL, NUL, NUL, timeline_html, plan_html, render_agent_trace(trace), E_CF, E_C)
    except Exception as e:
        print(f"Plan stream failed: {e}")
    plan_html = render_plan(plan_dict, plan_lines)
    trace[-1] = ("triage_plan", "done", "PRIORITY · SECONDARY · AVOID")

    progress(0.5, desc="Building system breakdown...")

    # Step 4: render hero + systems + prescription
    _, verdict, _ = debt_tier(live_score)
    hero_html = render_hero(live_score, verdict)
    meters_html = render_system_meters(system_scores)
    rx_html = render_prescription(system_scores, live_score)
    science_html = render_science(system_scores)
    cf = compute_counterfactual(stressors, system_scores, bed_time, wake_time)
    cf_html = render_counterfactual(cf)

    # Step 5: streaming LLM advice
    trace.append(("llm_coach", "active", "SmolLM2-360M local"))
    accumulated = ""
    stressor_summary = ", ".join(
        f"{STRESSOR_DEFS[s.type]['icon']} {STRESSOR_DEFS[s.type]['label']}" for s in stressors
    )

    yield (
        hero_html, meters_html, rx_html + science_html, face_html, timeline_html,
        plan_html, render_agent_trace(trace), cf_html, _coach_with_cursor(""),
    )

    try:
        for piece in stream_advice(live_score, system_dicts, stressor_summary, face_stress):
            accumulated += piece
            yield (
                hero_html, meters_html, rx_html + science_html, face_html, timeline_html,
                plan_html, render_agent_trace(trace), cf_html,
                _coach_with_cursor(accumulated),
            )
    except Exception as e:
        print(f"Stream fallback: {e}")
        accumulated = _fallback_advice(live_score, system_dicts, stressor_summary)
        yield (
            hero_html, meters_html, rx_html + science_html, face_html, timeline_html,
            plan_html, render_agent_trace(trace), cf_html,
            _coach_with_cursor(accumulated),
        )

    trace[-1] = ("llm_coach", "done", f"{len(accumulated)} chars")
    progress(1.0, desc="Done")
    yield (
        hero_html, meters_html, rx_html + science_html, face_html, timeline_html,
        plan_html, render_agent_trace(trace), cf_html,
        _coach_with_cursor(accumulated),
    )


def _empty_coach() -> str:
    return f"""
    <div class="coach-block">
        <div class="coach-header">
            <span>AI Recovery Coach</span>
            <span class="coach-pill">SmolLM2-360M · local</span>
        </div>
        <div class="coach-body" style="color: var(--text-faint);">
            <span class="ready-pulse"></span>Ready. Tap <strong style="color: var(--text-secondary);">Calculate Body Debt</strong> to stream advice.
        </div>
    </div>
    """


def _coach_with_cursor(text: str) -> str:
    safe = html.escape(text)
    return f"""
    <div class="coach-block">
        <div class="coach-header"><span>AI Recovery Coach</span><span class="coach-pill">SmolLM2-360M · local</span></div>
        <div class="coach-body">{safe}<span class="coach-cursor"></span></div>
    </div>
    """


# ─── Compare scenarios ───────────────────────────────────────────────────


def _build_compare_label(stressors: list) -> str:
    """Build a short label from stressor icons."""
    if not stressors:
        return "Clear day"
    icons = [STRESSOR_DEFS[s.type]["icon"] for s in stressors]
    return " ".join(icons)


def render_comparison_html(comparisons: list) -> str:
    """Render the horizontal comparison carousel as HTML."""
    if not comparisons:
        return ''

    cards = []
    for i, c in enumerate(comparisons):
        color, verdict, _ = debt_tier(c["score"])
        systems_html = ""
        for sys in c["system_scores"]:
            accent = SYSTEM_ACCENTS.get(sys["system"], ("var(--text-secondary)",))[0]
            pct = max(0, min(100, sys["score"]))
            systems_html += f"""
            <div class="cmp-sys">
                <span class="cmp-sys-glyph" style="color: {accent};">{sys['glyph']}</span>
                <div class="cmp-sys-bar"><div class="cmp-sys-fill" style="width:{pct}%;background:{accent}"></div></div>
            </div>"""
        cards.append(f"""
        <div class="cmp-card">
            <button class="cmp-del" onclick="removeCompare({i})" aria-label="Remove">×</button>
            <div class="cmp-hero" style="color: {color};">{c['score']}</div>
            <div class="cmp-label">{html.escape(c['label'])}</div>
            <div class="cmp-time">{html.escape(c['timestamp'])}</div>
            {systems_html}
        </div>
        """)
    return f'<div class="cmp-row">{"".join(cards)}</div>'


def save_compare(
    comparisons,  # list from gr.State
    alcohol, alcohol_type, alcohol_count,
    training, training_area, training_intensity,
    sleep, sleep_hours,
    stress, stress_carried,
    ill, ill_severity,
    care,
    bed_time, wake_time,
):
    """Recompute from current form inputs, append to comparisons, return updated state + HTML."""
    stressors = build_stressors(
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours, stress, stress_carried,
        ill, ill_severity, care,
    )
    score = compute_live_score(stressors)
    system_scores = compute_system_scores(
        stressors,
        now=datetime.now(),
        bed_time=bed_time or None,
        wake_time=wake_time or None,
    )

    label = _build_compare_label(stressors)
    now_str = datetime.now().strftime("%I:%M %p").lstrip("0")

    entry = {
        "score": score,
        "label": label,
        "timestamp": now_str,
        "system_scores": [
            {
                "system": s.system,
                "glyph": SYSTEM_GLYPHS.get(s.system, "•"),
                "score": s.score,
            }
            for s in system_scores
        ],
    }

    new_list = list(comparisons or [])
    new_list.append(entry)
    return new_list, render_comparison_html(new_list)


def remove_compare(comparisons, idx: int):
    """Remove a comparison by index. Returns -1 sentinel to reset the trigger."""
    new_list = list(comparisons or [])
    if 0 <= idx < len(new_list):
        del new_list[idx]
    return new_list, render_comparison_html(new_list), -1


def clear_comparisons():
    """Clear all comparisons."""
    return [], ""


# ─── Pre-compute sample preview ─────────────────────────────────────────────

SAMPLE_HERO, SAMPLE_PLAN, SAMPLE_METERS, SAMPLE_FACE, SAMPLE_TIMELINE, SAMPLE_RX, SAMPLE_TRACE, SAMPLE_CF, SAMPLE_COACH = render_sample_preview()

# ─── Layout ──────────────────────────────────────────────────────────────────

with gr.Blocks(title="Body Debt") as demo:
    gr.HTML(THEME_TOGGLE_HTML)
    gr.HTML(f"""
    <div class="app-header">
        <h1 class="app-title">🫀 Body Debt</h1>
        <p class="app-subtitle">Quantify your physiological debt. Get a precise, system-level recovery plan. On-device AI. Zero cloud calls.</p>
        <div class="attr-row">
            <span class="attr-pill"><span class="dot"></span>SmolLM2-360M · local</span>
            <a class="attr-pill" href="https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct">360M params · 250MB RAM</a>
            <a class="attr-pill" href="https://github.com/udirobert/bodydebt">Built with OpenAI Codex</a>
        </div>
    </div>
    """)

    with gr.Row():
        with gr.Column(scale=1):
            # Preset scenario chips
            gr.HTML('<div class="section-label">Try a scenario</div>')
            with gr.Row():
                preset_bad_night = gr.Button("🌙 Bad night", elem_classes="preset-chip", size="sm")
                preset_recovery = gr.Button("♻️ Recovery day", elem_classes="preset-chip", size="sm")
            with gr.Row():
                preset_hit_hard = gr.Button("🔥 Hit it hard", elem_classes="preset-chip", size="sm")
                preset_sick = gr.Button("🤒 Sick", elem_classes="preset-chip", size="sm")

            gr.HTML('<div class="section-label" style="margin-top: 4px;">What happened</div>')

            # Running debt pill
            debt_pill = gr.HTML(value='<span class="debt-pill" style="color: var(--text-muted);">Running debt · <strong>0</strong>/100</span>')

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

            care = gr.Checkbox(label="✦ Took care of myself", value=False, elem_id="care-checkbox")

            gr.HTML('<div class="section-label" style="margin-top: 20px;">Timing</div>')
            bed_time = gr.Dropdown(
                choices=TIME_OPTIONS,
                value="",
                label="Bedtime",
                allow_custom_value=True,
                placeholder="Select or type (e.g. 2:00 AM)",
            )
            wake_time = gr.Dropdown(
                choices=TIME_OPTIONS,
                value="",
                label="Wake time",
                allow_custom_value=True,
                placeholder="Select or type (e.g. 8:30 AM)",
            )

            gr.HTML('<div class="section-label" style="margin-top: 20px;">Face scan <span style="font-weight: 400; text-transform: none; letter-spacing: normal; color: var(--text-muted);">(optional)</span></div>')
            face_image = gr.Image(
                label="Capture or upload",
                sources=["webcam", "upload"],
                type="numpy",
            )

            with gr.Row():
                clear_btn = gr.Button("Clear all", elem_classes="clear-all", size="sm")
                analyze_btn = gr.Button("Calculate Body Debt", variant="primary", size="lg")
            with gr.Row():
                save_compare_btn = gr.Button("📋 Save to compare", elem_classes="save-compare", size="sm")
                clear_compare_btn = gr.Button("✕ Clear saved", elem_classes="save-compare", size="sm")

        with gr.Column(scale=2):
            hero_output = gr.HTML(value=SAMPLE_HERO)
            plan_output = gr.HTML(value=SAMPLE_PLAN)
            meters_output = gr.HTML(value=SAMPLE_METERS)
            face_output = gr.HTML(value=SAMPLE_FACE)
            timeline_output = gr.HTML(value=SAMPLE_TIMELINE)
            with gr.Row():
                with gr.Column(scale=3):
                    rx_output = gr.HTML(value=SAMPLE_RX)
                with gr.Column(scale=2):
                    trace_output = gr.HTML(value=SAMPLE_TRACE)
            counterfactual_output = gr.HTML(value=SAMPLE_CF)
            coach_output = gr.HTML(value=SAMPLE_COACH)
            gr.HTML('<div class="section-label cmp-section">Saved comparisons</div>')
            compare_output = gr.HTML(value="", visible=True)
            remove_idx = gr.Number(value=-1, visible=False, elem_id="cmp-remove-idx")

    comparisons_state = gr.State([])

    ANALYSIS_INPUTS = [
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours,
        stress, stress_carried,
        ill, ill_severity,
        care,
        bed_time, wake_time,
        face_image,
    ]

    ANALYSIS_OUTPUTS = [
        hero_output, meters_output, rx_output, face_output, timeline_output,
        plan_output, trace_output, counterfactual_output, coach_output,
    ]

    # ─── Event wiring ────────────────────────────────────────────────────────

    # Toggle detail sections
    alcohol.change(lambda v: gr.Group(visible=v), alcohol, alcohol_details)
    training.change(lambda v: gr.Group(visible=v), training, training_details)
    sleep.change(lambda v: gr.Group(visible=v), sleep, sleep_details)
    stress.change(lambda v: gr.Group(visible=v), stress, stress_details)
    ill.change(lambda v: gr.Group(visible=v), ill, ill_details)

    # Live running debt pill — update on any form input change
    debt_inputs = [
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours,
        stress, stress_carried,
        ill, ill_severity,
        care,
        bed_time, wake_time,
    ]
    for inp in debt_inputs:
        inp.change(
            fn=compute_running_estimate,
            inputs=debt_inputs,
            outputs=debt_pill,
        )

    # Preset scenario buttons: fill form then auto-run analysis
    _PRESET_FILL_OUTPUTS = [
        alcohol, alcohol_type, alcohol_count, alcohol_details,
        training, training_area, training_intensity, training_details,
        sleep, sleep_hours, sleep_details,
        stress, stress_carried, stress_details,
        ill, ill_severity, ill_details,
        care,
        bed_time, wake_time,
    ]

    for preset_btn, fill_fn in [
        (preset_bad_night, fill_bad_night),
        (preset_recovery, fill_recovery_day),
        (preset_hit_hard, fill_hit_it_hard),
        (preset_sick, fill_sick),
    ]:
        preset_btn.click(
            fn=fill_fn,
            outputs=_PRESET_FILL_OUTPUTS,
        ).then(
            fn=run_analysis_stream,
            inputs=ANALYSIS_INPUTS,
            outputs=ANALYSIS_OUTPUTS,
        )

    # Clear all button
    clear_btn.click(
        fn=clear_all_form,
        outputs=_PRESET_FILL_OUTPUTS,
    )

    # Main Calculate button
    analyze_btn.click(
        fn=run_analysis_stream,
        inputs=ANALYSIS_INPUTS,
        outputs=ANALYSIS_OUTPUTS,
    )

    # Save to compare
    COMPARE_INPUTS = [
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours,
        stress, stress_carried,
        ill, ill_severity,
        care,
        bed_time, wake_time,
    ]

    save_compare_btn.click(
        fn=save_compare,
        inputs=[comparisons_state] + COMPARE_INPUTS,
        outputs=[comparisons_state, compare_output],
    )

    # Remove comparison by index
    remove_idx.change(
        fn=remove_compare,
        inputs=[comparisons_state, remove_idx],
        outputs=[comparisons_state, compare_output, remove_idx],
    )

    # Clear all comparisons
    clear_compare_btn.click(
        fn=clear_comparisons,
        outputs=[comparisons_state, compare_output],
    )

    gr.HTML(f"""
    <div class="app-footer">
        Body Debt uses <a href="https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct">SmolLM2-360M-Instruct</a> (360M parameters) running locally via HuggingFace Transformers.<br>
        Face analysis uses <a href="https://google.github.io/mediapipe/solutions/face_mesh">MediaPipe FaceMesh</a>. No biometric data leaves your device.<br>
        Built with <a href="https://openai.com/index/openai-codex/">OpenAI Codex</a>. Source: <a href="https://github.com/udirobert/bodydebt">github.com/udirobert/bodydebt</a>.<br>
        Submitted to the <a href="https://huggingface.co/spaces/build-small-hackathon/body-debt">Build Small Hackathon</a>.
    </div>
    """)


if __name__ == "__main__":
    demo.launch(css=CUSTOM_CSS)
