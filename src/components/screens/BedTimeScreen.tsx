"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import { DawnParticle } from "./dawn-particle";
import { TimeDrum } from "./time-drum";
import { PrimaryButton } from "@/components/PrimaryButton";
import { buildBedtimeSlots, getCircadianNote } from "@/lib/time-utils";

const SLOTS = buildBedtimeSlots();
const DEFAULT_IDX = SLOTS.indexOf("11:00 PM");

// ─── Main screen ──────────────────────────────────────────────────────────────

export function BedTimeScreen() {
  const router = useRouter();
  const { setBedTime, setSessionStartedAt } = useBodyDebtStore();
  const [selectedIdx, setSelectedIdx] = useState(DEFAULT_IDX === -1 ? 4 : DEFAULT_IDX);

  const handleConfirm = () => {
    setBedTime(SLOTS[selectedIdx]);
    setSessionStartedAt(new Date().toISOString());
    memory.reportAction({
      content: `User set bed time to ${SLOTS[selectedIdx]} and started session.`,
      event_type: "create",
      page: "bed-time",
      metadata: { type: "start_session", bed_time: SLOTS[selectedIdx] },
    }).catch(() => {});
    router.push("/intake");
  };

  const selectedTime = SLOTS[selectedIdx];
  const note = getCircadianNote(selectedTime);

  return (
    <div className="relative min-h-svh flex flex-col items-center overflow-hidden" style={{ backgroundColor: "var(--color-bg-base)" }}>

      {/* Sunset radial glow */}
      <motion.div className="absolute pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.8 }}
        style={{
          top: "-15%", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.22) 0%, rgba(234,88,12,0.12) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div className="absolute pointer-events-none"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2.5, delay: 0.4 }}
        style={{
          top: "30%", left: "50%", transform: "translateX(-50%)",
          width: "320px", height: "320px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(234,88,12,0.1) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />

      {/* Floating particles */}
      {[{ delay: 0, x: "15%", size: 4 }, { delay: 1.2, x: "72%", size: 3 },
        { delay: 2.4, x: "40%", size: 5 }, { delay: 0.7, x: "58%", size: 3 },
        { delay: 3.1, x: "28%", size: 4 }, { delay: 1.8, x: "85%", size: 3 }]
        .map((p, i) => <DawnParticle key={i} {...p} />)}

      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative z-10 mt-16 mb-2"
      >
        <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 88, height: 88, position: "relative" }}>
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: "1px solid rgba(245,158,11,0.3)" }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute inset-2 rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #FBBF24, #F59E0B 40%, #EA580C 80%, #1a0800 100%)",
              boxShadow: "0 0 32px 8px rgba(245,158,11,0.35), 0 0 60px 20px rgba(234,88,12,0.15)",
            }}
            animate={{ borderRadius: ["52% 48% 52% 48% / 50% 50% 50% 50%", "48% 52% 48% 52% / 52% 48% 52% 48%", "52% 48% 52% 48% / 50% 50% 50% 50%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute rounded-full pointer-events-none"
            style={{ inset: "22%", background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)", mixBlendMode: "screen" }}
            animate={{ opacity: [0.5, 0.9, 0.5], rotate: [0, 360] }}
            transition={{ opacity: { duration: 4, repeat: Infinity }, rotate: { duration: 12, repeat: Infinity, ease: "linear" } }} />
        </motion.div>
      </motion.div>

      {/* Prompt text */}
      <div className="relative z-10 text-center px-8 mb-6 space-y-2">
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--color-states-warning)" }}>
          The orb is dimming
        </motion.p>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="font-normal leading-snug"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 6vw, 1.85rem)", color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          What time did you go to bed?
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
          className="text-xs" style={{ color: "var(--color-text-faint)" }}>
          Swipe up or down · timing matters as much as duration
        </motion.p>
      </div>

      {/* Drum */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}
        className="relative z-10 w-full px-6 flex-1">
        <TimeDrum slots={SLOTS} selectedIdx={selectedIdx} onSelect={setSelectedIdx} />

        {/* Circadian live echo */}
        <AnimatePresence mode="wait">
          <motion.p key={selectedTime}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-center text-[11px] font-mono mt-3"
            style={{ color: note.color, opacity: 0.85 }}>
            In bed by {selectedTime} · {note.label}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="relative z-10 w-full px-6 pb-12 pt-5">
        <PrimaryButton size="lg" shimmer onClick={handleConfirm}>
          That&apos;s right
        </PrimaryButton>
      </motion.div>
    </div>
  );
}
