import { describe, it, expect } from "vitest";
import {
  extractStressFeatures,
  type StressFeatures,
  type MediaPipeLandmark,
} from "@/lib/ai/face-mesh";

/**
 * Synthetic 468-landmark face with hand-computed geometry.
 *
 * Layout (z = 0 everywhere, so distances are planar):
 *   Left eye:  outer (0,0)  inner (1,0)  top (0.5,1)  bottom (0.5,0.2)
 *   Right eye: outer (5,0)  inner (4,0)  top (4.5,1) bottom (4.5,0.2)
 *     → EAR each = 0.8 / 1 = 0.8
 *   IOD = (dist(L_outer,R_outer)=5 + dist(L_inner,R_inner)=3) / 2 = 4
 *   Brows: inner at (0.5,1.5) and (4.5,1.5) → 0.5 above eye tops
 *     → browTension = 0.5 / 4 = 0.125
 *   Mouth: corners (1.5,-1),(3.5,-1) → width 2
 *          top/bottom (2.5,-0.8),(2.5,-1.2) → height 0.4
 *     → mouthTension = 2 / 0.4 = 5, mouthOpening = 0.4 / 2 = 0.2
 */
const IDX = {
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  LEFT_EYEBROW_INNER: 107,
  RIGHT_EYEBROW_INNER: 336,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
};

const FACE: Array<[number, number, number]> = [
  [IDX.LEFT_EYE_OUTER, 0, 0],
  [IDX.LEFT_EYE_INNER, 1, 0],
  [IDX.LEFT_EYE_TOP, 0.5, 1],
  [IDX.LEFT_EYE_BOTTOM, 0.5, 0.2],
  [IDX.RIGHT_EYE_OUTER, 5, 0],
  [IDX.RIGHT_EYE_INNER, 4, 0],
  [IDX.RIGHT_EYE_TOP, 4.5, 1],
  [IDX.RIGHT_EYE_BOTTOM, 4.5, 0.2],
  [IDX.LEFT_EYEBROW_INNER, 0.5, 1.5],
  [IDX.RIGHT_EYEBROW_INNER, 4.5, 1.5],
  [IDX.MOUTH_TOP, 2.5, -0.8],
  [IDX.MOUTH_BOTTOM, 2.5, -1.2],
  [IDX.MOUTH_LEFT, 1.5, -1],
  [IDX.MOUTH_RIGHT, 3.5, -1],
];

function buildFace(scale = 1): MediaPipeLandmark[] {
  const landmarks: MediaPipeLandmark[] = Array.from({ length: 468 }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));
  for (const [i, x, y] of FACE) {
    landmarks[i] = { x: x * scale, y: y * scale, z: 0 };
  }
  return landmarks;
}

describe("extractStressFeatures", () => {
  it("returns null when there are fewer than 468 landmarks", () => {
    expect(extractStressFeatures([])).toBeNull();
    expect(extractStressFeatures(buildFace().slice(0, 467))).toBeNull();
  });

  it("returns null for missing/null input", () => {
    expect(
      extractStressFeatures(null as unknown as MediaPipeLandmark[])
    ).toBeNull();
  });

  it("computes the hand-derived eye aspect ratios", () => {
    const f: StressFeatures = extractStressFeatures(buildFace())!;
    expect(f.leftEyeAspect).toBeCloseTo(0.8, 10);
    expect(f.rightEyeAspect).toBeCloseTo(0.8, 10);
  });

  it("computes browTension as brow-to-eye-top distance over IOD", () => {
    const f = extractStressFeatures(buildFace())!;
    expect(f.browTension).toBeCloseTo(0.125, 10);
  });

  it("computes mouthTension as width/height and mouthOpening as height/width", () => {
    const f = extractStressFeatures(buildFace())!;
    expect(f.mouthTension).toBeCloseTo(5, 10);
    expect(f.mouthOpening).toBeCloseTo(0.2, 10);
  });

  it("reports zero symmetry for a symmetric face", () => {
    const f = extractStressFeatures(buildFace())!;
    expect(f.eyeSymmetry).toBeCloseTo(0, 10);
  });

  it("reports positive asymmetry for asymmetric eyes", () => {
    const landmarks = buildFace();
    // Squint the left eye: top moved down onto the bottom lid.
    landmarks[IDX.LEFT_EYE_TOP] = { x: 0.5, y: 0.2, z: 0 };
    const f = extractStressFeatures(landmarks)!;
    // leftEAR = 0/1 = 0, rightEAR = 0.8
    expect(f.leftEyeAspect).toBeCloseTo(0, 10);
    // |0 - 0.8| / ((0 + 0.8)/2 + 0.001)
    expect(f.eyeSymmetry).toBeCloseTo(0.8 / 0.401, 5);
  });

  it("is scale-invariant (circuit depends on this)", () => {
    const a = extractStressFeatures(buildFace(1))!;
    const b = extractStressFeatures(buildFace(2))!;
    const c = extractStressFeatures(buildFace(0.01))!;
    for (const key of [
      "leftEyeAspect",
      "rightEyeAspect",
      "browTension",
      "mouthTension",
      "eyeSymmetry",
      "mouthOpening",
    ] as const) {
      expect(b[key]).toBeCloseTo(a[key], 6);
      expect(c[key]).toBeCloseTo(a[key], 6);
    }
  });

  it("handles degenerate all-zero landmarks without NaN/Infinity", () => {
    const landmarks: MediaPipeLandmark[] = Array.from(
      { length: 468 },
      () => ({ x: 0, y: 0, z: 0 })
    );
    const f = extractStressFeatures(landmarks)!;
    for (const key of [
      "leftEyeAspect",
      "rightEyeAspect",
      "browTension",
      "mouthTension",
      "eyeSymmetry",
      "mouthOpening",
    ] as const) {
      expect(Number.isFinite(f[key])).toBe(true);
    }
    // EAR guards divide-by-zero → 0; mouthTension falls back to 1.
    expect(f.leftEyeAspect).toBe(0);
    expect(f.mouthTension).toBe(1);
  });

  it("guards a degenerate mouth (height 0) without division by zero", () => {
    const landmarks = buildFace();
    landmarks[IDX.MOUTH_TOP] = { x: 2.5, y: -1, z: 0 }; // same y as bottom
    landmarks[IDX.MOUTH_BOTTOM] = { x: 2.5, y: -1, z: 0 };
    const f = extractStressFeatures(landmarks)!;
    expect(Number.isFinite(f.mouthTension)).toBe(true);
    expect(f.mouthTension).toBe(1);
  });

  it("includes a timestamp", () => {
    const before = Date.now();
    const f = extractStressFeatures(buildFace())!;
    expect(f.timestamp).toBeGreaterThanOrEqual(before);
    expect(f.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("uses 3D distances when z varies (deeper set eye lowers EAR)", () => {
    const landmarks = buildFace();
    landmarks[IDX.LEFT_EYE_BOTTOM] = { x: 0.5, y: 0.2, z: 1 };
    const f = extractStressFeatures(landmarks)!;
    // dist = sqrt(0.8^2 + 1^2) > 0.8 → leftEAR > 0.8
    expect(f.leftEyeAspect).toBeGreaterThan(0.8);
  });
});
