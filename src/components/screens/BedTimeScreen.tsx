"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@eazo/sdk";
import { buildBedtimeSlots, getCircadianNote } from "@/lib/time-utils";

const SLOTS = buildBedtimeSlots();
const DEFAULT_IDX = SLOTS.indexOf("11:00 PM");
const ITEM_H = 72;
const VISIBLE = 5;

export function BedTimeScreen() {
  const router = useRouter();
  const { setBedTime, setSessionStartedAt } = useBodyDebtStore();

  const [selectedIdx, setSelectedIdx] = useState(DEFAULT_IDX === -1 ? 4 : DEFAULT_IDX);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const snapTo = useCallback((idx: number, animated = true) => {
    const clamped = Math.max(0, Math.min(SLOTS.length - 1, idx));
    setSelectedIdx(clamped);
    const target = -clamped * ITEM_H;
    if (animated) {
      animate(y, target, { type: "spring", stiffness: 280, damping: 30 });
    } else {
      y.set(target);
    }
  }, [y]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const currentY = y.get();
    const rawIdx = -currentY / ITEM_H;
    const velocityBias = info.velocity.y < -50 ? 0.5 : info.velocity.y > 50 ? -0.5 : 0;
    const newIdx = Math.round(rawIdx + velocityBias);
    snapTo(newIdx);
  }, [y, snapTo]);

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

  const note = getCircadianNote(SLOTS[selectedIdx]);

  return (
    <div
      className="relative min-h-svh flex flex-col items-center px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute rounded-full"
          style={{
            width: "70%", height: "45%",
            top: "-15%", left: "15%",
            background: "radial-gradient(circle, rgba(234,88,12,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Back */}
      <div className="relative z-10 w-full flex items-center justify-start mt-12 mb-4">
        <button
          onClick={() => router.push("/wake-time")}
          className="flex items-center gap-1 text-[11px] font-medium"
          style={{ color: "#524F4C", minHeight: "44px" }}
        >
          ← Back
        </button>
      </div>

      {/* Progress */}
      <div className="relative z-10 w-full mb-6">
        <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: "20%", backgroundColor: "#EA580C" }} />
        </div>
        <p className="text-[9px] font-mono uppercase tracking-widest mt-1.5" style={{ color: "#524F4C" }}>
          Step 1 of 5
        </p>
      </div>

      {/* Orb question */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 w-full text-left mb-6"
      >
        <h2
          className="font-normal leading-snug mb-1"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.45rem, 5.5vw, 1.8rem)",
            color: "#F5F5F4",
          }}
        >
          What time did you go to bed?
        </h2>
        <p className="text-xs" style={{ color: "#524F4C" }}>
          Timing matters as much as duration.
        </p>
      </motion.div>

      {/* Drum picker */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 22 }}
        className="relative z-10 w-full flex-1 flex flex-col items-center"
      >
        <div
          ref={containerRef}
          className="relative overflow-hidden w-full max-w-xs"
          style={{ height: ITEM_H * VISIBLE }}
        >
          {/* Selection highlight */}
          <div
            className="absolute left-0 right-0 rounded-2xl pointer-events-none z-10"
            style={{
              top: ITEM_H * 2,
              height: ITEM_H,
              background: "rgba(234,88,12,0.07)",
              border: "1.5px solid rgba(234,88,12,0.3)",
            }}
          />
          {/* Fade masks */}
          <div className="absolute inset-x-0 top-0 z-20 pointer-events-none h-1/3"
            style={{ background: "linear-gradient(to bottom, #0A0A0B 0%, transparent 100%)" }} />
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none h-1/3"
            style={{ background: "linear-gradient(to top, #0A0A0B 0%, transparent 100%)" }} />

          {/* Drag track */}
          <motion.div
            drag="y"
            dragConstraints={{ top: -(SLOTS.length - 1) * ITEM_H, bottom: 0 }}
            dragElastic={0.08}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="will-change-transform cursor-grab active:cursor-grabbing"
          >
            {SLOTS.map((slot, i) => {
              const dist = Math.abs(i - selectedIdx);
              const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : 0.18;
              const scale = dist === 0 ? 1 : 0.9;
              const isSelected = i === selectedIdx;
              return (
                <div
                  key={slot}
                  className="flex items-center justify-center select-none"
                  style={{ height: ITEM_H }}
                  onClick={() => snapTo(i)}
                >
                  <span
                    style={{
                      fontFamily: isSelected ? "var(--font-heading)" : "var(--font-body)",
                      fontSize: isSelected ? 42 : 24,
                      fontWeight: isSelected ? 900 : 400,
                      color: isSelected ? "#F5F5F4" : "#A8A29E",
                      opacity,
                      transform: `scale(${scale})`,
                      transition: "all 0.18s ease",
                      letterSpacing: isSelected ? "-0.02em" : "0",
                    }}
                  >
                    {slot}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Circadian note */}
        <motion.div
          key={note.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 text-center"
        >
          <p className="text-xs font-medium" style={{ color: note.color }}>
            {note.label}
          </p>
        </motion.div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full pb-10 pt-6"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          className="relative w-full font-semibold rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#EA580C",
            color: "#F5F5F4",
            fontFamily: "var(--font-body)",
            minHeight: "60px",
            fontSize: "15px",
          }}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
          />
          <span className="relative z-10">That&apos;s right</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
