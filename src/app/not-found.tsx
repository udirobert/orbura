"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0A0A0B" }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 rounded-full mb-8"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.05) 60%, transparent 100%)",
        }}
      />
      <h2
        className="text-xl font-normal mb-2"
        style={{ fontFamily: "var(--font-heading)", color: "#F5F5F4" }}
      >
        This page doesn&apos;t exist
      </h2>
      <p className="text-sm mb-8" style={{ color: "#A8A29E" }}>
        But your body still keeps the score.
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/")}
        className="w-full max-w-xs font-semibold rounded-2xl"
        style={{
          backgroundColor: "#EA580C",
          color: "#F5F5F4",
          minHeight: 58,
          fontFamily: "var(--font-body)",
        }}
      >
        Back to start
      </motion.button>
    </div>
  );
}
