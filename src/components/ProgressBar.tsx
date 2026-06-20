"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  current: number; // 1-indexed
  total: number;
  /** When true, the step count line reads "Step X of Y · optional" so a
   *  numbered funnel doesn't behaviourally signal "required". */
  optional?: boolean;
}

export function ProgressBar({ current, total, optional }: ProgressBarProps) {
  const filledCount = current;
  const pct = Math.round((filledCount / total) * 100);

  return (
    <div className="w-full max-w-xs mx-auto space-y-2">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5 justify-center">
        {[...Array(total)].map((_, i) => {
          const filled = i < filledCount;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.8 }}
              animate={{ scale: filled ? 1 : 0.8 }}
              className="rounded-full"
              style={{
                width: filled ? 8 : 6,
                height: filled ? 8 : 6,
                backgroundColor: filled ? "#EA580C" : "rgba(168,162,158,0.25)",
              }}
            />
          );
        })}
      </div>

      {/* Visual percentage bar */}
      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(168,162,158,0.1)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: "#EA580C" }}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      {/* Step count label */}
      <p
        className="text-center text-[9px] font-mono tracking-widest uppercase"
        style={{ color: "#524F4C" }}
      >
        Step {current} of {total}
        {optional && (
          <>
            {" · "}
            <span style={{ color: "#A8A29E" }}>optional</span>
          </>
        )}
      </p>
    </div>
  );
}
