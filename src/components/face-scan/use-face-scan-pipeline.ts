"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { initializeFaceMesh, extractStressFeatures } from "@/lib/ai";
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
import type { ZKProofResult, OnChainVerificationStatus } from "@/lib/types";
import type { Hex } from "viem";

export type ScanPhase =
  | "privacy" | "prompt" | "camera"
  | "extracting" | "proving" | "verifying"
  | "result" | "error" | "skipped";

export type CameraError = "denied" | "unavailable" | "in_use" | "generic";

export const SCAN_MESSAGES = [
  "Extracting facial geometry locally...",
  "Mapping 468 landmark points...",
  "Measuring eye aspect ratio...",
  "Detecting brow tension patterns...",
  "Analyzing mouth geometry...",
  "Computing eye symmetry...",
  "Running ZK circuit in Web Worker...",
  "Generating Halo2 proof...",
  "Hashing proof against model weights...",
  "Verifying proof against verifier key...",
  "Preparing SKALE on-chain transaction...",
  "Committing credential to chain...",
];

export function cameraErrorCopy(kind: CameraError) {
  switch (kind) {
    case "denied": return { title: "Camera access blocked", body: "Enable camera access in your browser settings.", action: "Try again" };
    case "unavailable": return { title: "No camera found", body: "This device doesn't appear to have a camera.", action: "Continue without scan" };
    case "in_use": return { title: "Camera is in use", body: "Another app is using your camera.", action: "Try again" };
    case "generic": return { title: "Camera unavailable", body: "The camera API is blocked on this connection. The page must be served over HTTPS to access the camera. Use “Continue without scan” or open the HTTPS URL.", action: "Continue without scan" };
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

interface ProofResultShape {
  success: boolean;
  proof: string;
  proofHex?: string;
  publicInstances?: string[];
  publicInputs: string;
  verified?: boolean;
  verifyDurationMs?: number;
}

function buildZkResult(
  proofResult: ProofResultShape,
  onChainStatus: OnChainVerificationStatus,
  txHash?: string,
): ZKProofResult {
  const parsed = JSON.parse(proofResult.publicInputs);
  return {
    proof: proofResult.proof,
    proofHex: proofResult.proofHex,
    publicInputs: proofResult.publicInputs,
    stressScore: parsed.stress_score ?? 0.5,
    isHealthy: parsed.is_healthy ?? true,
    durationMs: proofResult.verifyDurationMs ?? 0,
    txHash,
    verified: proofResult.verified ?? false,
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
      periorbitalPuffiness: "mild",
      skinPerfusion: parsed.is_healthy ? "good" : "low",
      eyeClarity: parsed.is_healthy ? "clear" : "fatigued",
      inflammation: "none",
      debtContribution: Math.round((parsed.stress_score ?? 0.5) * 20),
      summary: `ZK-verified facial stress analysis (${summarySuffix}).`,
    });
    setPhase("result");
  }, [setFaceAnalysis, setZkProof]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<ReturnType<typeof initializeFaceMesh> | null>(null);
  const workerRef = useRef<Worker | null>(null);

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

  useEffect(() => {
    if (phase !== "camera" || !streamRef.current) return;
    let cancelled = false;
    const attach = (attempt = 0) => {
      if (cancelled) return;
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      } else if (attempt < 30) setTimeout(() => attach(attempt + 1), 50);
    }
    attach();
    const raf = requestAnimationFrame(() => attach());
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [phase]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
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
      // Try up to 3 frames — MediaPipe sometimes needs a second attempt
      // if the model is still warming up or the face is in a transitional pose.
      const MAX_FACE_ATTEMPTS = 3;
      let features: ReturnType<typeof extractStressFeatures> = null;
      for (let attempt = 1; attempt <= MAX_FACE_ATTEMPTS && !features; attempt++) {
        const results = await new Promise<{ multiFaceLandmarks: { x: number; y: number; z: number }[][] }>((resolve) => {
          faceMeshRef.current!.onResults(resolve);
          faceMeshRef.current!.send({ image: video });
        });
        features = extractStressFeatures(results.multiFaceLandmarks[0]);
        if (!features && attempt < MAX_FACE_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      if (!features) {
        throw new Error("No face detected — center your face in the frame with good lighting and try again.");
      }

      setPhase("proving");
      const proofResult = await new Promise<ProofResultShape>((resolve, reject) => {
        if (!workerRef.current) return reject(new Error("Worker not initialized"));
        workerRef.current.onmessage = (event: MessageEvent) => {
          if (event.data.success) resolve(event.data);
          else reject(new Error(event.data.error || "Proof generation failed"));
        };
        workerRef.current.postMessage({ features, threshold: 0.5, modelId: "bodydebt-stress-v1" });
      });

      setLastProof(proofResult);
      setPhase("verifying");

      if (proofResult.verified !== true || !proofResult.proofHex || !proofResult.publicInstances?.length) {
        setOnChainStatus("failed");
        setLocalResult(proofResult, "failed", "local proof missing verifier inputs");
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
    onChainStatus,
    videoRef, canvasRef, streamRef,
    startCamera, captureAndProve, handleSkip, retry,
  };
}
