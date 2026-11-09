# Camera Vitals: Options & Fallback Strategy

How Orbura gets pulse / breathing / HRV from a webcam, what we rejected, and
the planned degraded-mode fallback.

## Current stack (primary path)

- **Presage SmartSpectra SDK** — camera-vitals check-in (pulse, breathing rate)
  in `src/components/hrv/CameraVitalsPanel.tsx`, persisted via
  `/api/vitals/check-in` → `wearable_observations` → `TodayInput`.
- **MediaPipe Face Landmarker (Tasks Vision)** — facial geometry features
  (EAR, brow tension, mouth metrics) for the EZKL stress circuit in
  `src/lib/ai/face-mesh.ts`. Self-hosted WASM + `.task` model under
  `public/mediapipe/`. GPU delegate with CPU fallback.

These are different signals: SmartSpectra reads blood-volume pulse from skin
color modulation (rPPG); MediaPipe reads facial geometry. Neither replaces
the other.

## Evaluated alternatives (2026-02)

| Repo | What it is | Verdict |
|---|---|---|
| `ubicomplab/rPPG-Toolbox` | NeurIPS 2023 research toolbox (POS, CHROM, DeepPhys, TS-CAN, EfficientPhys, PhysFormer); PyTorch + datasets | **Reference only.** Use as an eval harness to sanity-check SmartSpectra accuracy claims on PURE/UBFC/MMPD before making clinical-adjacent claims. Algorithms (POS/CHROM ~100 lines) are portable to JS if needed. Do not ship. |
| `KegangWangCCNU/vitalcamera-sdk` | Browser-native npm SDK: Web Workers + TFLite/LiteRT; HR, HRV (RMSSD/SDNN), emotion, gaze, head pose | **Bookmark.** Only real browser-native alternative and richer signals (HRV matters for GLP-1 adherence). But 4 stars, single author, self-hosted models, and it depends on MediaPipe Face Landmarker anyway — same failure surface as today. Spike only if the Presage dependency becomes a problem (pricing, partition, accuracy). |
| `ebowwa/rppg-vitalsigns` | Notebook-driven research project → CoreML iOS app | **Skip.** Not a library, not web-deployable, immature. |

## Planned fallback: self-hosted POS/CHROM rPPG

If SmartSpectra is unavailable (SDK failure, offline, key issues), we can derive
trend-level vitals from the 478 landmarks MediaPipe already produces — no new
dependencies.

**Approach**

1. Define ROIs from existing landmarks: forehead (above brow line), left/right
   cheek patches. ~10 landmark indices each, stable under moderate head motion.
2. Per video frame, sample mean RGB inside each ROI on a downscaled canvas
   (~160×120 is enough for rPPG).
3. Apply **POS** (plane-orthogonal-to-skin): normalize chrominance channels,
   project onto the plane orthogonal to the skin-tone direction, take the
   projection as the pulse signal. ~150 lines of JS, runs in a Web Worker.
4. Band-pass filter 0.7–4 Hz (heart rate) — breathing emerges in the 0.1–0.5 Hz
   band with a longer window (~30 s vs ~10 s for pulse).
5. Peak detection on the filtered signal → instantaneous HR → median over a
   10–15 s window. Reject windows with low signal quality (AC/DC ratio,
   spectral purity) rather than reporting a number.

**Honest limits**

- Accuracy is well below SmartSpectra (which is a tuned, validated SDK). This
  is a *degraded-mode trend signal*, not a measurement.
- Requires stable lighting and minimal head motion; the existing face-position
  guide and distance gates already enforce most of this.
- Should be labeled differently in UI ("approximate pulse from camera") and
  never feed the deterministic safety escalation thresholds — those stay
  SmartSpectra/wearable-sourced.

**Reference implementation sources**: `ubicomplab/rPPG-Toolbox`
(`unsupervised_methods/pos.py`, `chrom.py`) for the algorithm; classic papers
Wang et al. 2017 (POS), de Haan & Jeanne 2013 (CHROM).

## Decision

- Primary: SmartSpectra (already integrated, hackathon-validated, partnership
  narrative intact).
- Fallback v1: manual check-in (current `FaceScanFallback` / vitals form).
- Fallback v2 (this doc): POS/CHROM on MediaPipe landmarks — spec'd, not yet
  built. Build only if SmartSpectra fallback demand proves real.
