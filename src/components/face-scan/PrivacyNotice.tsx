"use client";

import { motion } from "framer-motion";
import { Camera, Lock, ArrowRight } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";

interface PrivacyNoticeProps {
  onAccept: () => void;
  onDecline: () => void;
}

// Three-node flow strip: image → proof → score. This is the single
// highest-density visual representation of "what happens to your data"
// — it replaces the previous 4 stacked icon cards, which repeated the
// same privacy promise four different ways.

const FLOW_STEPS = [
  { icon: Camera, label: "Frame" },
  { icon: Lock, label: "Proof" },
  { icon: ArrowRight, label: "Score" },
];

export function PrivacyNotice({ onAccept, onDecline }: PrivacyNoticeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5"
    >
      {/* Headline */}
      <div className="text-center space-y-1.5 pt-1">
        <p
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "var(--color-brand-primary)" }}
        >
          Face scan
        </p>
        <h3
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.5rem",
            color: "var(--color-text-primary)",
          }}
        >
          On-device. Nothing uploaded.
        </h3>
        <p className="text-[12px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Your image never leaves this browser.
        </p>
      </div>

      {/* Data-flow strip */}
      <div
        className="rounded-2xl px-4 py-4"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="flex items-center justify-between gap-1">
          {FLOW_STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.25 }}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(234,88,12,0.12)" }}
              >
                <step.icon className="w-4 h-4" style={{ color: "var(--color-brand-primary)" }} />
              </div>
              <span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {step.label}
              </span>
            </motion.div>
          ))}
        </div>
        <div
          className="mt-3 pt-3 text-center"
          style={{ borderTop: "1px solid rgba(168,162,158,0.08)" }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-states-success)" }}>
            Stays on device
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Frame is discarded once the proof is generated.
          </p>
        </div>
      </div>

      {/* Two-line specifics — replaces the 4 cards */}
      <ul className="space-y-1.5 px-1">
        <li className="flex gap-2 text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <span style={{ color: "var(--color-brand-primary)" }}>·</span>
          Measures geometry only — not identity, not expression.
        </li>
        <li className="flex gap-2 text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          <span style={{ color: "var(--color-brand-primary)" }}>·</span>
          On-chain proof only if you connect a wallet. Otherwise local.
        </li>
      </ul>

      {/* CTAs */}
      <div className="mt-2 flex flex-col gap-1.5">
        <PrimaryButton size="md" onClick={onAccept}>
          Open camera
        </PrimaryButton>
        <button
          onClick={onDecline}
          className="w-full text-center text-[12px] py-2.5 font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Skip — score without face scan
        </button>
        <p
          className="text-[10px] text-center mt-1 font-mono uppercase tracking-widest"
          style={{ color: "var(--color-text-faint)" }}
        >
          Optional · no penalty
        </p>
      </div>
    </motion.div>
  );
}