# Face-scan science: what the 7 features actually measure

The ZK pipeline proves the *computation* was done correctly and privately. It
does **not** validate that the computation measures stress. This doc states, per
feature, what it is, what (if any) literature supports it, and what we do NOT
claim. It exists so copy, demos, and judge pages cannot over-claim.

## Feature-by-feature

| Feature | Computation (`src/lib/ai/face-mesh.ts`) | Supported by literature? |
|---|---|---|
| `leftEyeAspect` / `rightEyeAspect` | Eye Aspect Ratio (EAR): eyelid span / eye-corner span | **Yes, narrowly.** EAR is a validated, widely used proxy for blink and drowsiness (Soukupová & Čech, 2016). It is NOT a validated general-stress marker. |
| `browTension` | inner-brow-to-eye-top distance ÷ interocular distance | **Weak.** Related to FACS Action Units 1/2/4 (brow raise/lower) which appear in affect research, but this specific ratio has no published validation against physiological stress. |
| `mouthTension` | mouth width ÷ mouth height | **Ad hoc.** Jaw/clenching appears in stress literature; this geometric ratio is a heuristic with no validation. |
| `eyeSymmetry` | relative L/R EAR difference | **None.** Asymmetry is used in facial-palsy assessment, not stress. Included as a robustness/expression feature. |
| `mouthOpening` | mouth height ÷ width | **None.** Captures mouth-breathing/open-jaw; not validated. |

All distances are normalized (IOD or opposing span), making features
scale- and distance-invariant — the ZK circuit depends on this invariance.

## Claims we make vs. don't make

**Do claim:** the proof attests that these 7 numbers were computed from the
user's face inside their browser, with no image leaving the device, and that
the downstream score was derived from exactly those numbers.

**Do NOT claim:** the score is a clinical or validated measure of
physiological stress. Copy must say "facial-tension heuristic" or
"experimental stress proxy," never "stress measurement" without qualifier.

## Validation roadmap

The signal is unvalidated. The plan is to *earn* validity rather than assert it:

1. **Longitudinal capture** (no images): store feature vectors + timestamps
   alongside self-reports and wearable-anchored outcomes via the existing
   Supermemory outcome-signal path; PostgreSQL remains canonical.
2. **Correlation analysis**: does any feature or combination predict
   self-reported stress, HRV deviation, or sleep quality beyond chance?
3. **Retire or refine**: features with no predictive value get dropped from the
   catalog and the circuit; the pipeline stays, the model is swappable.
4. **Literature check before any clinical framing**: anything shown to users
   as health guidance must trace to published, peer-reviewed support.

Until step 2 produces results, the face scan is a **privacy-attestation demo
with an experimental model**, and all UI/demo copy must reflect that.
