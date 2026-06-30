"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { HRVData } from "@/lib/types";

// Subjective morning state → synthetic HRV proxy
const PROXY_OPTIONS = [
  {
    id: "heavy",
    label: "Heavy and groggy",
    icon: "💤",
    sub: "Hard to get going, body felt like lead",
    hrvDeltaPercent: -25,
    restingHrDelta: 10,
  },
  {
    id: "flat",
    label: "Okay but flat",
    icon: "😐",
    sub: "Functional, but no energy to spare",
    hrvDeltaPercent: -10,
    restingHrDelta: 5,
  },
  {
    id: "decent",
    label: "Decent considering",
    icon: "⚡",
    sub: "Surprised you felt this okay",
    hrvDeltaPercent: 0,
    restingHrDelta: 1,
  },
  {
    id: "restored",
    label: "Actually restored",
    icon: "🔋",
    sub: "Slept well, woke up clear",
    hrvDeltaPercent: 10,
    restingHrDelta: -3,
  },
] as const;

export type ProxyOptionId = typeof PROXY_OPTIONS[number]["id"];

interface ManualProxyProps {
  onComplete: (data: HRVData) => void;
}

export function ManualProxy({ onComplete }: ManualProxyProps) {
  const handleSelect = (opt: typeof PROXY_OPTIONS[number], bpm: number | null) => {
    const data: HRVData = {
      hrvDeltaPercent: opt.hrvDeltaPercent,
      restingHrDelta: bpm !== null
        ? Math.round(bpm - 60)   // delta vs population baseline
        : opt.restingHrDelta,
      source: "manual_proxy",
      confidence: "low",
    };
    onComplete(data);
  };

  return (
    <ManualProxyInner onSelect={handleSelect} />
  );
}

function ManualProxyInner({
  onSelect,
}: {
  onSelect: (opt: typeof PROXY_OPTIONS[number], bpm: number | null) => void;
}) {
  const [chosen, setChosen] = useState<ProxyOptionId | null>(null);
  const [bpm, setBpm] = useState<number>(65);
  const [showHR, setShowHR] = useState(false);
  const [showSlider, setShowSlider] = useState(false);

  const handleCard = (opt: typeof PROXY_OPTIONS[number]) => {
    setChosen(opt.id);
    setShowHR(true);
  };

  const handleConfirm = () => {
    const opt = PROXY_OPTIONS.find((o) => o.id === chosen);
    if (!opt) return;
    onSelect(opt, showSlider ? bpm : null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Orb question */}
      <div className="text-center mb-2">
        <h3
          className="font-normal leading-snug"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.3rem, 5vw, 1.6rem)", color: "var(--color-text-primary)" }}
        >
          How did your body report in this morning?
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
          One tap — your honest read
        </p>
      </div>

      {/* State cards */}
      <div className="flex flex-col gap-2.5">
        {PROXY_OPTIONS.map((opt, i) => (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.975 }}
            onClick={() => handleCard(opt)}
            className="relative w-full rounded-2xl flex items-center text-left"
            style={{
              minHeight: "64px",
              padding: "14px 16px",
              backgroundColor: chosen === opt.id ? "rgba(234,88,12,0.09)" : "var(--color-bg-surface)",
              border: `1.5px solid ${chosen === opt.id ? "rgba(234,88,12,0.5)" : "rgba(168,162,158,0.12)"}`,
              transition: "border-color 0.17s, background-color 0.17s",
            }}
          >
            {chosen === opt.id && (
              <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ backgroundColor: "var(--color-brand-primary)" }} />
            )}
            <span className="text-xl mr-3.5 flex-shrink-0">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold block" style={{ color: chosen === opt.id ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                {opt.label}
              </span>
              <span className="text-[11px] mt-0.5 block" style={{ color: "var(--color-text-disabled)" }}>
                {opt.sub}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Optional HR slide-in */}
      {showHR && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Rough resting heart rate this morning?
            </p>
            <button
              onClick={() => { setShowSlider(false); handleConfirm(); }}
              className="text-[10px] font-medium"
              style={{ color: "var(--color-text-faint)" }}
            >
              Skip
            </button>
          </div>

          {!showSlider ? (
            <button
              onClick={() => setShowSlider(true)}
              className="text-sm font-semibold"
              style={{ color: "var(--color-brand-primary)" }}
            >
              I checked — enter it
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                <span>45 bpm</span>
                <span className="font-bold text-base" style={{ color: "var(--color-brand-primary)" }}>{bpm} bpm</span>
                <span>100 bpm</span>
              </div>
              <input
                type="range"
                min={45}
                max={100}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-orange-500"
                style={{ accentColor: "var(--color-brand-primary)" }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Confirm */}
      {showHR && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{
            backgroundColor: "var(--color-brand-primary)",
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
          }}
        >
          Use this estimate
        </motion.button>
      )}
    </div>
  );
}
