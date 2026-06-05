// MediaPipe uses a non-ESM format that Turbopack can't statically resolve.
// We load it dynamically at runtime in the browser only.

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

  const leftEAR = calculateEAR(p(LANDMARKS.LEFT_EYE_OUTER), p(LANDMARKS.LEFT_EYE_INNER), p(LANDMARKS.LEFT_EYE_TOP), p(LANDMARKS.LEFT_EYE_BOTTOM));
  const rightEAR = calculateEAR(p(LANDMARKS.RIGHT_EYE_OUTER), p(LANDMARKS.RIGHT_EYE_INNER), p(LANDMARKS.RIGHT_EYE_TOP), p(LANDMARKS.RIGHT_EYE_BOTTOM));
  const browTension = (distance(p(LANDMARKS.LEFT_EYEBROW_INNER), p(LANDMARKS.LEFT_EYE_TOP)) + distance(p(LANDMARKS.RIGHT_EYEBROW_INNER), p(LANDMARKS.RIGHT_EYE_TOP))) / 2;
  const mouthWidth = distance(p(LANDMARKS.MOUTH_LEFT), p(LANDMARKS.MOUTH_RIGHT));
  const mouthHeight = distance(p(LANDMARKS.MOUTH_TOP), p(LANDMARKS.MOUTH_BOTTOM));
  const mouthTension = mouthHeight > 0 ? mouthWidth / mouthHeight : 1;

  const eyeSymmetry = Math.abs(leftEAR - rightEAR) / ((leftEAR + rightEAR) / 2 + 0.001);
  const mouthOpening = mouthHeight > 0 ? mouthHeight / mouthWidth : 0.1;

  return { leftEyeAspect: leftEAR, rightEyeAspect: rightEAR, browTension, mouthTension, eyeSymmetry, mouthOpening, timestamp: Date.now() };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initializeFaceMesh(onResults: (results: { multiFaceLandmarks: MediaPipeLandmark[][] }) => void): any {
  // Dynamic require — MediaPipe attaches to globalThis at runtime
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FaceMesh } = require("@mediapipe/face_mesh");

  const faceMesh = new FaceMesh({
    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMesh.onResults(onResults);
  return faceMesh;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function startCamera(videoElement: HTMLVideoElement, faceMesh: any): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Camera } = require("@mediapipe/camera_utils");

  const camera = new Camera(videoElement, {
    onFrame: async () => { await faceMesh.send({ image: videoElement }); },
    width: 640,
    height: 480,
  });
  camera.start();
  return camera;
}
