"use client";

import { useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate, PanInfo } from "framer-motion";
import { haptic } from "@/lib/haptics";

type DrumSize = "default" | "compact";

const SIZE: Record<DrumSize, { itemH: number; visible: number; selectedFs: string; nearFs: string; farFs: string }> = {
  default: { itemH: 72, visible: 5, selectedFs: "3rem", nearFs: "1.65rem", farFs: "1.1rem" },
  compact: { itemH: 44, visible: 3, selectedFs: "1.35rem", nearFs: "0.95rem", farFs: "0.75rem" },
};

export function TimeDrum({
  slots,
  selectedIdx,
  onSelect,
  size = "default",
}: {
  slots: string[];
  selectedIdx: number;
  onSelect: (i: number) => void;
  size?: DrumSize;
}) {
  const { itemH, visible, selectedFs, nearFs, farFs } = SIZE[size];
  const y = useMotionValue(-selectedIdx * itemH);
  const isDragging = useRef(false);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const clampIdx = useCallback(
    (i: number) => Math.max(0, Math.min(slots.length - 1, i)),
    [slots.length],
  );

  const snapTo = useCallback(
    (idx: number, velocity = 0) => {
      const clamped = clampIdx(idx);
      animRef.current?.stop();
      animRef.current = animate(y, -clamped * itemH, {
        type: "spring",
        velocity,
        stiffness: 260,
        damping: 28,
        restDelta: 0.5,
        onComplete: () => onSelect(clamped),
      });
      onSelect(clamped);
    },
    [y, onSelect, clampIdx, itemH],
  );

  useEffect(() => {
    y.set(-selectedIdx * itemH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ratchet tick — light haptic each time the selection line crosses a slot,
  // during drags, taps, and settle animations alike.
  const lastTickIdx = useRef(selectedIdx);
  useMotionValueEvent(y, "change", (v) => {
    const i = Math.round(-v / itemH);
    if (i !== lastTickIdx.current && i >= 0 && i < slots.length) {
      lastTickIdx.current = i;
      haptic("light");
    }
  });

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    isDragging.current = false;
    const rawIdx = -y.get() / itemH;
    const velocity = -info.velocity.y / itemH;
    const projected = rawIdx + velocity * 0.18;
    snapTo(Math.round(projected), info.velocity.y);
  };

  const handleTap = (i: number) => {
    if (!isDragging.current) snapTo(i);
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: itemH * visible }}
    >
      <div
        className="absolute left-4 right-4 rounded-2xl pointer-events-none z-10"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: itemH,
          background:
            "linear-gradient(135deg, rgba(234,88,12,0.2) 0%, rgba(245,158,11,0.13) 100%)",
          border: "1.5px solid rgba(234,88,12,0.4)",
          boxShadow: "0 0 24px rgba(234,88,12,0.12)",
        }}
      />
      <div
        className="absolute left-6 z-20 pointer-events-none"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: 1,
          width: 20,
          backgroundColor: "rgba(234,88,12,0.6)",
        }}
      />
      <div
        className="absolute right-6 z-20 pointer-events-none"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: 1,
          width: 20,
          backgroundColor: "rgba(234,88,12,0.6)",
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-bg-base) 0%, transparent 28%, transparent 72%, var(--color-bg-base) 100%)",
        }}
      />

      <motion.div
        drag="y"
        dragConstraints={{ top: -(slots.length - 1) * itemH, bottom: 0 }}
        dragElastic={0.08}
        style={{ y, paddingTop: itemH * Math.floor(visible / 2), paddingBottom: itemH * Math.floor(visible / 2) }}
        onDragStart={() => {
          isDragging.current = true;
          animRef.current?.stop();
        }}
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
                scale: isSelected ? 1 : dist === 1 ? 0.85 : 0.7,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full flex items-center justify-center font-normal"
              style={{
                height: itemH,
                fontFamily: "var(--font-heading)",
                fontSize: isSelected ? selectedFs : dist === 1 ? nearFs : farFs,
                color: isSelected
                  ? "var(--color-text-primary)"
                  : "var(--color-text-secondary)",
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
