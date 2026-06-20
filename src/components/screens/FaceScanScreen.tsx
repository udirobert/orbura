"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { memory } from "@/lib/sdk/eazo-client";
import { PrivacyNotice } from "@/components/face-scan/PrivacyNotice";
import {
  useFaceScanPipeline,
  cameraErrorCopy,
  SCAN_MESSAGES,
} from "@/components/face-scan/use-face-scan-pipeline";
import { ScanResult } from "@/components/face-scan/scan-result";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getOrbCopy } from "@/lib/orbPersonality";

export function FaceScanScreen() {
  const {
    phase, setPhase, scanMessageIdx, cameraError, analysisError,
    txHash, isConfirmed,
    onChainStatus,
    videoRef, canvasRef, streamRef,
    startCamera, captureAndProve, handleSkip, retry,
  } = useFaceScanPipeline();
  const { orbPersonality } = useBodyDebtStore();
  const personalityCopy = getOrbCopy(orbPersonality);

  const errorCopy = cameraError ? cameraErrorCopy(cameraError) : null;
  const isFinalError = phase === "error" && cameraError === "unavailable";
  const isProcessing = phase === "extracting" || phase === "proving" || phase === "verifying";

  // Report face scan completion once
  const reportedScan = useRef(false);
  useEffect(() => {
    if ((phase === "result" || isConfirmed) && !reportedScan.current) {
      reportedScan.current = true;
      memory.reportAction({
        content: "Face scan completed successfully with zero-knowledge proof.",
        event_type: "create",
        page: "face-scan",
        metadata: { type: "face_scan_complete", tx_hash: txHash },
      }).catch(() => {});
    }
  }, [phase, isConfirmed, txHash]);

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>
      <ScreenHeader
        back={{ href: "/context-deepener", label: "Back" }}
        progress={{ current: 4, total: 5 }}
        right={
          <MiniOrb
            score={phase === "result" ? 10 : 0}
            size={28}
            forming={isProcessing}
          />
        }
      />

      <AnimatePresence mode="sync">
        {phase === "privacy" && (
          <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col justify-between pb-10">
            <PrivacyNotice onAccept={() => {
              memory.reportAction({
                content: "User accepted face scan privacy notice.",
                event_type: "start",
                page: "face-scan",
                metadata: { type: "accept_privacy" },
              }).catch(() => {});
              setPhase("prompt");
            }} onDecline={handleSkip} />
          </motion.div>
        )}

        {phase === "prompt" && (
          <motion.div key="prompt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col">
            <div className="text-center px-4 mb-6">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 5.5vw, 1.75rem)", color: "#F5F5F4" }}>
                {personalityCopy.scanPrompt}
              </h2>
              <p className="text-xs mt-1.5 flex items-center justify-center gap-1.5" style={{ color: "#524F4C" }}>
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Processed entirely on your device
              </p>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-2xl flex items-center justify-center mb-6"
              style={{ aspectRatio: "4/5", backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.12)" }}>
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-10 h-10 opacity-20" style={{ color: "#A8A29E" }} />
                <p className="text-xs" style={{ color: "#3a3835" }}>Camera will open here</p>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3 pb-10">
              <PrimaryButton size="lg" onClick={startCamera}>
                <div className="font-bold text-base mb-0.5">Open camera</div>
                <div className="text-[10px] font-normal opacity-80">Zero-knowledge edge verification</div>
              </PrimaryButton>
              <button onClick={handleSkip} className="w-full text-center text-[11px] py-2.5 font-medium" style={{ color: "#524F4C" }}>
                Skip this step
              </button>
            </div>
          </motion.div>
        )}

        {phase === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col">
            <div className="relative mx-auto w-full max-w-xs rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: "4/5" }}>
              <video ref={(el) => { videoRef.current = el; if (el && streamRef.current) { el.srcObject = streamRef.current; el.play().catch(() => {}); } }}
                autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 pointer-events-none">
                <motion.div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid rgba(16, 185, 129, 0.3)" }}
                  animate={{ scale: [1, 1.025, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3 pb-10">
              <PrimaryButton onClick={captureAndProve}>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Capture &amp; Prove
                </span>
              </PrimaryButton>
            </div>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 pb-10">
            <MiniOrb score={30} size={80} forming />
            <div className="w-full space-y-4 max-w-xs">
              <div className="flex items-center gap-3 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <motion.p key={scanMessageIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center text-xs font-mono" style={{ color: "#A8A29E" }}>
                  {SCAN_MESSAGES[scanMessageIdx]}
                </motion.p>
              </div>
              <div className="rounded-2xl p-4 w-full" style={{ backgroundColor: "#141416", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <p className="text-[10px] text-center flex items-center justify-center gap-1.5" style={{ color: "#10B981" }}>
                  <ShieldCheck className="w-3 h-3" /> Raw biometric data never leaves this device
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {(phase === "result" || isConfirmed) && (
          <ScanResult txHash={txHash} onChainStatus={onChainStatus} />
        )}

        {phase === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(127,29,29,0.12)", border: "1.5px solid rgba(220,38,38,0.28)" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>{errorCopy?.title ?? analysisError ?? "Something went wrong"}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#A8A29E" }}>{errorCopy?.body ?? "An unexpected error occurred."}</p>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {!isFinalError && (
                <motion.button whileTap={{ scale: 0.98 }} onClick={retry}
                  className="w-full font-semibold text-sm rounded-2xl"
                  style={{ backgroundColor: "#141416", color: "#F5F5F4", border: "1px solid rgba(168,162,158,0.2)", minHeight: "52px" }}>
                  {errorCopy?.action ?? "Try again"}
                </motion.button>
              )}
              <PrimaryButton onClick={handleSkip}>
                Continue without face scan
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
