"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { initializeFaceMesh, extractStressFeatures } from "@/lib/ai";
import { healthCredentialVerifierABI, VERIFIER_CONTRACT_ADDRESS } from "@/lib/blockchain";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from "wagmi";
import { injected } from "wagmi";
import { keccak256, toHex } from "viem";
import type { ZKProofResult } from "@/lib/types";

export type ScanPhase =
  | "privacy" | "prompt" | "camera"
  | "extracting" | "proving" | "verifying"
  | "result" | "error" | "skipped";

export type CameraError = "denied" | "unavailable" | "in_use" | "generic";

export const SCAN_MESSAGES = [
  "Extracting facial geometry locally...",
  "Computing eye aspect ratio...",
  "Measuring brow tension...",
  "Running Zero-Knowledge proof circuit...",
];

export function cameraErrorCopy(kind: CameraError) {
  switch (kind) {
    case "denied": return { title: "Camera access blocked", body: "Enable camera access in your browser settings.", action: "Try again" };
    case "unavailable": return { title: "No camera found", body: "This device doesn't appear to have a camera.", action: "Continue without scan" };
    case "in_use": return { title: "Camera is in use", body: "Another app is using your camera.", action: "Try again" };
    default: return { title: "Camera unavailable", body: "Something prevented the camera from opening.", action: "Try again" };
  }
}

function classifyError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") return "denied";
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") return "unavailable";
    if (err.name === "NotReadableError" || err.name === "TrackStartError") return "in_use";
  }
  return "generic";
}

export function useFaceScanPipeline() {
  const router = useRouter();
  const { setFaceAnalysis, setFaceSkipped, setZkProof } = useBodyDebtStore();

  const [phase, setPhase] = useState<ScanPhase>("privacy");
  const [scanMessageIdx, setScanMessageIdx] = useState(0);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastProof, setLastProof] = useState<{ proof: string; publicInputs: string; durationMs: number } | null>(null);

  const { isConnected, address } = useAccount();
  const { connectAsync } = useConnect();
  const { data: txHash, writeContract } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Derive result phase from tx confirmation instead of setting it in an effect
  const confirmedHandledRef = useRef(false);
  const effectivePhase: ScanPhase = (isConfirmed && phase === "verifying") ? "result" : phase;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<ReturnType<typeof initializeFaceMesh> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !workerRef.current) {
      workerRef.current = new Worker(new URL("@/workers/ezkl-prover.worker.ts", import.meta.url));
      // Prefetch ZK artifacts (164MB pk.key, 16MB srs.key) in the background
      // during the privacy/prompt phase so they're cached by the time the
      // user captures and triggers proof generation.
      workerRef.current.postMessage({ type: "prefetch" });
    }
    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (phase !== "extracting" && phase !== "proving" && phase !== "verifying") return;
    const iv = setInterval(() => setScanMessageIdx((i) => (i + 1) % SCAN_MESSAGES.length), 1200);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase !== "camera" || !streamRef.current) return;
    let cancelled = false;
    const attach = (attempt = 0) => {
      if (cancelled) return;
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      } else if (attempt < 30) setTimeout(() => attach(attempt + 1), 50);
    };
    attach();
    const raf = requestAnimationFrame(() => attach());
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [phase]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    if (!isConfirmed || phase !== "verifying" || !lastProof || confirmedHandledRef.current) return;
    confirmedHandledRef.current = true;
    const parsed = JSON.parse(lastProof.publicInputs);
    const zkResult: ZKProofResult = {
      proof: lastProof.proof,
      publicInputs: lastProof.publicInputs,
      stressScore: parsed.stress_score ?? 0.5,
      isHealthy: parsed.is_healthy ?? true,
      durationMs: lastProof.durationMs,
      txHash: txHash as string,
      verified: true,
    };
    setZkProof(zkResult);
    setFaceAnalysis({
      periorbitalPuffiness: "mild",
      skinPerfusion: parsed.is_healthy ? "good" : "low",
      eyeClarity: parsed.is_healthy ? "clear" : "fatigued",
      inflammation: "none",
      debtContribution: Math.round((parsed.stress_score ?? 0.5) * 20),
      summary: "ZK-verified facial stress analysis completed.",
    });
  }, [isConfirmed, phase, lastProof, txHash, setZkProof, setFaceAnalysis]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
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
      faceMeshRef.current = initializeFaceMesh(() => {});
      setPhase("camera");
    } catch (err) {
      setCameraError(classifyError(err));
      setPhase("error");
    }
  }, []);

  const captureAndProve = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceMeshRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setPhase("error"); return; }
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("extracting");

    try {
      const results = await new Promise<{ multiFaceLandmarks: { x: number; y: number; z: number }[][] }>((resolve) => {
        faceMeshRef.current!.onResults(resolve);
        faceMeshRef.current!.send({ image: video });
      });
      const features = extractStressFeatures(results.multiFaceLandmarks[0]);
      if (!features) throw new Error("Failed to extract facial features");

      setPhase("proving");
      const proofResult = await new Promise<{ success: boolean; proof: string; publicInputs: string }>((resolve, reject) => {
        if (!workerRef.current) return reject(new Error("Worker not initialized"));
        workerRef.current.onmessage = (event: MessageEvent) => {
          if (event.data.success) resolve(event.data);
          else reject(new Error(event.data.error || "Proof generation failed"));
        };
        workerRef.current.postMessage({ features, threshold: 0.5, modelId: "bodydebt-stress-v1" });
      });

      setLastProof({ proof: proofResult.proof, publicInputs: proofResult.publicInputs, durationMs: 0 });
      setPhase("verifying");
      const proofHash = keccak256(toHex(proofResult.proof));

      let connected = isConnected;
      if (!connected) {
        try {
          await connectAsync({ connector: injected() });
          connected = true;
        } catch { /* no wallet */ }
      }

      if (!connected) {
        const parsed = JSON.parse(proofResult.publicInputs);
        const zkResult: ZKProofResult = {
          proof: proofResult.proof,
          publicInputs: proofResult.publicInputs,
          stressScore: parsed.stress_score ?? 0.5,
          isHealthy: parsed.is_healthy ?? true,
          durationMs: 0,
          verified: false,
        };
        setZkProof(zkResult);
        setFaceAnalysis({
          periorbitalPuffiness: "mild",
          skinPerfusion: parsed.is_healthy ? "good" : "low",
          eyeClarity: parsed.is_healthy ? "clear" : "fatigued",
          inflammation: "none",
          debtContribution: Math.round((parsed.stress_score ?? 0.5) * 20),
          summary: "ZK-verified facial stress analysis (local only).",
        });
        setPhase("result");
        return;
      }

      const parsed = JSON.parse(proofResult.publicInputs);
      writeContract({
        address: VERIFIER_CONTRACT_ADDRESS,
        abi: healthCredentialVerifierABI,
        functionName: "verifyAndLogCredential",
        args: [address!, "bodydebt-stress-v1", parsed.is_healthy ?? true, proofHash, "zk://bodydebt-stress-v1"],
      });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
      setFaceSkipped(true);
      setFaceAnalysis(null);
      setPhase("error");
    }
  }, [isConnected, address, writeContract, connectAsync, setFaceAnalysis, setFaceSkipped, setZkProof]);

  const handleSkip = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFaceSkipped(true);
    setFaceAnalysis(null);
    router.push("/hrv-pull");
  }, [router, setFaceAnalysis, setFaceSkipped]);

  const retry = useCallback(() => {
    setCameraError(null);
    setAnalysisError(null);
    setPhase("prompt");
    startCamera();
  }, [startCamera]);

  return {
    phase: effectivePhase, setPhase, scanMessageIdx, cameraError, analysisError,
    txHash, lastProof, isConfirmed,
    videoRef, canvasRef, streamRef,
    startCamera, captureAndProve, handleSkip, retry,
  };
}
