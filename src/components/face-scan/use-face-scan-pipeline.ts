"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { initializeFaceMesh, initializeFaceMeshAsync, extractStressFeatures } from "@/lib/ai";
import {
  healthCredentialVerifierABI,
  VERIFIER_CONTRACT_ADDRESS,
  SKALE_CHAIN_ID,
  fetchVkChunks,
  isCorrectChain,
  isZeroAddress,
} from "@/lib/blockchain";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi";
import type { ZKProofResult, ZKVerifyMode, OnChainVerificationStatus } from "@/lib/types";
import type { Hex } from "viem";

export type ScanPhase =
  | "privacy" | "prompt" | "camera" | "review"
  | "extracting" | "proving" | "verifying"
  | "result" | "error" | "skipped"
  | "mediapipe_error";

export type CameraError = "denied" | "unavailable" | "in_use" | "insecure" | "generic" | "mediapipe_loading";

export const SCAN_MESSAGES = [
  "Reading face geometry on this device…",
  "Measuring eye openness…",
  "Checking brow tension…",
  "Mapping facial landmarks…",
  "Building a private proof…",
  "Verifying the proof locally…",
  "Almost done — browser-local proof…",
];

export function cameraErrorCopy(kind: CameraError) {
  switch (kind) {
    case "denied": return { title: "Camera access blocked", body: "Enable camera access in your browser settings.", action: "Try again" };
    case "unavailable": return { title: "No camera found", body: "This device doesn't appear to have a camera.", action: "Continue without scan" };
    case "in_use": return { title: "Camera is in use", body: "Another app is using your camera.", action: "Try again" };
    case "insecure": return { title: "HTTPS required for camera", body: "Browsers block camera access on non-HTTPS pages. Open this app over HTTPS (or localhost) to use face scan.", action: "Continue without scan" };
    case "mediapipe_loading": return { title: "Face detection model unavailable", body: "The MediaPipe face mesh model could not load. This can happen on slow connections or when CDN assets are blocked. You can still provide a manual self-assessment below.", action: "Use manual check" };
    case "generic": return { title: "Camera unavailable", body: "The camera API is blocked on this connection. The page must be served over HTTPS to access the camera. Use “Continue without scan” or open the HTTPS URL.", action: "Continue without scan" };
  }
}

/**
 * Cheap per-frame lighting estimator. Samples a 60×60 patch from the
 * centre of the video element and computes mean luminance. Returns
 * "dark" (under 45 — underexposed, MediaPipe will struggle),
 * "ok" (45–200), or "bright" (over 200 — blown out highlights,
 * washed-out features). The thresholds are conservative on purpose
 * so the "ok" band is comfortable.
 */
function analyzeLighting(video: HTMLVideoElement): "dark" | "ok" | "bright" {
  if (typeof document === "undefined") return "ok";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 60;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "ok";
    ctx.drawImage(video, 0, 0, 60, 60);
    const { data } = ctx.getImageData(0, 0, 60, 60);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const mean = total / (60 * 60);
    // Softened from 45/200 — phone cameras often underexpose indoors.
    if (mean < 35) return "dark";
    if (mean > 210) return "bright";
    return "ok";
  } catch {
    return "ok";
  }
}

/**
 * Blur estimator via Laplacian variance on a 100×100 patch. A sharp
 * image has high-frequency edges, so the variance of the Laplacian
 * is high. A blurry image has smeared-out edges, so the variance
 * collapses. Threshold tuned conservatively — the exact number
 * depends on camera/sensor, but a clear separation between "sharp"
 * and "blurry" emerges well below typical sharp-image variance.
 */
function analyzeBlur(video: HTMLVideoElement): "blurry" | "sharp" {
  if (typeof document === "undefined") return "sharp";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "sharp";
    ctx.drawImage(video, 0, 0, 100, 100);
    const { data, width: w, height: h } = ctx.getImageData(0, 0, 100, 100);
    // Build a grayscale buffer first (cheaper to index than per-pixel rgb).
    const gray = new Float32Array(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    // 3×3 Laplacian kernel. Skip the 1-pixel border to avoid padding.
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap =
          gray[idx - w] + gray[idx + w] +
          gray[idx - 1] + gray[idx + 1] -
          4 * gray[idx];
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    // Softened from 30 — soft phone sensors / mild motion were failing too often.
    return variance < 18 ? "blurry" : "sharp";
  } catch {
    return "sharp";
  }
}

/**
 * Distance estimator from the bounding box of the detected face
 * landmarks. Returns "too_far" if the face covers less than 15% of
 * the frame width, "too_close" if more than 65%, and "ok"
 * otherwise. The bbox is normalised to [0,1] space using the
 * landmarks' own x range, so the result is camera-resolution
 * independent.
 */
function analyzeDistance(
  landmarks: { x: number; y: number; z: number }[],
): "too_far" | "too_close" | "ok" {
  if (!landmarks.length) return "too_far";
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  // Landmarks are in [0,1] normalised space relative to the frame
  // that was sent to MediaPipe. Since we draw to a canvas at the
  // video's native resolution and send that, the values are still
  // in [0,1].
  const w = maxX - minX;
  const h = maxY - minY;
  const fillRatio = Math.max(w, h);
  if (fillRatio < 0.12) return "too_far";
  if (fillRatio > 0.72) return "too_close";
  return "ok";
}

function classifyError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    if ((err as DOMException & { insecureOrigin?: boolean }).insecureOrigin) return "insecure";
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "unavailable";
    if (err.name === "NotReadableError" || err.name === "TrackStartError") return "in_use";
    if (err.name === "SecurityError") return "insecure";
  }
  return "generic";
}

interface ProofResultShape {
  success: boolean;
  proof: string;
  proofHex?: string;
  publicInstances?: string[];
  publicInputs: string;
  verified?: boolean;
  verifyDurationMs?: number;
  verifyMode?: ZKVerifyMode;
}

function buildZkResult(
  proofResult: ProofResultShape,
  onChainStatus: OnChainVerificationStatus,
  txHash?: string,
): ZKProofResult {
  const parsed = JSON.parse(proofResult.publicInputs);
  // Fallback inference for older worker payloads that don't yet send
  // verifyMode: if `verified` is undefined we treat it as a mock (init
  // failed); if it's a real boolean we map to crypto/failed.
  const verifyMode: ZKVerifyMode =
    proofResult.verifyMode ??
    (proofResult.verified === true ? "crypto"
      : proofResult.verified === false ? "failed"
      : "mock");
  return {
    proof: proofResult.proof,
    proofHex: proofResult.proofHex,
    publicInputs: proofResult.publicInputs,
    stressScore: parsed.stress_score ?? 0.5,
    isHealthy: parsed.is_healthy ?? true,
    durationMs: proofResult.verifyDurationMs ?? 0,
    txHash,
    verified: verifyMode === "crypto",
    verifyMode,
    onChainStatus,
  };
}

export function useFaceScanPipeline() {
  const router = useRouter();
  const { setFaceAnalysis, setFaceSkipped, setZkProof } = useBodyDebtStore();

  const [phase, setPhase] = useState<ScanPhase>("privacy");
  const [scanMessageIdx, setScanMessageIdx] = useState(0);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastProof, setLastProof] = useState<ProofResultShape | null>(null);
  const [onChainStatus, setOnChainStatus] = useState<OnChainVerificationStatus>("idle");
  // Live face detection status for the camera preview. Set by the
  // continuous-detection loop in startCamera; consumed by the
  // camera-phase UI to gate the Capture button.
  const [faceStatus, setFaceStatus] = useState<"pending" | "detected" | "not_detected">("pending");
  // Lighting quality from the camera frame. Sampled alongside face
  // detection in the continuous loop. Drives a one-line status hint
  // so the user knows when the environment is the problem, not them.
  const [lightingStatus, setLightingStatus] = useState<"pending" | "dark" | "ok" | "bright">("pending");
  // Blur (Laplacian variance) and distance (face bbox fill ratio)
  // checks. Combined with faceStatus + lightingStatus, these gate
  // the Capture button via the derived `captureReady` flag.
  const [blurStatus, setBlurStatus] = useState<"pending" | "blurry" | "sharp">("pending");
  const [distanceStatus, setDistanceStatus] = useState<"pending" | "too_far" | "too_close" | "ok">("pending");
  // 3-2-1 countdown shown after the user taps Capture, before the
  // actual frame grab. Reduces motion blur and gives the user a
  // clear "something is happening" signal.
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  // Captured frame as a data URL for the review-phase preview.
  // Set after the countdown completes; cleared on retake or skip.
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  // Extracted stress features from the captured frame, for visual
  // display on the result screen. Stored after successful extraction.
  const [extractedFeatures, setExtractedFeatures] = useState<{
    leftEyeAspect: number; rightEyeAspect: number; browTension: number;
    mouthTension: number; eyeSymmetry: number; mouthOpening: number;
  } | null>(null);

  const { isConnected, chainId } = useAccount();
  const { connectAsync } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: txHash, writeContractAsync } = useWriteContract();
  const { isSuccess: isConfirmed, isError: isTxError } = useWaitForTransactionReceipt({ hash: txHash });

  const confirmedHandledRef = useRef(false);
  const effectivePhase: ScanPhase = (isConfirmed && phase === "verifying") ? "result" : phase;

  const setLocalResult = useCallback((proofResult: ProofResultShape, status: OnChainVerificationStatus, summarySuffix: string) => {
    const parsed = JSON.parse(proofResult.publicInputs);
    setZkProof(buildZkResult(proofResult, status));
    setFaceAnalysis({
      // The circuit only proves stress_score / is_healthy. Puffiness and
      // inflammation aren't derived from the face, so we mark them
      // honestly instead of fabricating "mild" / "none".
      periorbitalPuffiness: "unmeasured",
      skinPerfusion: parsed.is_healthy ? "good" : "low",
      eyeClarity: parsed.is_healthy ? "clear" : "fatigued",
      inflammation: "unmeasured",
      debtContribution: Math.round((parsed.stress_score ?? 0.5) * 20),
      summary: `ZK-verified facial stress analysis (${summarySuffix}).`,
    });
    setPhase("result");
  }, [setFaceAnalysis, setZkProof]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Offscreen canvas of the accepted capture — used for MediaPipe extract (not the live video). */
  const capturedFrameRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<ReturnType<typeof initializeFaceMesh> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  // Stops the ~2 FPS detection loop started in startCamera. Held in a
  // ref because startCamera is called from fire-and-forget onClick
  // handlers — the returned cleanup has nowhere to go, so we stash it
  // here and invoke it from skip/retry/capture/unmount.
  const detectionCleanupRef = useRef<(() => void) | null>(null);
  // Swappable MediaPipe results listener. The face mesh has ONE
  // permanent onResults handler (attached in startCamera) that
  // dispatches into this ref. The detection loop and the capture
  // retry loop each install their own listener while awaiting a
  // single `send`, then clear it. Avoids the per-frame onResults
  // reassignment race that previously depended on send serialisation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultsListenerRef = useRef<((results: any) => void) | null>(null);
  /** Timestamp when face first stayed detected — unlocks relaxed capture after ~6s. */
  const faceLockStartedRef = useRef<number | null>(null);
  const [gatesRelaxed, setGatesRelaxed] = useState(false);

  const startDetectionLoop = useCallback(() => {
    detectionCleanupRef.current?.();
    let cancelled = false;
    const runContinuousDetection = async () => {
      const check = async () => {
        if (cancelled) return;
        const v = videoRef.current;
        if (v && v.readyState >= 2 && faceMeshRef.current) {
          setLightingStatus(analyzeLighting(v));
          setBlurStatus(analyzeBlur(v));
          await new Promise<void>((resolve) => {
            resultsListenerRef.current = (results: { multiFaceLandmarks?: { x: number; y: number; z: number }[][] }) => {
              const landmarks = results.multiFaceLandmarks?.[0];
              if (landmarks && landmarks.length >= 468) {
                setFaceStatus("detected");
                setDistanceStatus(analyzeDistance(landmarks));
                if (faceLockStartedRef.current == null) {
                  faceLockStartedRef.current = Date.now();
                } else if (Date.now() - faceLockStartedRef.current >= 6000) {
                  setGatesRelaxed(true);
                }
              } else {
                setFaceStatus("not_detected");
                setDistanceStatus("too_far");
                faceLockStartedRef.current = null;
                setGatesRelaxed(false);
              }
              resultsListenerRef.current = null;
              resolve();
            };
            faceMeshRef.current!.send({ image: v }).catch(() => {
              resultsListenerRef.current = null;
              resolve();
            });
          });
        }
        if (!cancelled) setTimeout(check, 500);
      };
      await check();
    };
    runContinuousDetection();
    detectionCleanupRef.current = () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !workerRef.current) {
      workerRef.current = new Worker(new URL("@/workers/ezkl-prover.worker.ts", import.meta.url));
      workerRef.current.postMessage({ type: "prefetch" });
    }
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (phase !== "extracting" && phase !== "proving" && phase !== "verifying") return;
    const iv = setInterval(() => setScanMessageIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1200);
    return () => clearInterval(iv);
  }, [phase]);

  // Attach stream to <video> and (re)start detection whenever we enter camera.
  // Retake remounts the video after setPhase("camera") — this effect waits
  // for the element, then resumes the guidance loop.
  useEffect(() => {
    if (phase !== "camera" || !streamRef.current || !faceMeshRef.current) return;
    let cancelled = false;
    const attach = (attempt = 0) => {
      if (cancelled) return;
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
        startDetectionLoop();
      } else if (attempt < 40) {
        setTimeout(() => attach(attempt + 1), 50);
      }
    };
    attach();
    const raf = requestAnimationFrame(() => attach());
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, startDetectionLoop]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      detectionCleanupRef.current?.();
      detectionCleanupRef.current = null;
      capturedFrameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isConfirmed && onChainStatus === "pending") {
      const id = setTimeout(() => setOnChainStatus("verified"), 0);
      return () => clearTimeout(id);
    }
    if (isTxError && onChainStatus === "pending" && lastProof) {
      const id = setTimeout(() => {
        setOnChainStatus("failed");
        setLocalResult(lastProof, "failed", "on-chain verification failed");
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isConfirmed, isTxError, lastProof, onChainStatus, setLocalResult]);

  useEffect(() => {
    if (!isConfirmed || phase !== "verifying" || !lastProof || confirmedHandledRef.current) return;
    confirmedHandledRef.current = true;
    const parsed = JSON.parse(lastProof.publicInputs);

    const zkResult = buildZkResult(lastProof, "verified", txHash as string);
    setZkProof(zkResult);
    setFaceAnalysis({
      periorbitalPuffiness: "unmeasured",
      skinPerfusion: parsed.is_healthy ? "good" : "low",
      eyeClarity: parsed.is_healthy ? "clear" : "fatigued",
      inflammation: "unmeasured",
      debtContribution: Math.round((parsed.stress_score ?? 0.5) * 20),
      summary: "ZK-verified facial stress analysis completed.",
    });
  }, [isConfirmed, phase, lastProof, txHash, setZkProof, setFaceAnalysis]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Preflight: browsers require a secure context (HTTPS or localhost)
      // to expose getUserMedia. Without this, an insecure-origin page
      // falls into the generic "Camera unavailable" bucket and the real
      // cause is invisible. A SecurityError from getUserMedia is also
      // mapped to "insecure" in classifyError, but some browsers refuse
      // to even expose `navigator.mediaDevices` so we check first.
      if (typeof window !== "undefined" && !window.isSecureContext) {
        const err = new DOMException("Secure context required for camera access", "SecurityError") as DOMException & { insecureOrigin?: boolean };
        err.insecureOrigin = true;
        throw err;
      }
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("Camera API unavailable", "NotFoundError");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (frontErr) {
        if (frontErr instanceof DOMException && (frontErr.name === "OverconstrainedError" || frontErr.name === "ConstraintNotSatisfiedError")) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else throw frontErr;
      }
      streamRef.current = stream;

      // ── Initialise MediaPipe Face Mesh ────────────────────────────
      // The dynamic require inside initializeFaceMesh can throw if the
      // @mediapipe/face_mesh bundle is missing, the WASM/CDN assets are
      // blocked, or the browser doesn't support the required APIs.
      // We catch that here and transition to the manual fallback flow
      // instead of showing a generic camera error.
      try {
        faceMeshRef.current = await initializeFaceMeshAsync(() => {});
      } catch {
        setCameraError("mediapipe_loading");
        setPhase("mediapipe_error");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      faceMeshRef.current.onResults((results: any) => {
        resultsListenerRef.current?.(results);
      });
      setPhase("camera");
      setFaceStatus("pending");
      setLightingStatus("pending");
      setBlurStatus("pending");
      setDistanceStatus("pending");
      setCaptureCountdown(null);
      faceLockStartedRef.current = null;
      setGatesRelaxed(false);
      // Detection loop starts in the phase==="camera" effect once <video> mounts.
    } catch (err) {
      setCameraError(classifyError(err));
      setPhase("error");
    }
  }, []);

  const captureAndProve = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Wait for the video element to actually have frames before capturing.
    // On some devices readyState < 2 (HAVE_CURRENT_DATA) when the user taps
    // immediately after the preview appears, which gives MediaPipe an empty
    // frame and causes the "no face detected" failure.
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onReady = () => { video.removeEventListener("loadeddata", onReady); resolve(); };
        video.addEventListener("loadeddata", onReady);
        // safety timeout — don't wait forever
        setTimeout(resolve, 1500);
      });
    }

    // 3-2-1 countdown so the user has time to settle. Reduces motion
    // blur and gives a clear "something is happening" signal.
    setCaptureCountdown(3);
    for (let n = 3; n >= 1; n--) {
      setCaptureCountdown(n);
      await new Promise((r) => setTimeout(r, 700));
    }
    setCaptureCountdown(null);

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setPhase("error"); return; }
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    // Keep a still-frame canvas for MediaPipe on confirm — <video> unmounts in review.
    const imageUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImageUrl(imageUrl);
    const frame = document.createElement("canvas");
    frame.width = w;
    frame.height = h;
    const frameCtx = frame.getContext("2d");
    if (frameCtx) {
      frameCtx.drawImage(canvas, 0, 0);
      capturedFrameRef.current = frame;
    }

    // Pause detection; keep stream alive for retake.
    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;

    setPhase("review");
  }, []);

  // Retake: discard the captured frame and return to camera.
  // The phase==="camera" effect reattaches the stream and restarts detection.
  const retakeCapture = useCallback(() => {
    setCapturedImageUrl(null);
    capturedFrameRef.current = null;
    setFaceStatus("pending");
    setLightingStatus("pending");
    setBlurStatus("pending");
    setDistanceStatus("pending");
    faceLockStartedRef.current = null;
    setGatesRelaxed(false);
    setPhase("camera");
  }, []);

  // Delete: user wants to discard the photo AND exit the face scan
  // entirely. Distinct from retake (which goes back to camera) —
  // delete means "I don't want to do this at all." Stops the camera
  // stream, clears all captured data, and navigates to the next step.
  const deletePhoto = useCallback(() => {
    setCapturedImageUrl(null);
    capturedFrameRef.current = null;
    setExtractedFeatures(null);
    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setFaceSkipped(true);
    setFaceAnalysis(null);
    setFaceStatus("pending");
    setLightingStatus("pending");
    setBlurStatus("pending");
    setDistanceStatus("pending");
    setCaptureCountdown(null);
    router.push("/hrv-pull");
  }, [router, setFaceAnalysis, setFaceSkipped]);

  // Confirm: extract from the captured still frame (not live video), then prove.
  const confirmCapture = useCallback(async () => {
    if (!capturedFrameRef.current || !faceMeshRef.current) {
      setAnalysisError("Captured frame is missing. Please retake the photo.");
      setPhase("error");
      return;
    }
    const frame = capturedFrameRef.current;

    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;
    setPhase("extracting");

    try {
      const MAX_FACE_ATTEMPTS = 3;
      let features: ReturnType<typeof extractStressFeatures> = null;
      for (let attempt = 1; attempt <= MAX_FACE_ATTEMPTS && !features; attempt++) {
        const results = await new Promise<{ multiFaceLandmarks: { x: number; y: number; z: number }[][] }>((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            resultsListenerRef.current = null;
            resolve({ multiFaceLandmarks: [] });
          }, 2500);
          resultsListenerRef.current = (r: { multiFaceLandmarks: { x: number; y: number; z: number }[][] }) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resultsListenerRef.current = null;
            resolve(r);
          };
          faceMeshRef.current!.send({ image: frame }).catch(() => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resultsListenerRef.current = null;
            resolve({ multiFaceLandmarks: [] });
          });
        });
        features = extractStressFeatures(results.multiFaceLandmarks[0]);
        if (!features && attempt < MAX_FACE_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (!features) {
        throw new Error("No face detected in the captured photo. Retake in better light, or continue with a manual check.");
      }

      // Extraction succeeded — release camera.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCapturedImageUrl(null);
      capturedFrameRef.current = null;

      setExtractedFeatures({
        leftEyeAspect: features.leftEyeAspect,
        rightEyeAspect: features.rightEyeAspect,
        browTension: features.browTension,
        mouthTension: features.mouthTension,
        eyeSymmetry: features.eyeSymmetry,
        mouthOpening: features.mouthOpening,
      });

      setPhase("proving");
      const proofResult = await new Promise<ProofResultShape>((resolve, reject) => {
        if (!workerRef.current) return reject(new Error("Worker not initialized"));
        const PROVE_TIMEOUT_MS = 90_000;
        const timer = setTimeout(() => {
          reject(new Error("Proof generation timed out. You can continue without a browser-local proof."));
        }, PROVE_TIMEOUT_MS);
        workerRef.current.onmessage = (event: MessageEvent) => {
          const data = event.data;
          if (data?.type === "prefetch-result") return;
          clearTimeout(timer);
          if (data?.success && (data.proof != null || data.proofHex != null)) {
            resolve(data as ProofResultShape);
          } else {
            reject(new Error(data?.error || "Proof generation failed"));
          }
        };
        workerRef.current.onerror = () => {
          clearTimeout(timer);
          reject(new Error("Proof worker crashed"));
        };
        workerRef.current.postMessage({ features, threshold: 0.5, modelId: "bodydebt-stress-v1" });
      });

      setLastProof(proofResult);
      setPhase("verifying");

      // No real verifiable proof — three distinct outcomes:
      //
      //   1. verifyMode === "mock": ZK system couldn't initialize. The proof
      //      is a deterministic app-level estimate, not a cryptographic
      //      object. Don't try to submit it on-chain (the verifier would
      //      reject it), but DO show the result so the user can keep going.
      //      This is what users see when the server is missing the
      //      pk.key/vk.key/srs.key/settings.json static assets.
      //
      //   2. verifyMode === "failed": a real EZKL proof was generated but
      //      local verify() returned false. This is a genuine VK/PK/circuit
      //      mismatch and should be surfaced as such.
      //
      //   3. verifyMode === "crypto" + missing proofHex/instances: defensive
      //      guard, shouldn't happen for a real proof.
      if (proofResult.verifyMode === "mock") {
        setLocalResult(proofResult, "no-wallet", "ZK system unavailable — using app-level estimate");
        return;
      }
      if (proofResult.verifyMode === "failed" || proofResult.verified !== true ||
          !proofResult.proofHex || !proofResult.publicInstances?.length) {
        setOnChainStatus("failed");
        setLocalResult(proofResult, "failed", "local proof failed cryptographic verification");
        return;
      }

      // Attempt wallet connection
      let connected = isConnected;
      let activeChainId = chainId;
      if (!connected) {
        try {
          const connection = await connectAsync({ connector: injected() });
          connected = true;
          activeChainId = connection.chainId;
        } catch { /* no wallet */ }
      }

      if (!connected) {
        setLocalResult(proofResult, "no-wallet", "local only");
        return;
      }

      // Validate chain
      if (!isCorrectChain(activeChainId)) {
        try {
          await switchChainAsync({ chainId: SKALE_CHAIN_ID });
          activeChainId = SKALE_CHAIN_ID;
        } catch {
          setOnChainStatus("failed");
          setLocalResult(proofResult, "failed", "wrong network");
          return;
        }
      }

      // Validate contract address
      if (isZeroAddress(VERIFIER_CONTRACT_ADDRESS)) {
        setOnChainStatus("failed");
        setLocalResult(proofResult, "failed", "contract not configured");
        return;
      }

      // Submit atomic verify-and-log transaction
      setOnChainStatus("pending");
      try {
        const rawChunks = await fetchVkChunks();
        const vkChunks = rawChunks as readonly Hex[];
        const proofHex = proofResult.proofHex as Hex;
        const instances = proofResult.publicInstances.map((value) => BigInt(value));

        await writeContractAsync({
          address: VERIFIER_CONTRACT_ADDRESS,
          abi: healthCredentialVerifierABI,
          functionName: "verifyAndLogCredential",
          args: [proofHex, instances, vkChunks],
        });
      } catch {
        setOnChainStatus("failed");
        setLocalResult(proofResult, "failed", "on-chain verification failed");
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
      setFaceSkipped(true);
      setFaceAnalysis(null);
      setPhase("error");
    }
  }, [isConnected, chainId, writeContractAsync, connectAsync, switchChainAsync, setFaceAnalysis, setFaceSkipped, setLocalResult]);

  const handleSkip = useCallback(() => {
    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFaceSkipped(true);
    setFaceAnalysis(null);
    setFaceStatus("pending");
    setLightingStatus("pending");
    setBlurStatus("pending");
    setDistanceStatus("pending");
    setCaptureCountdown(null);
    setCapturedImageUrl(null);
    capturedFrameRef.current = null;
    setExtractedFeatures(null);
    router.push("/hrv-pull");
  }, [router, setFaceAnalysis, setFaceSkipped]);

  const retry = useCallback(() => {
    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraError(null);
    setAnalysisError(null);
    setFaceStatus("pending");
    setLightingStatus("pending");
    setBlurStatus("pending");
    setDistanceStatus("pending");
    setCaptureCountdown(null);
    setCapturedImageUrl(null);
    capturedFrameRef.current = null;
    setExtractedFeatures(null);
    setFaceSkipped(false);
    faceLockStartedRef.current = null;
    setGatesRelaxed(false);
    setPhase("prompt");
    startCamera();
  }, [startCamera, setFaceSkipped]);

  const openManualFallback = useCallback(() => {
    detectionCleanupRef.current?.();
    detectionCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhase("mediapipe_error");
  }, []);

  return {
    phase: effectivePhase, setPhase, scanMessageIdx, cameraError, analysisError,
    txHash, lastProof, isConfirmed,
    onChainStatus,
    faceStatus, lightingStatus, blurStatus, distanceStatus, captureCountdown,
    capturedImageUrl, extractedFeatures, gatesRelaxed,
    videoRef, canvasRef, streamRef,
    startCamera, captureAndProve, confirmCapture, retakeCapture, deletePhoto, handleSkip, retry,
    openManualFallback,
  };
}
