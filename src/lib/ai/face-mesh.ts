// MediaPipe Tasks Vision is ESM-friendly and properly typed, unlike the
// legacy @mediapipe/face_mesh solution bundle (which attached to globalThis
// and required a runtime require hack). WASM + model are self-hosted from
// public/mediapipe so the face scan doesn't depend on a CDN at runtime.

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const LANDMARKS = {
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  LEFT_EYEBROW_INNER: 107,
  LEFT_EYEBROW_OUTER: 70,
  RIGHT_EYEBROW_INNER: 336,
  RIGHT_EYEBROW_OUTER: 300,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
};

export interface StressFeatures {
  leftEyeAspect: number;
  rightEyeAspect: number;
  browTension: number;
  mouthTension: number;
  eyeSymmetry: number;       // relative asymmetry between left/right eyes
  mouthOpening: number;      // mouth height/width ratio (jaw tension)
  timestamp: number;
}

interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
}

export type { MediaPipeLandmark };

/** Legacy FaceMesh callback shape — kept so the pipeline hook is unchanged. */
export interface FaceMeshResults {
  multiFaceLandmarks: MediaPipeLandmark[][];
}

/**
 * Adapter exposing the legacy FaceMesh surface (onResults/send) on top of
 * FaceLandmarker, so callers don't need to know about the Tasks API.
 */
export interface FaceMeshAdapter {
  onResults(cb: (results: FaceMeshResults) => void): void;
  send({ image }: { image: HTMLCanvasElement | HTMLVideoElement | ImageBitmap }): Promise<void>;
  close(): void;
}

async function createLandmarker(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/tasks");
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: "/mediapipe/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
  });
}

function toLegacyResults(result: FaceLandmarkerResult): FaceMeshResults {
  return {
    multiFaceLandmarks: result.faceLandmarks.map((face) =>
      face.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
    ),
  };
}

export function initializeFaceMesh(
  onResults: (results: FaceMeshResults) => void
): FaceMeshAdapter {
  let callback = onResults;
  // Created lazily on first send() so init errors surface through the same
  // try/catch path the pipeline hook already handles.
  let landmarker: FaceLandmarker | null = null;
  let creating: Promise<FaceLandmarker> | null = null;

  const ensure = async (): Promise<FaceLandmarker> => {
    if (landmarker) return landmarker;
    if (!creating) {
      creating = createLandmarker().then((lm) => {
        landmarker = lm;
        return lm;
      });
    }
    return creating;
  };

  return {
    onResults(cb) {
      callback = cb;
    },
    async send({ image }) {
      const lm = await ensure();
      // IMAGE running mode: detect() is synchronous and stateless per frame,
      // which matches the legacy FaceMesh.send() semantics.
      callback(toLegacyResults(lm.detect(image)));
    },
    close() {
      landmarker?.close();
      landmarker = null;
      creating = null;
    },
  };
}

/** Kept for API compatibility. WASM warm-up starts here, in the background. */
export async function initializeFaceMeshAsync(
  onResults: (results: FaceMeshResults) => void
): Promise<FaceMeshAdapter> {
  const adapter = initializeFaceMesh(onResults);
  // Warm up WASM in the background so it overlaps the camera permission
  // prompt. Failures are ignored here; a real send() surfaces them through
  // the pipeline's existing mediapipe_error path.
  void adapter
    .send({ image: document.createElement("canvas") })
    .catch(() => {});
  return adapter;
}

function distance(p1: MediaPipeLandmark, p2: MediaPipeLandmark): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2);
}

function calculateEAR(
  outer: MediaPipeLandmark, inner: MediaPipeLandmark,
  top: MediaPipeLandmark, bottom: MediaPipeLandmark
): number {
  const v = distance(top, bottom);
  const h = distance(outer, inner);
  return h > 0 ? v / h : 0;
}

export function extractStressFeatures(landmarks: MediaPipeLandmark[]): StressFeatures | null {
  if (!landmarks || landmarks.length < 468) return null;
  const p = (i: number) => landmarks[i];

  const leftEyeOuter = p(LANDMARKS.LEFT_EYE_OUTER);
  const leftEyeInner = p(LANDMARKS.LEFT_EYE_INNER);
  const leftEyeTop   = p(LANDMARKS.LEFT_EYE_TOP);
  const leftEyeBottom = p(LANDMARKS.LEFT_EYE_BOTTOM);
  const rightEyeOuter = p(LANDMARKS.RIGHT_EYE_OUTER);
  const rightEyeInner = p(LANDMARKS.RIGHT_EYE_INNER);
  const rightEyeTop   = p(LANDMARKS.RIGHT_EYE_TOP);
  const rightEyeBottom = p(LANDMARKS.RIGHT_EYE_BOTTOM);

  const leftEAR = calculateEAR(leftEyeOuter, leftEyeInner, leftEyeTop, leftEyeBottom);
  const rightEAR = calculateEAR(rightEyeOuter, rightEyeInner, rightEyeTop, rightEyeBottom);

  // Interocular distance is the standard scale-invariant reference for
  // horizontal face geometry. Averaging outer-corner and inner-corner
  // spans smooths out small yaw rotations.
  const iod = (distance(leftEyeOuter, rightEyeOuter) +
               distance(leftEyeInner, rightEyeInner)) / 2 || 1;

  const rawBrow = (
    distance(p(LANDMARKS.LEFT_EYEBROW_INNER), leftEyeTop) +
    distance(p(LANDMARKS.RIGHT_EYEBROW_INNER), rightEyeTop)
  ) / 2;
  const browTension = rawBrow / iod;

  const mouthWidth = distance(p(LANDMARKS.MOUTH_LEFT), p(LANDMARKS.MOUTH_RIGHT));
  const mouthHeight = distance(p(LANDMARKS.MOUTH_TOP), p(LANDMARKS.MOUTH_BOTTOM));
  const mouthTension = mouthHeight > 0 ? mouthWidth / mouthHeight : 1;

  const eyeSymmetry = Math.abs(leftEAR - rightEAR) / ((leftEAR + rightEAR) / 2 + 0.001);
  const mouthOpening = mouthHeight > 0 ? mouthHeight / mouthWidth : 0.1;

  return { leftEyeAspect: leftEAR, rightEyeAspect: rightEAR, browTension, mouthTension, eyeSymmetry, mouthOpening, timestamp: Date.now() };
}

