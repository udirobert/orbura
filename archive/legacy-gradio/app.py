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
from health_coach import stream_advice, stream_plan, _fallback_advice

# ─── Design tokens (mirrors src/lib/design-tokens.ts) ────────────────────────

BG_BASE     = "#0A0A0B"
BG_SURFACE  = "#141416"
BG_ELEVATED = "#1C1C1F"
BORDER      = "rgba(168, 162, 158, 0.10)"
BORDER_SOFT = "rgba(168, 162, 158, 0.06)"

TEXT_PRIMARY   = "#F5F5F4"
TEXT_SECONDARY = "#A8A29E"
TEXT_MUTED     = "#524F4C"
TEXT_FAINT     = "#3a3835"

BRAND_PRIMARY   = "#EA580C"
BRAND_SECONDARY = "#F59E0B"
RECOVERY_GREEN  = "#4ADE80"

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
    --text-primary: {TEXT_PRIMARY};
    --text-secondary: {TEXT_SECONDARY};
    --text-muted: {TEXT_MUTED};
    --brand: {BRAND_PRIMARY};
}}

html, body, .gradio-container {{
    background: {BG_BASE} !important;
    color: {TEXT_PRIMARY} !important;
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
    color: {TEXT_SECONDARY};
    margin-bottom: 8px;
    animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s backwards;
}}

.debt-verdict {{
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: {TEXT_SECONDARY};
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
    color: {TEXT_MUTED};
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 10px;
}}

.section-label::after {{
    content: '';
    flex: 1;
    height: 1px;
    background: {BORDER_SOFT};
}}

/* System meter */
.sys-meter {{
    padding: 10px 14px;
    background: {BG_SURFACE};
    border: 1px solid {BORDER};
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
.sys-label {{ font-size: 13px; font-weight: 600; color: {TEXT_PRIMARY}; }}
.sys-time {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; color: {TEXT_MUTED}; }}
.sys-bar {{ margin-top: 8px; height: 3px; background: rgba(168, 162, 158, 0.10); border-radius: 2px; overflow: hidden; }}
.sys-bar-fill {{ height: 100%; border-radius: 2px; transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1); }}
.sys-cause {{ font-size: 11px; color: {TEXT_MUTED}; margin-top: 6px; line-height: 1.4; }}

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
.proto-conn {{ flex: 1; width: 1px; background: {BORDER}; min-height: 18px; margin-top: 4px; }}
.proto-window {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
    margin-bottom: 4px;
}}
.proto-action {{
    font-size: 13px; color: {TEXT_PRIMARY}; line-height: 1.55;
    font-weight: 500;
}}

/* Science cards */
.sci-card {{
    padding: 12px 14px;
    background: {BG_ELEVATED};
    border-left: 2px solid currentColor;
    border-radius: 0 8px 8px 0;
    margin-bottom: 8px;
}}
.sci-fact {{ font-size: 12px; color: {TEXT_SECONDARY}; line-height: 1.55; margin: 0 0 4px; }}
.sci-cite {{ font-size: 10px; color: {TEXT_FAINT}; font-style: italic; margin: 0; font-family: 'JetBrains Mono', monospace; }}

/* Face scan pill */
.face-pill {{
    padding: 14px 16px;
    background: {BG_SURFACE};
    border: 1px solid {BORDER};
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}}
.face-num {{ font-family: 'DM Serif Display', serif; font-size: 36px; line-height: 1; }}
.face-label {{ font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: {TEXT_MUTED}; }}
.face-status {{ font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; }}
.face-meta {{ font-family: 'JetBrains Mono', monospace; font-size: 9px; color: {TEXT_FAINT}; margin-top: 4px; }}

/* Agent trace */
.trace-step {{
    display: flex; align-items: center; gap: 10px;
    padding: 6px 10px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: {TEXT_SECONDARY};
    margin-bottom: 4px;
}}
.trace-step.is-active {{ color: {BRAND_PRIMARY}; background: rgba(234, 88, 12, 0.06); }}
.trace-step.is-done   {{ color: {RECOVERY_GREEN}; }}
.trace-dot {{ width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }}
.trace-step.is-active .trace-dot {{ animation: pulse 1.2s ease-in-out infinite; }}
@keyframes pulse {{ 0%,100% {{ opacity: 1; }} 50% {{ opacity: 0.3; }} }}

/* AI coach block */
.coach-block {{
    padding: 20px 22px;
    background: linear-gradient(180deg, {BG_SURFACE}, {BG_BASE});
    border: 1px solid {BORDER};
    border-radius: 14px;
    margin-top: 8px;
}}
.coach-header {{
    display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    color: {BRAND_PRIMARY};
}}
.coach-pill {{
    background: {BG_ELEVATED};
    color: {TEXT_MUTED};
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9px;
}}
.coach-body {{
    font-size: 14px;
    color: {TEXT_PRIMARY};
    line-height: 1.7;
    white-space: pre-wrap;
    min-height: 60px;
}}
.coach-cursor {{
    display: inline-block;
    width: 7px; height: 14px;
    background: {BRAND_PRIMARY};
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s steps(2, start) infinite;
}}
@keyframes blink {{ to {{ visibility: hidden; }} }}

/* Buttons */
button.primary, .gr-button-primary {{
    background: {BRAND_PRIMARY} !important;
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
    background: {BG_SURFACE} !important;
    border: 1px solid {BORDER} !important;
    color: {TEXT_PRIMARY} !important;
    border-radius: 8px !important;
}}
input:focus, textarea:focus {{ border-color: {BRAND_PRIMARY} !important; outline: none !important; }}

/* Checkbox */
.gr-checkbox {{ background: transparent !important; }}
.gr-checkbox input[type="checkbox"] {{
    appearance: none;
    width: 18px; height: 18px;
    border: 1.5px solid {TEXT_MUTED};
    border-radius: 4px;
    background: {BG_SURFACE};
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
}}
.gr-checkbox input[type="checkbox"]:checked {{
    background: {BRAND_PRIMARY};
    border-color: {BRAND_PRIMARY};
}}
.gr-checkbox input[type="checkbox"]:checked::after {{
    content: '✓';
    color: white;
    position: absolute;
    top: -2px; left: 3px;
    font-size: 14px; font-weight: 800;
}}
.gr-checkbox label {{ color: {TEXT_PRIMARY} !important; font-weight: 500 !important; }}

/* Image upload area */
.gr-image, .gr-image-upload {{
    background: {BG_SURFACE} !important;
    border: 1px dashed {BORDER} !important;
    border-radius: 10px !important;
}}

/* Empty state */
.empty-state {{
    text-align: center;
    padding: 80px 20px;
    color: {TEXT_FAINT};
}}
.empty-state .icon {{ font-size: 48px; opacity: 0.3; margin-bottom: 12px; }}
.empty-state .label {{ font-size: 14px; font-weight: 500; color: {TEXT_MUTED}; }}
.empty-state .sub {{ font-size: 12px; color: {TEXT_FAINT}; margin-top: 4px; }}

/* Hide group labels for cleaner look */
.gr-group {{ background: transparent !important; border: none !important; }}
.gr-form {{ background: transparent !important; }}

/* App header */
.app-header {{ text-align: center; padding: 36px 0 28px; border-bottom: 1px solid {BORDER_SOFT}; margin-bottom: 28px; }}
.app-title {{
    font-family: 'Inter', sans-serif;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 12px;
    color: {TEXT_PRIMARY};
    margin: 0 0 6px;
}}
.app-subtitle {{
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: {TEXT_MUTED};
    margin: 0;
    max-width: 480px;
    margin: 0 auto;
}}

/* Footer */
.app-footer {{
    text-align: center;
    padding: 28px 16px 16px;
    margin-top: 36px;
    border-top: 1px solid {BORDER_SOFT};
    font-size: 10px;
    color: {TEXT_FAINT};
    font-family: 'JetBrains Mono', monospace;
}}
.app-footer a {{ color: {BRAND_PRIMARY}; text-decoration: none; }}

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
    border: 1px solid {BORDER};
    border-radius: 999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 600;
    color: {TEXT_SECONDARY};
    background: {BG_SURFACE};
    text-decoration: none;
    transition: border-color 0.15s, color 0.15s;
}}
.attr-pill:hover {{
    border-color: {BRAND_PRIMARY};
    color: {TEXT_PRIMARY};
}}
.attr-pill .dot {{
    width: 6px; height: 6px;
    border-radius: 50%;
    background: {RECOVERY_GREEN};
    box-shadow: 0 0 8px {RECOVERY_GREEN};
}}

/* Ready pulse for empty coach/trace */
.ready-pulse {{
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: {BRAND_PRIMARY};
    margin-right: 8px;
    animation: pulse 1.6s ease-in-out infinite;
}}

/* Mobile / narrow viewport */
@media (max-width: 900px) {{
    .gradio-container {{ padding: 0 16px 40px !important; }}
    .app-header {{ padding: 24px 0 20px; margin-bottom: 18px; }}
    .debt-hero {{ font-size: clamp(5.5rem, 28vw, 8rem); }}
    .orb-wrap {{ padding: 28px 20px 22px; }}
}}
@media (max-width: 720px) {{
    .gradio-container {{ padding: 0 12px 32px !important; }}
    /* Stack the right column on small screens */
    .gradio-row > div {{ flex-wrap: wrap !important; }}
}}
"""

# ─── HTML renderers ──────────────────────────────────────────────────────────


def render_hero(score: int, verdict: str) -> str:
    color, _, _ = debt_tier(score)
    return f"""
    <div class="orb-wrap" style="color: {color};">
        <div class="debt-hero-label">Body Debt Score</div>
        <div class="debt-hero" style="color: {color};">{score}</div>
        <div class="debt-verdict" style="color: {TEXT_PRIMARY};">{html.escape(verdict)}</div>
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
            s.system, (TEXT_SECONDARY, BORDER_SOFT, TEXT_MUTED)
        )
        is_primary = s.system == primary_system
        glyph = SYSTEM_GLYPHS.get(s.system, "•")
        bar_color = accent_active if is_primary else accent_muted
        label_color = TEXT_PRIMARY if is_primary else TEXT_SECONDARY
        pct = max(0, min(100, s.score))
        glyph_bg = accent_soft if is_primary else "rgba(168, 162, 158, 0.06)"

        rows.append(f"""
        <div class="sys-meter {'is-primary' if is_primary else ''}" style="border-color: {accent_soft if is_primary else BORDER};">
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
            <div class="coach-body" style="color: {RECOVERY_GREEN};">All five systems below threshold. Maintain the streak.</div>
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
            accent = SYSTEM_ACCENTS.get(s.system, (TEXT_SECONDARY,))[0]
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


def render_face_scan(face_stress, is_healthy, features) -> str:
    status_color = RECOVERY_GREEN if is_healthy else BRAND_PRIMARY
    status_text = "Healthy" if is_healthy else "Stressed"
    status_bg = "rgba(74, 222, 128, 0.10)" if is_healthy else "rgba(234, 88, 12, 0.10)"

    return f"""
    <div class="face-pill">
        <div>
            <div class="face-label">Face Scan</div>
            <div class="face-num" style="color: {status_color};">{face_stress:.0f}<span style="font-size: 14px; color: {TEXT_FAINT};">/100</span></div>
        </div>
        <div style="flex: 1;">
            <span class="face-status" style="color: {status_color}; background: {status_bg};">{status_text}</span>
            <div class="face-meta">EAR L={features.left_eye_aspect:.3f} R={features.right_eye_aspect:.3f} · Brow={features.brow_tension:.4f} · Sym={features.eye_symmetry:.3f}</div>
            <div class="face-meta" style="margin-top: 6px; font-style: italic;">Processed on-device. No biometric data transmitted.</div>
        </div>
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
                <span style="color: {TEXT_FAINT}; font-size: 10px;">{html.escape(message)}</span>
            </div>
            """)
        body = "".join(items)
    else:
        body = f"""
        <div class="trace-step">
            <span class="trace-dot" style="background: {TEXT_FAINT};"></span>
            <span style="flex: 1; color: {TEXT_FAINT};">parse_stressors</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: {TEXT_FAINT};"></span>
            <span style="flex: 1; color: {TEXT_FAINT};">compute_live_score</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: {TEXT_FAINT};"></span>
            <span style="flex: 1; color: {TEXT_FAINT};">face_scan</span>
        </div>
        <div class="trace-step">
            <span class="trace-dot" style="background: {TEXT_FAINT};"></span>
            <span style="flex: 1; color: {TEXT_FAINT};">llm_coach</span>
        </div>
        <div class="trace-step" style="margin-top: 8px;">
            <span class="ready-pulse"></span>
            <span style="color: {TEXT_MUTED}; font-size: 10px;">Awaiting analysis</span>
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
    """Streaming generator: yields (hero_html, meters_html, rx_html, face_html, advice_html, trace_html)."""
    stressors = build_stressors(
        alcohol, alcohol_type, alcohol_count,
        training, training_area, training_intensity,
        sleep, sleep_hours, stress, stress_carried,
        ill, ill_severity, care,
    )

    # Step 1: parse stressors
    trace = [("parse_stressors", "active", f"{len(stressors)} selected")]
    yield (
        render_empty_state(), render_empty_state(), "",
        "", _empty_coach(), render_agent_trace(trace),
    )
    time.sleep(0.05)

    if not stressors:
        trace[-1] = ("parse_stressors", "error", "none selected")
        yield (
            f"""<div class="empty-state"><div class="icon">🫀</div>
                <div class="label">Log at least one stressor</div>
                <div class="sub">Tap a checkbox on the left to begin.</div></div>""",
            "", "", "", _empty_coach(), render_agent_trace(trace),
        )
        return

    trace[-1] = ("parse_stressors", "done", f"{len(stressors)} stressors")
    progress(0.1, desc="Computing debt score...")

    # Step 2: compute scores
    trace.append(("compute_live_score", "active", "deterministic engine"))
    yield ("", "", "", "", _empty_coach(), render_agent_trace(trace))
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

    # Step 3: face scan
    face_html = ""
    face_stress = None
    if face_image is not None:
        trace.append(("face_scan", "active", "MediaPipe FaceMesh"))
        yield ("", "", "", "", _empty_coach(), render_agent_trace(trace))
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

    progress(0.5, desc="Building system breakdown...")

    # Step 4: render hero + systems
    _, verdict, _ = debt_tier(live_score)
    hero_html = render_hero(live_score, verdict)
    meters_html = render_system_meters(system_scores)
    rx_html = render_prescription(system_scores, live_score)
    science_html = render_science(system_scores)

    # Step 5: streaming LLM advice
    trace.append(("llm_coach", "active", "SmolLM2-360M local"))
    accumulated = ""
    stressor_summary = ", ".join(
        f"{STRESSOR_DEFS[s.type]['icon']} {STRESSOR_DEFS[s.type]['label']}" for s in stressors
    )
    system_dicts = [
        {"label": s.label, "score": s.score, "cleared_at": s.cleared_at} for s in system_scores
    ]

    yield (
        hero_html, meters_html, rx_html + science_html, face_html,
        _coach_with_cursor(""),
        render_agent_trace(trace),
    )

    try:
        for piece in stream_advice(live_score, system_dicts, stressor_summary, face_stress):
            accumulated += piece
            yield (
                hero_html, meters_html, rx_html + science_html, face_html,
                _coach_with_cursor(accumulated),
                render_agent_trace(trace),
            )
    except Exception as e:
        print(f"Stream fallback: {e}")
        accumulated = _fallback_advice(live_score, system_dicts, stressor_summary)
        yield (
            hero_html, meters_html, rx_html + science_html, face_html,
            _coach_with_cursor(accumulated),
            render_agent_trace(trace),
        )

    trace[-1] = ("llm_coach", "done", f"{len(accumulated)} chars")
    progress(1.0, desc="Done")
    yield (
        hero_html, meters_html, rx_html + science_html, face_html,
        _coach_with_cursor(accumulated),
        render_agent_trace(trace),
    )


def _empty_coach() -> str:
    return f"""
    <div class="coach-block">
        <div class="coach-header">
            <span>AI Recovery Coach</span>
            <span class="coach-pill">SmolLM2-360M · local</span>
        </div>
        <div class="coach-body" style="color: {TEXT_FAINT};">
            <span class="ready-pulse"></span>Ready. Tap <strong style="color: {TEXT_SECONDARY};">Calculate Body Debt</strong> to stream advice.
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


# ─── Layout ───────────────────────────────────────────────────────────────────

with gr.Blocks(title="Body Debt") as demo:
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
            gr.HTML('<div class="section-label">What happened</div>')

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

            gr.HTML('<div class="section-label" style="margin-top: 20px;">Timing</div>')
            bed_time = gr.Textbox(label="Bedtime", placeholder="2:00 AM")
            wake_time = gr.Textbox(label="Wake time", placeholder="8:30 AM")

            gr.HTML('<div class="section-label" style="margin-top: 20px;">Face scan <span style="font-weight: 400; text-transform: none; letter-spacing: normal; color: #524f4c;">(optional)</span></div>')
            face_image = gr.Image(
                label="Capture or upload",
                sources=["webcam", "upload"],
                type="numpy",
            )

            analyze_btn = gr.Button("Calculate Body Debt", variant="primary", size="lg")

        with gr.Column(scale=2):
            hero_output = gr.HTML(value=render_empty_state())
            meters_output = gr.HTML(value="")
            face_output = gr.HTML(value="")
            with gr.Row():
                with gr.Column(scale=3):
                    rx_output = gr.HTML(value="")
                with gr.Column(scale=2):
                    trace_output = gr.HTML(value=render_agent_trace([]))
            coach_output = gr.HTML(value=_empty_coach())

    # Toggle detail sections
    alcohol.change(lambda v: gr.Group(visible=v), alcohol, alcohol_details)
    training.change(lambda v: gr.Group(visible=v), training, training_details)
    sleep.change(lambda v: gr.Group(visible=v), sleep, sleep_details)
    stress.change(lambda v: gr.Group(visible=v), stress, stress_details)
    ill.change(lambda v: gr.Group(visible=v), ill, ill_details)

    analyze_btn.click(
        fn=run_analysis_stream,
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
        outputs=[hero_output, meters_output, rx_output, face_output, coach_output, trace_output],
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
