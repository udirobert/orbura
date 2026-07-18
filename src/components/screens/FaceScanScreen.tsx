"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertTriangle, ShieldCheck, Loader2, Check, RotateCcw, Trash2 } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { memory } from "@/lib/sdk/eazo-client";
import { PrivacyNotice } from "@/components/face-scan/PrivacyNotice";
import { PrivacyBadge } from "@/components/face-scan/PrivacyBadge";
import {
  useFaceScanPipeline,
  cameraErrorCopy,
  SCAN_MESSAGES,
} from "@/components/face-scan/use-face-scan-pipeline";
import { ScanResult } from "@/components/face-scan/scan-result";
import { FaceScanFallback } from "@/components/face-scan/FaceScanFallback";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getOrbCopy } from "@/lib/orbPersonality";

export function FaceScanScreen() {
  const {
    phase, scanMessageIdx, cameraError, analysisError,
    faceStatus, lightingStatus, blurStatus, distanceStatus, captureCountdown,
    capturedImageUrl, extractedFeatures, gatesRelaxed,
    txHash, isConfirmed,
    onChainStatus,
    videoRef, canvasRef, streamRef,
    startCamera, captureAndProve, confirmCapture, retakeCapture, deletePhoto, handleSkip, retry,
    openManualFallback,
  } = useFaceScanPipeline();
  const router = useRouter();
  const { setFaceAnalysis } = useBodyDebtStore();
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
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <ScreenHeader
        back={{ href: "/context-deepener", label: "Back" }}
        progress={{ current: 4, total: 5, optional: true }}
        right={
          <MiniOrb
            score={phase === "result" ? 10 : 0}
            size={28}
            forming={isProcessing}
          />
        }
      />

      {/* Persistent privacy badge — visible during all active scan phases.
          Floats below the header so it's always in the user's peripheral
          vision. Adapts copy per phase to reinforce the current data state. */}
      {(phase === "camera" || phase === "review" || isProcessing || phase === "result") && (
        <div className="relative z-20 flex justify-center mb-2">
          <PrivacyBadge phase={phase} />
        </div>
      )}

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
              startCamera();
            }} onDecline={handleSkip} />
          </motion.div>
        )}

        {phase === "prompt" && (
          <motion.div key="prompt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col">
            <div className="text-center px-4 mb-6">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem, 5.5vw, 1.75rem)", color: "var(--color-text-primary)" }}>
                {personalityCopy.scanPrompt}
              </h2>
              <p className="text-xs mt-1.5 flex items-center justify-center gap-1.5" style={{ color: "var(--color-text-faint)" }}>
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Optional · processed in this browser
              </p>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-2xl flex items-center justify-center mb-6"
              style={{ aspectRatio: "4/5", backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.12)" }}>
              <div className="flex flex-col items-center gap-3">
                <Camera className="w-10 h-10 opacity-20" style={{ color: "var(--color-text-secondary)" }} />
                <p className="text-xs" style={{ color: "var(--color-text-disabled)" }}>Camera opens on this screen</p>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3 pb-10">
              <PrimaryButton size="lg" onClick={startCamera}>
                <div className="font-bold text-base mb-0.5">Open camera</div>
                <div className="text-[10px] font-normal opacity-80">Image stays in browser · skip anytime</div>
              </PrimaryButton>
              <button onClick={handleSkip} className="w-full text-center text-[13px] py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Skip — continue without scan
              </button>
            </div>
          </motion.div>
        )}

        {phase === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col">
            <div className="relative mx-auto w-full max-w-xs rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: "4/5" }}>
              <video ref={(el) => { videoRef.current = el; if (el && streamRef.current) { el.srcObject = streamRef.current; el.play().catch(() => {}); } }}
                autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              <canvas ref={canvasRef} className="hidden" />
              {/* "Not recording" indicator — a small, always-on badge in
                  the corner of the video preview. Counters the instinct
                  to worry that the camera is recording. */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ backgroundColor: "rgba(10,10,11,0.6)", backdropFilter: "blur(4px)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
                  Live · not recording
                </span>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <motion.div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid rgba(16, 185, 129, 0.3)" }}
                  animate={{ scale: [1, 1.025, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              {/* Face-position guide oval — dashed, where the user should put their face */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 125" preserveAspectRatio="none">
                <ellipse
                  cx="50" cy="55" rx="28" ry="38"
                  fill="none"
                  stroke={faceStatus === "detected" ? "rgba(74,222,128,0.7)" : "rgba(234,88,12,0.7)"}
                  strokeWidth="0.6"
                  strokeDasharray="2.5 1.8"
                />
              </svg>
              {/* 3-2-1 countdown overlay while the user is being asked to hold still */}
              {captureCountdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    key={captureCountdown}
                    initial={{ opacity: 0, scale: 1.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.25 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(10,10,11,0.75)", border: "2px solid rgba(74,222,128,0.5)" }}
                  >
                    <span className="text-3xl font-bold" style={{ color: "var(--color-states-success)", fontFamily: "var(--font-heading)" }}>
                      {captureCountdown}
                    </span>
                  </motion.div>
                </div>
              )}
            </div>
            {/* Single status line — prioritises the most important issue so we
                don't stack four lines. Order: position → distance → lighting →
                blur. When everything is OK, show the success state. */}
            <div className="flex items-center justify-center mb-5" style={{ minHeight: 32 }}>
            {(() => {
              if (faceStatus !== "detected") {
                return (
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest text-center px-6"
                    style={{ color: "var(--color-states-warning)", minHeight: 28 }}
                  >
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      Center your face in the oval
                    </motion.span>
                  </span>
                );
              }
              if (distanceStatus === "too_far") {
                return (
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
                    Move closer to the camera
                  </span>
                );
              }
              if (distanceStatus === "too_close") {
                return (
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
                    Move back from the camera
                  </span>
                );
              }
              if (lightingStatus === "dark") {
                return (
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
                    Too dark — face a light source
                  </span>
                );
              }
              if (lightingStatus === "bright") {
                return (
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
                    Too bright — back away from the light
                  </span>
                );
              }
              if (blurStatus === "blurry") {
                return (
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-warning)" }}>
                    Hold camera stiller
                  </span>
                );
              }
              // captureReady === true
              return (
                <motion.span
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: "var(--color-states-success)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
                  Face in position · ready to capture
                </motion.span>
              );
            })()}
            </div>
            <div className="mt-auto flex flex-col gap-3 pb-10">
              <PrimaryButton
                onClick={captureAndProve}
                disabled={(() => {
                  if (captureCountdown !== null) return true;
                  if (faceStatus !== "detected") return true;
                  if (gatesRelaxed) return false;
                  if (distanceStatus !== "ok") return true;
                  if (lightingStatus !== "ok") return true;
                  if (blurStatus === "blurry") return true;
                  return false;
                })()}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {captureCountdown !== null
                    ? `Hold still… ${captureCountdown}`
                    : faceStatus !== "detected"
                      ? "Looking for face…"
                      : (gatesRelaxed ||
                         (distanceStatus === "ok" &&
                          lightingStatus === "ok" &&
                          blurStatus !== "blurry"))
                        ? gatesRelaxed &&
                          (distanceStatus !== "ok" ||
                            lightingStatus !== "ok" ||
                            blurStatus === "blurry")
                          ? "Capture anyway"
                          : "Capture"
                        : "Adjust to continue"}
                </span>
              </PrimaryButton>
              {gatesRelaxed && faceStatus === "detected" && (
                <p className="text-[9px] text-center font-mono" style={{ color: "var(--color-text-faint)" }}>
                  Face locked — you can capture even if lighting is imperfect
                </p>
              )}
              <button
                onClick={handleSkip}
                className="w-full text-center text-[13px] py-2.5 font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Skip — continue without scan
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Review phase: show captured photo, retake or confirm ── */}
        {phase === "review" && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col">
            <div className="text-center px-4 mb-4">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.3rem, 5vw, 1.6rem)", color: "var(--color-text-primary)" }}>
                Does this look right?
              </h2>
              <p className="text-xs mt-1.5" style={{ color: "var(--color-text-faint)" }}>
                Your face was captured. Retake if it&apos;s blurry or misaligned.
              </p>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: "4/5", border: "1px solid rgba(168,162,158,0.12)" }}>
              {capturedImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedImageUrl} alt="Captured face" className="w-full h-full object-cover" />
              )}
            </div>
            {/* Memory nudge — reassures the user that the photo is
                temporary and will be purged. Small, factual, not
                alarmist. */}
            <div className="mx-auto w-full max-w-xs mb-4 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.12)" }}>
              <ShieldCheck className="w-3 h-3 flex-shrink-0" style={{ color: "var(--color-states-success)" }} />
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                This photo exists only in this browser&apos;s temporary memory. It&apos;s deleted when you continue or leave this page.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5 pb-10">
              <PrimaryButton size="lg" onClick={confirmCapture}>
                <span className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Use this photo
                </span>
              </PrimaryButton>
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={retakeCapture}
                className="w-full font-semibold text-sm rounded-2xl flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-primary)", border: "1px solid rgba(168,162,158,0.2)", minHeight: "52px" }}>
                <RotateCcw className="w-4 h-4" />
                Retake photo
              </motion.button>
              {/* Delete — distinct from retake. This means "I don't
                  want to do this at all." Purges the photo and exits
                  to the next step in the intake flow. */}
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={deletePhoto}
                className="w-full text-sm rounded-2xl flex items-center justify-center gap-2 py-2.5"
                style={{ color: "var(--color-text-faint)", border: "1px solid rgba(168,162,158,0.08)" }}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete photo & skip
              </motion.button>
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
                  className="text-center text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                  {SCAN_MESSAGES[scanMessageIdx]}
                </motion.p>
              </div>
              <div className="rounded-2xl p-4 w-full" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <p className="text-[10px] text-center flex items-center justify-center gap-1.5" style={{ color: "var(--color-states-success)" }}>
                  <ShieldCheck className="w-3 h-3" /> Still in this browser · photo clears when done
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── MediaPipe fallback: manual self-assessment ────────────── */}
        {phase === "mediapipe_error" && (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col"
          >
            <FaceScanFallback
              onSubmit={(result) => {
                setFaceAnalysis(result);
                // Cleanup camera tracks before navigating
                streamRef.current?.getTracks().forEach((t) => t.stop());
                // Navigate without clearing the analysis — handleSkip
                // would overwrite it with null, so we navigate directly.
                router.push("/hrv-pull");
              }}
              onSkip={handleSkip}
            />
          </motion.div>
        )}

        {(phase === "result" || isConfirmed) && (
          <ScanResult txHash={txHash} onChainStatus={onChainStatus} extractedFeatures={extractedFeatures} />
        )}

        {phase === "error" && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(127,29,29,0.12)", border: "1.5px solid rgba(220,38,38,0.28)" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--color-states-error)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
                    {errorCopy?.title ?? (analysisError ? "Face analysis failed" : "Something went wrong")}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {errorCopy?.body ?? analysisError ?? "An unexpected error occurred."}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-3">
              {!isFinalError && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={retry}
                  className="w-full font-semibold text-sm rounded-2xl"
                  style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-primary)", border: "1px solid rgba(168,162,158,0.2)", minHeight: "52px" }}>
                  {errorCopy?.action ?? "Try again"}
                </motion.button>
              )}
              {analysisError && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={openManualFallback}
                  className="w-full font-semibold text-sm rounded-2xl"
                  style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-primary)", border: "1px solid rgba(168,162,158,0.2)", minHeight: "52px" }}>
                  Use manual self-assessment
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
