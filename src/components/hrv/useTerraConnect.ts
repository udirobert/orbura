"use client";

import { useState, useEffect, useRef } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { getTerraWidgetSession, getTerraData } from "@/lib/api";
import type { HRVData } from "@/lib/types";

export type TerraPhase =
  | "idle"         // choose a provider
  | "opening"      // popup opened, waiting for OAuth
  | "fetching"     // OAuth done, pulling sleep/HRV data
  | "connected"    // data received
  | "error"        // something failed
  | "not_configured"; // Terra keys not set up yet

export interface TerraState {
  phase: TerraPhase;
  terraUserId: string | null;
  provider: string | null;
  hrvData: HRVData | null;
  errorMsg: string | null;
}

export function useTerraConnect() {
  const {
    setHrvData,
  } = useBodyDebtStore();

  const [terra, setTerra] = useState<TerraState>({
    phase: "idle",
    terraUserId: null,
    provider: null,
    hrvData: null,
    errorMsg: null,
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const popupTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen for the popup postMessage from /api/terra/callback
  useEffect(() => {
    const onMessage = async (evt: MessageEvent) => {
      if (evt.data?.type !== "TERRA_AUTH") return;

      if (popupTimer.current) clearInterval(popupTimer.current);
      popupRef.current?.close();

      if (evt.data.status !== "success" || !evt.data.terraUserId) {
        setTerra((s) => ({
          ...s,
          phase: "error",
          errorMsg: "Connection was cancelled or failed. Try again.",
        }));
        return;
      }

      const userId = evt.data.terraUserId as string;
      const prov = evt.data.provider as string;

      setTerra((s) => ({ ...s, phase: "fetching", terraUserId: userId, provider: prov }));

      // Small delay so Terra's backend has time to process the auth
      await new Promise((r) => setTimeout(r, 2000));

      try {
        const result = await getTerraData(userId);

        if ("error" in result) {
          if (result.error === "NO_SLEEP_DATA") {
            // No sleep data yet is non-fatal — use conservative estimate
            const fallback: HRVData = { hrvDeltaPercent: -15, restingHrDelta: 4 };
            setHrvData(fallback);
            setTerra((s) => ({ ...s, phase: "connected", hrvData: fallback }));
          } else {
            throw new Error(result.message ?? result.error);
          }
        } else {
          setHrvData(result.hrvData);
          setTerra((s) => ({ ...s, phase: "connected", hrvData: result.hrvData }));
        }
      } catch (err) {
        setTerra((s) => ({
          ...s,
          phase: "error",
          errorMsg: err instanceof Error ? err.message : "Could not fetch your wearable data.",
        }));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setHrvData]);

  const openWidget = useCallback(async () => {
    setTerra((s) => ({ ...s, phase: "opening", errorMsg: null }));

    try {
      let widgetData;
      try {
        widgetData = await getTerraWidgetSession();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "TERRA_NOT_CONFIGURED" || msg.includes("TERRA_NOT_CONFIGURED")) {
          setTerra((s) => ({ ...s, phase: "not_configured" }));
          return;
        }
        throw err;
      }

      if (!widgetData.url) {
        throw new Error("Failed to start connection.");
      }

      // Open Terra widget in a popup window
      const popup = window.open(widgetData.url, "terra_auth", "width=500,height=700,scrollbars=yes");
      popupRef.current = popup;

      // Detect if user closed popup without completing auth
      popupTimer.current = setInterval(() => {
        if (popup?.closed) {
          clearInterval(popupTimer.current!);
          setTerra((s) =>
            s.phase === "opening"
              ? { ...s, phase: "idle", errorMsg: "Window closed before connecting." }
              : s
          );
        }
      }, 800);
    } catch (err) {
      setTerra((s) => ({
        ...s,
        phase: "error",
        errorMsg: err instanceof Error ? err.message : "Connection failed.",
      }));
    }
  }, []);

  // Cleanup popup timer on unmount
  useEffect(() => {
    return () => {
      if (popupTimer.current) clearInterval(popupTimer.current);
      popupRef.current?.close();
    };
  }, []);

  return { terra, openWidget };
}
