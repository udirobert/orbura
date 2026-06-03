"use client";

import { useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, animate, PanInfo } from "framer-motion";

const ITEM_H = 72;
const VISIBLE = 5;

export function TimeDrum({ slots, selectedIdx, onSelect }: {
  slots: string[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  const y = useMotionValue(-selectedIdx * ITEM_H);
  const isDragging = useRef(false);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const clampIdx = useCallback((i: number) => Math.max(0, Math.min(slots.length - 1, i)), [slots.length]);

  const snapTo = useCallback((idx: number, velocity = 0) => {
    const clamped = clampIdx(idx);
    animRef.current?.stop();
    animRef.current = animate(y, -clamped * ITEM_H, {
      type: "spring",
      velocity,
      stiffness: 260,
      damping: 28,
      restDelta: 0.5,
      onComplete: () => onSelect(clamped),
    });
    onSelect(clamped);
  }, [y, onSelect, clampIdx]);

  useEffect(() => {
    y.set(-selectedIdx * ITEM_H);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    isDragging.current = false;
    const rawIdx    = -y.get() / ITEM_H;
    const velocity  = -info.velocity.y / ITEM_H;
    const projected = rawIdx + velocity * 0.18;
    snapTo(Math.round(projected), info.velocity.y);
  };

  const handleTap = (i: number) => {
    if (!isDragging.current) snapTo(i);
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: ITEM_H * VISIBLE }}
    >
      {/* Selection highlight band */}
      <div
        className="absolute left-4 right-4 rounded-2xl pointer-events-none z-10"
        style={{
          top: "50%", transform: "translateY(-50%)", height: ITEM_H,
          background: "linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(245,158,11,0.13) 100%)",
          border: "1.5px solid rgba(234,88,12,0.4)",
          boxShadow: "0 0 24px rgba(234,88,12,0.12)",
        }}
      />
      {/* Accent lines */}
      <div className="absolute left-6 z-20 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)", height: 1, width: 20, backgroundColor: "rgba(234,88,12,0.6)" }} />
      <div className="absolute right-6 z-20 pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)", height: 1, width: 20, backgroundColor: "rgba(234,88,12,0.6)" }} />

      {/* Fade masks */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        background: "linear-gradient(to bottom, #0A0A0B 0%, transparent 28%, transparent 72%, #0A0A0B 100%)",
      }} />

      {/* Draggable drum */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -(slots.length - 1) * ITEM_H, bottom: 0 }}
        dragElastic={0.08}
        style={{ y, paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}
        onDragStart={() => { isDragging.current = true; animRef.current?.stop(); }}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        {slots.map((slot, i) => {
          const dist = Math.abs(i - selectedIdx);
          const isSelected = i === selectedIdx;
          return (
            <motion.div
              key={slot}
              onClick={() => handleTap(i)}
              animate={{
                opacity: isSelected ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.2 : 0.08,
                scale:   isSelected ? 1 : dist === 1 ? 0.8 : 0.65,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full flex items-center justify-center font-normal"
              style={{
                height: ITEM_H,
                fontFamily: "var(--font-heading)",
                fontSize: isSelected ? "3rem" : dist === 1 ? "1.65rem" : "1.1rem",
                color: isSelected ? "#F5F5F4" : "#A8A29E",
                letterSpacing: isSelected ? "-0.025em" : "0",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {slot}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
