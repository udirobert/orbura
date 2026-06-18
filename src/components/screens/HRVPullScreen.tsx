"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { MiniOrb } from "@/components/MiniOrb";
import { memory } from "@eazo/sdk";
import { ProgressBar } from "@/components/ProgressBar";
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

type Layer = "picker" | "terra" | "google_fit" | "garmin" | "manual" | "connected" | "analyzing";

export function HRVPullScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const {
    faceAnalysis,
    agentEvents,
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
    setLayer("analyzing");
    runAnalysis(hrv, skipped);
  }, [runAnalysis]);

  // Reset layer on unmount so the analyzing overlay doesn't reappear on back-nav
  useEffect(() => {
    return () => { setLayer("picker"); };
  }, []);

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden" style={{ backgroundColor: "#0A0A0B" }}>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button onClick={() => layer === "picker" ? router.push("/face-scan") : setLayer("picker")}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "#A8A29E", minHeight: "44px" }}>
          <ChevronLeft className="w-4 h-4" />
          {layer === "picker" ? "Back" : "Change device"}
        </button>
        <MiniOrb score={resolvedHrv ? Math.abs(resolvedHrv.hrvDeltaPercent ?? 0) : 0} size={28} forming={layer === "analyzing"} />
      </div>

      <div className="relative z-10 pt-3 pb-4">
        <ProgressBar current={5} total={5} />
      </div>

      <AnimatePresence mode="wait">

        {/* ── Device picker ──────────────────────────────────────── */}
        {layer === "picker" && (
          <motion.div key="picker" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 flex-1 flex flex-col gap-4 pb-10">
            <div className="mb-1">
              <h2 className="font-normal leading-snug" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.4rem,5.5vw,1.75rem)", color: "#F5F5F4" }}>
                Your watch knows things I don&apos;t.
              </h2>
              <p className="text-xs mt-1.5" style={{ color: "#524F4C" }}>
                Connect for a more accurate score — or answer a quick check-in
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {DEVICE_OPTIONS.map((opt, i) => (
                <motion.button key={opt.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => handleDeviceSelect(opt)}
                  className="relative w-full rounded-2xl flex items-center text-left"
                  style={{ minHeight: "64px", padding: "14px 16px", backgroundColor: "#141416", border: "1.5px solid rgba(168,162,158,0.12)" }}>
                  <span className="text-xl mr-3.5 flex-shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block" style={{ color: "#F5F5F4" }}>{opt.name}</span>
                    <span className="text-[11px] block mt-0.5" style={{ color: opt.note ? "#524F4C" : "#3a3835" }}>
                      {opt.note ?? opt.sub}
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" style={{ color: "#3a3835" }} />
                </motion.button>
              ))}
            </div>

            <button onClick={() => handleRunAnalysis(null, true)}
              className="w-full text-center text-[11px] py-2.5 font-medium" style={{ color: "#524F4C" }}>
              Skip all — use fewer data points
            </button>
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
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#DC2626" }} />
                <div>
                  <p className="text-xs" style={{ color: "#fca5a5" }}>{analysisError}</p>
                  <button onClick={() => setAnalysisError(null)} className="text-[10px] mt-1 font-semibold" style={{ color: "#DC2626" }}>Dismiss</button>
                </div>
              </div>
            )}
            <ConnectedPanel data={resolvedHrv} onContinue={() => handleRunAnalysis(resolvedHrv, false)} />
          </motion.div>
        )}

        {/* ── Analyzing ──────────────────────────────────────────── */}
        {layer === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50">
            <AnalysisLoader
              hasFaceScan={!!faceAnalysis}
              hasHRV={!!resolvedHrv}
              agentEvents={agentEvents}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
