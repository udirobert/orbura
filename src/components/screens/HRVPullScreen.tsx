"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, AlertCircle, Activity, Heart, Zap } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { ScreenHeader } from "@/components/ScreenHeader";
import { memory } from "@/lib/sdk/eazo-client";
import { ManualProxy } from "@/components/hrv/ManualProxy";
import { useTerraConnect } from "@/components/hrv/useTerraConnect";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { useStreamingAnalysis } from "@/hooks/useStreamingAnalysis";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { resolveHrv, getGoogleFitData } from "@/lib/api";
import type { HRVData } from "@/lib/types";
import { DEVICE_OPTIONS } from "./hrv-config";
import { GarminUpload } from "./garmin-upload";
import { ConnectedPanel } from "./connected-panel";

// ─── Main screen ──────────────────────────────────────────────────────────────

type Layer = "picker" | "terra" | "google_fit" | "garmin" | "manual" | "connected" | "handoff" | "analyzing";

export function HRVPullScreen() {
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const {
    faceAnalysis,
    agentEvents,
    agentProgress,
    memoryRecall,
  } = useBodyDebtStore();

  const { runAnalysis } = useStreamingAnalysis();
  const { terra, openWidget } = useTerraConnect();
  const [layer, setLayer] = useState<Layer>("picker");
  const [resolvedHrv, setResolvedHrv] = useState<HRVData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Demo mode — pre-populate realistic data on mount
  useEffect(() => {
    if (!isDemoMode) return;
    resolveHrv(undefined, true)
      .then((result) => {
        if (result.hrvData) { setResolvedHrv(result.hrvData); setLayer("connected"); }
      })
      .catch(() => {});
  }, [isDemoMode]);

  // Google Fit — listen for popup postMessage
  useEffect(() => {
    const handler = async (ev: MessageEvent) => {
      if (ev.data?.type !== "GOOGLE_FIT_AUTH") return;
      if (ev.data.status !== "success" || !ev.data.accessToken) {
        setAnalysisError("Google Fit connection failed. Try the manual check-in.");
        setLayer("manual");
        return;
      }
      // Fetch data with the token
      try {
        const result = await getGoogleFitData(ev.data.accessToken);
        if (result.hrvData) { setResolvedHrv(result.hrvData); setLayer("connected"); }
        else { setLayer("manual"); }
      } catch {
        setLayer("manual");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Terra connected → use resolved data
  useEffect(() => {
    if (terra.phase === "connected" && terra.hrvData) {
      const hrvData = terra.hrvData;
      const id = setTimeout(() => {
        setResolvedHrv(hrvData);
        setLayer("connected");
      }, 0);
      return () => clearTimeout(id);
    }
  }, [terra.phase, terra.hrvData]);

  const openGoogleFit = () => {
    const popup = window.open("/api/google-fit/auth", "google_fit_auth", "width=480,height=640,popup=1");
    if (!popup) {
      // Popup blocked — show manual proxy instead, user can still proceed
      setAnalysisError("Popup blocked by your browser. Use the manual check-in below instead.");
      setLayer("manual");
    }
  };

  const handleDeviceSelect = (opt: typeof DEVICE_OPTIONS[number]) => {
    if (opt.layer === "terra") { openWidget(); return; }
    if (opt.id === "fitbit" || opt.id === "android") { openGoogleFit(); return; }
    setLayer(opt.layer);
  };

  const handleManualData = (data: HRVData) => {
    setResolvedHrv(data);
    setLayer("connected");
    memory.reportAction({
      content: "User completed manual HRV check-in.",
      event_type: "create",
      page: "hrv-pull",
      metadata: { type: "manual_hrv", source: "manual_proxy" },
    }).catch(() => {});
  };

  const handleGarminData = (data: HRVData) => {
    setResolvedHrv(data);
    setLayer("connected");
    memory.reportAction({
      content: "User uploaded Garmin CSV data.",
      event_type: "create",
      page: "hrv-pull",
      metadata: { type: "garmin_csv_upload", source: "garmin_export" },
    }).catch(() => {});
  };

  const handleRunAnalysis = useCallback((hrv: HRVData | null, skipped: boolean) => {
    // Brief handoff animation before the full analysis loader takes over
    setLayer("handoff");
    setTimeout(() => {
      setLayer("analyzing");
      runAnalysis(hrv, skipped);
    }, 900);
  }, [runAnalysis]);

  // Reset layer on unmount so the analyzing overlay doesn't reappear on back-nav
  useEffect(() => {
    return () => { setLayer("picker"); };
  }, []);

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "var(--color-bg-base)" }}>

      <ScreenHeader
        back={
          layer === "picker"
            ? { href: "/face-scan", label: "Back" }
            : { onBack: () => setLayer("picker"), label: "Change device" }
        }
        progress={{ current: 5, total: 5 }}
        right={
          <MiniOrb
            score={resolvedHrv ? Math.abs(resolvedHrv.hrvDeltaPercent ?? 0) : 0}
            size={28}
            forming={layer === "analyzing"}
          />
        }
      />

      <AnimatePresence mode="wait">

        {/* ── Device picker ──────────────────────────────────────── */}
        {layer === "picker" && (
          <motion.div key="picker" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="mb-1">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem,5.5vw,1.75rem)", color: "var(--color-text-primary)" }}>
                Your score is ready
              </h2>
              <p className="text-xs mt-1.5" style={{ color: "var(--color-text-faint)" }}>
                Optional: connect a wearable to sharpen the score — or see it now
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRunAnalysis(null, true)}
              className="w-full font-semibold text-sm rounded-2xl mb-1"
              style={{
                backgroundColor: "var(--color-brand-primary)",
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-body)",
                minHeight: "58px",
              }}
            >
              See my debt score
            </motion.button>

            <p
              className="text-[10px] font-mono uppercase tracking-widest text-center mt-3 mb-1"
              style={{ color: "var(--color-text-faint)" }}
            >
              Or sharpen with a wearable
            </p>

            <div className="flex flex-col gap-2.5">
              {DEVICE_OPTIONS.map((opt, i) => (
                <motion.button key={opt.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => handleDeviceSelect(opt)}
                  className="relative w-full rounded-2xl flex items-center text-left"
                  style={{ minHeight: "56px", padding: "12px 16px", backgroundColor: "var(--color-bg-surface)", border: "1.5px solid rgba(168,162,158,0.12)" }}>
                  <span className="text-xl mr-3.5 flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block" style={{ color: "var(--color-text-primary)" }}>{opt.name}</span>
                    <span className="text-[11px] block mt-0.5" style={{ color: opt.note ? "var(--color-text-faint)" : "var(--color-text-disabled)" }}>
                      {opt.note ?? opt.sub}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" style={{ color: "var(--color-text-disabled)" }} />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Garmin CSV ─────────────────────────────────────────── */}
        {layer === "garmin" && (
          <motion.div key="garmin" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            <GarminUpload onData={handleGarminData} onSkip={() => setLayer("manual")} />
          </motion.div>
        )}

        {/* ── Manual proxy ───────────────────────────────────────── */}
        {layer === "manual" && (
          <motion.div key="manual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            <ManualProxy onComplete={handleManualData} />
          </motion.div>
        )}

        {/* ── Connected / result ─────────────────────────────────── */}
        {layer === "connected" && resolvedHrv && (
          <motion.div key="connected" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col pb-10">
            {analysisError && (
              <div className="rounded-2xl p-4 mb-4 flex items-start gap-3"
                style={{ backgroundColor: "rgba(127,29,29,0.18)", border: "1.5px solid rgba(220,38,38,0.3)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-states-error)" }} />
                <div>
                  <p className="text-xs" style={{ color: "#fca5a5" }}>{analysisError}</p>
                  <button onClick={() => setAnalysisError(null)} className="text-[10px] mt-1 font-semibold" style={{ color: "var(--color-states-error)" }}>Dismiss</button>
                </div>
              </div>
            )}
            <ConnectedPanel data={resolvedHrv} onContinue={() => handleRunAnalysis(resolvedHrv, false)} />
          </motion.div>
        )}

        {/* ── Handoff transition (connected → analyzing morph) ───── */}
        {layer === "handoff" && resolvedHrv && (
          <motion.div
            key="handoff"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col items-center justify-center pb-10"
          >
            {/* Shrinking delta bar that morphs into the orb */}
            <motion.div
              initial={{ width: "100%", opacity: 1 }}
              animate={{ width: "0%", opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute top-1/3 left-5 right-5 h-1 rounded-full"
              style={{ backgroundColor: "var(--color-brand-primary)" }}
            />

            {/* Orb heats up */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative w-20 h-20 mb-6"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ border: "1.5px solid rgba(234,88,12,0.3)" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                animate={{
                  background: [
                    "radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 60%, #1a0800 100%)",
                    "radial-gradient(circle at 40% 35%, #EA580C, #DC2626 60%, #0A0A0B 100%)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ boxShadow: "0 0 30px 6px rgba(234,88,12,0.25)" }}
              />
            </motion.div>

            {/* Context-aware message */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center px-6"
            >
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Handing off to analysis
              </p>
              <motion.p
                className="text-[10px] mt-1 leading-relaxed"
                style={{ color: "var(--color-text-faint)" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {resolvedHrv.hrvDeltaPercent != null
                  ? `Factoring ${resolvedHrv.hrvDeltaPercent > 0 ? "+" : ""}${resolvedHrv.hrvDeltaPercent}% HRV delta into your body systems…`
                  : "Preparing your personalized analysis…"}
              </motion.p>
            </motion.div>

            {/* Signal dots — appearing in sequence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mt-5"
            >
              {[
                { icon: <Activity className="w-3 h-3" />, label: "Stressors", done: true },
                { icon: <Heart className="w-3 h-3" />, label: "HRV", done: true },
                { icon: <Zap className="w-3 h-3" />, label: "Algorithms", done: false },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.12 }}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: s.done
                      ? "rgba(74,222,128,0.08)"
                      : "rgba(234,88,12,0.08)",
                    border: `1px solid ${
                      s.done
                        ? "rgba(74,222,128,0.2)"
                        : "rgba(234,88,12,0.2)"
                    }`,
                  }}
                >
                  <span
                    className="flex-shrink-0"
                    style={{ color: s.done ? "var(--color-states-success)" : "var(--color-brand-primary)" }}
                  >
                    {s.icon}
                  </span>
                  <span
                    className="text-[8px] font-mono uppercase tracking-wider"
                    style={{ color: s.done ? "var(--color-states-success)" : "var(--color-text-faint)" }}
                  >
                    {s.label}
                  </span>
                  {s.done && (
                    <span className="text-[8px]" style={{ color: "var(--color-states-success)" }}>✓</span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Analyzing ──────────────────────────────────────────── */}
        {layer === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50">
            <AnalysisLoader
              hasFaceScan={!!faceAnalysis}
              hasHRV={!!resolvedHrv}
              hrvContext={resolvedHrv ? {
                deltaPercent: resolvedHrv.hrvDeltaPercent ?? 0,
                source: resolvedHrv.source ?? "manual_proxy",
              } : undefined}
              agentEvents={agentEvents}
              agentProgress={agentProgress}
              memoryRecall={memoryRecall}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
