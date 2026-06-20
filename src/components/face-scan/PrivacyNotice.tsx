"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Trash2, Camera } from "lucide-react";

const PRIVACY_POINTS = [
  {
    icon: Camera,
    title: "What we'll measure",
    body: "Visible stress signals only — eye openness, brow tension, and mouth geometry. We don't read expressions, identify you, or guess your mood.",
  },
  {
    icon: Eye,
    title: "Everything happens in your browser",
    body: "The frame is processed locally on this device. Your image and the measurement vector are never uploaded to any server.",
  },
  {
    icon: Shield,
    title: "Only a math proof leaves your device",
    body: "We generate a zero-knowledge proof that the score was computed from real biometric data — without exposing the data itself. Nothing identifying, nothing reversible.",
  },
  {
    icon: Trash2,
    title: "Discarded immediately after inference",
    body: "Once the proof is generated, the image and feature vector are garbage-collected. No logs, no backups, no retention.",
  },
];

interface PrivacyNoticeProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function PrivacyNotice({ onAccept, onDecline }: PrivacyNoticeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <p
          className="text-[10px] font-mono uppercase tracking-widest"
          style={{ color: "#EA580C" }}
        >
          Before we open the camera
        </p>
        <h3
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.5rem",
            color: "#F5F5F4",
          }}
        >
          Here&apos;s exactly what happens to your image.
        </h3>
      </div>

      {/* Privacy points */}
      <div className="flex flex-col gap-2.5">
        {PRIVACY_POINTS.map((pt, i) => (
          <motion.div
            key={pt.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            className="flex items-start gap-3 rounded-2xl p-3.5"
            style={{
              backgroundColor: "#141416",
              border: "1px solid rgba(168,162,158,0.1)",
            }}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(234,88,12,0.12)" }}
            >
              <pt.icon className="w-3.5 h-3.5" style={{ color: "#EA580C" }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#F5F5F4" }}>
                {pt.title}
              </p>
              <p
                className="text-[11px] mt-0.5 leading-relaxed"
                style={{ color: "#A8A29E" }}
              >
                {pt.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Explicit data-flow summary */}
      <div
        className="rounded-xl p-3 text-center"
        style={{
          backgroundColor: "rgba(74,222,128,0.06)",
          border: "1px solid rgba(74,222,128,0.18)",
        }}
      >
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#4ADE80" }}>
          Data flow
        </p>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "#F5F5F4" }}>
          Your image → <span style={{ color: "#4ADE80" }}>your browser only</span> →
          math proof → optional on-chain commit
        </p>
        <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: "#A8A29E" }}>
          The image, landmarks, and feature vector never leave your device.
        </p>
      </div>

      {/* Legal micro-note */}
      <p
        className="text-[10px] text-center leading-relaxed"
        style={{ color: "#524F4C" }}
      >
        Face scan is optional. Your debt score is calculated with or without it.
        Skipping has no penalty.
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onAccept}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{
            backgroundColor: "#EA580C",
            color: "#F5F5F4",
            fontFamily: "var(--font-body)",
            minHeight: "58px",
          }}
        >
          I understand — open camera
        </motion.button>
        <button
          onClick={onDecline}
          className="w-full text-center text-[13px] py-2.5 font-medium"
          style={{ color: "#A8A29E" }}
        >
          Skip face scan
        </button>
      </div>
    </motion.div>
  );
}
