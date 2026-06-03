"use client";

import { motion } from "framer-motion";

export function DawnParticle({ delay, x, size }: { delay: number; x: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, bottom: "10%",
        backgroundColor: "rgba(245,158,11,0.35)", filter: "blur(1px)",
      }}
      animate={{ y: [0, -180, -320], opacity: [0, 0.6, 0], scale: [0.6, 1, 0.4], x: [0, 12, -8] }}
      transition={{ duration: 5 + delay * 0.4, delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
}
