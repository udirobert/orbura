"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download, Video, Wind, HeartPulse, Clock } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SOURCE_ICONS } from "@/lib/signal-icons";
import { useProtocolReveal, useSquishProps } from "@/lib/motion/protocol";
import { haptic } from "@/lib/haptics";
import { memory } from "@/lib/sdk/eazo-client";
import type { HRVData } from "@/lib/types";

type Status = "loading" | "ready" | "empty" | "unauthorized" | "error";

interface VitalsLatest {
  breathingRate: number | null;
  pulseBpm: number | null;
  hrvRmssdMs: number | null;
  recordedAt?: string;
  hrvData: HRVData | null;
}

/**
 * Camera check-in source — reads the latest camera_vitals observations for
 * the signed-in user (written by the Orbura Companion desktop app via
 * /api/vitals/check-in). Offers a link code so the companion can attribute
 * future check-ins to this account.
 */
export function CameraVitalsPanel({
  onData,
  onSkip,
}: {
  onData: (data: HRVData) => void;
  onSkip: () => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [vitals, setVitals] = useState<VitalsLatest | null>(null);
  const [freshness, setFreshness] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { container, item } = useProtocolReveal();
  const squish = useSquishProps();

  const load = useCallback(() => {
    fetch("/api/vitals/latest", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) return { kind: "unauthorized" as const };
        if (!res.ok) return { kind: "error" as const };
        const data = (await res.json()) as { vitals: VitalsLatest | null };
        return { kind: "ok" as const, vitals: data.vitals };
      })
      .then((result) => {
        if (result.kind !== "ok") {
          setStatus(result.kind);
          return;
        }
        const v = result.vitals;
        setVitals(v);
        if (v?.recordedAt) {
          const d = new Date(v.recordedAt);
          if (!Number.isNaN(d.getTime())) {
            const diffH = Math.round((Date.now() - d.getTime()) / 3600000);
            setFreshness(diffH < 1 ? "just now" : diffH < 24 ? `${diffH}h ago` : `${Math.round(diffH / 24)}d ago`);
          }
        }
        setStatus(v?.hrvData ? "ready" : "empty");
      })
      .catch(() => setStatus("error"));
  }, []);

  const reload = useCallback(() => {
    setStatus("loading");
    load();
  }, [load]);

  useEffect(() => { void load(); }, [load]);

  // Lightweight polling on tab focus/visibilitychange so desktop companion check-ins
  // immediately surface without waiting or manual reload.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [load]);

  const generateLink = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/vitals/link-token", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { token: string; expiresAt: string };
      setLinkCode(data.token);
      setLinkExpiry(data.expiresAt);
      memory.reportAction({
        content: "User generated a camera check-in link code to connect the Orbura Companion.",
        event_type: "create",
        page: "hrv-pull",
        metadata: { type: "camera_vitals_link" },
      }).catch(() => {});
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  const SourceIcon = SOURCE_ICONS.camera_vitals;
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col pb-10"
    >
      <motion.div variants={item} className="text-center px-4 mb-5">
        <div
          className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: "var(--color-system-brain-soft, rgba(34,211,238,0.12))" }}
        >
          <Video className="w-5 h-5" style={{ color: "var(--color-system-brain)" }} />
        </div>
        <h2
          className="font-normal leading-snug"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.3rem,5vw,1.6rem)", color: "var(--color-text-primary)" }}
        >
          Camera vitals
        </h2>
        <p className="text-xs mt-1.5" style={{ color: "var(--color-text-faint)" }}>
          A 45-second vitals read from the Orbura Companion desktop app — breathing, pulse and HRV, measured on-device.
        </p>
        <p className="text-[10px] mt-1" style={{ color: "var(--color-text-disabled)" }}>
          Video stays on your computer — only the numbers sync to Orbura.
        </p>
      </motion.div>

      {status === "loading" && (
        <motion.div variants={item} className="flex-1 flex items-center justify-center">
          <p className="text-xs font-mono" style={{ color: "var(--color-text-faint)" }}>Looking for camera check-ins…</p>
        </motion.div>
      )}

      {status === "unauthorized" && (
        <motion.div variants={item} className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Camera check-ins are tied to your account so they can build a baseline over time.
          </p>
          <a href="/auth/signin" className="text-sm font-semibold" style={{ color: "var(--color-brand-primary)" }}>
            Sign in to continue
          </a>
          <button onClick={onSkip} className="text-[13px] py-2" style={{ color: "var(--color-text-secondary)" }}>
            Skip — use another source
          </button>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div variants={item} className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Couldn&apos;t reach the check-in service.</p>
          <motion.button {...squish} onPointerDown={() => haptic("light")} onClick={reload} className="text-sm font-semibold" style={{ color: "var(--color-brand-primary)" }}>Try again</motion.button>
          <button onClick={onSkip} className="text-[13px] py-2" style={{ color: "var(--color-text-secondary)" }}>Skip — use another source</button>
        </motion.div>
      )}

      {status === "empty" && (
        <motion.div variants={item} className="flex-1 flex flex-col gap-4">
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.12)" }}
          >
            <SourceIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-system-brain)" }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>No camera check-ins yet</p>
              <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Open the Orbura Companion app on your computer, run a check-in, and tap
                <strong> Save to Orbura</strong>. It takes about a minute end to end.
              </p>
              <a
                href="https://github.com/udirobert/orbura/tree/main/showcases/presage-smartspectra"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold"
                style={{ color: "var(--color-brand-primary)" }}
              >
                <Download className="w-3 h-3" />
                Get the companion — developer preview, build from source
              </a>
            </div>
          </div>

          {/* Link code — attributes companion check-ins to this account */}
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.12)" }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--color-text-faint)" }}>
              Link the companion app
            </p>
            {!linkCode ? (
              <motion.button
                {...squish}
                onPointerDown={() => haptic("light")}
                onClick={generateLink}
                disabled={generating}
                className="text-xs font-semibold"
                style={{ color: "var(--color-brand-primary)" }}
              >
                {generating ? "Generating…" : "Generate a link code"}
              </motion.button>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 text-[10px] font-mono px-2.5 py-2 rounded-lg break-all select-all"
                    style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)", border: "1px solid rgba(168,162,158,0.15)" }}
                  >
                    {linkCode}
                  </code>
                  <motion.button
                    {...squish}
                    onPointerDown={() => haptic("light")}
                    onClick={copyLink}
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "var(--color-bg-base)", border: "1px solid rgba(168,162,158,0.15)", color: "var(--color-text-secondary)" }}
                    aria-label="Copy link code"
                  >
                    {copied ? <Check className="w-4 h-4" style={{ color: "var(--color-states-success)" }} /> : <Copy className="w-4 h-4" />}
                  </motion.button>
                </div>
                <p className="text-[10px] mt-2" style={{ color: "var(--color-text-faint)" }}>
                  Paste this into Orbura Companion → it expires {linkExpiry ? new Date(linkExpiry).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "in 30 minutes"}.
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 flex flex-col gap-2.5">
            <button onClick={onSkip} className="w-full text-center text-[13px] py-2.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Skip — use another source
            </button>
          </div>
        </motion.div>
      )}

      {status === "ready" && vitals?.hrvData && (
        <motion.div variants={item} className="flex-1 flex flex-col gap-4">
          {/* Latest vitals summary */}
          <div
            className="rounded-2xl p-4 grid grid-cols-3 gap-2"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.12)" }}
          >
            {[
              { icon: Wind, label: "Breathing", value: vitals.breathingRate != null ? `${Math.round(vitals.breathingRate)}` : "—", unit: "br/min" },
              { icon: HeartPulse, label: "Pulse", value: vitals.pulseBpm != null ? `${Math.round(vitals.pulseBpm)}` : "—", unit: "bpm" },
              { icon: Clock, label: "HRV (RMSSD)", value: vitals.hrvRmssdMs != null ? `${Math.round(vitals.hrvRmssdMs)}` : "—", unit: "ms" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <m.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: "var(--color-system-brain)" }} />
                <div className="text-sm font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>{m.value}</div>
                <div className="text-[8px] uppercase tracking-widest" style={{ color: "var(--color-text-disabled)" }}>{m.unit}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "var(--color-text-faint)" }}>{m.label}</div>
              </div>
            ))}
          </div>
          {freshness && (
            <p className="text-[10px] font-mono text-center" style={{ color: "var(--color-text-faint)" }}>
              Latest check-in · {freshness}
            </p>
          )}
          <div className="mt-auto">
            <PrimaryButton size="lg" onClick={() => onData(vitals.hrvData!)}>
              Use this check-in
            </PrimaryButton>
            <motion.button {...squish} onPointerDown={() => haptic("light")} onClick={reload} className="w-full text-center text-[12px] py-2 mt-1" style={{ color: "var(--color-text-faint)" }}>
              Refresh
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
