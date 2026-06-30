"use client";

import { motion } from "framer-motion";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-svh flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 rounded-full mb-8"
        style={{
          background:
            "radial-gradient(circle at 40% 35%, rgba(220,38,38,0.2) 0%, rgba(234,88,12,0.05) 60%, transparent 100%)",
        }}
      />
      <h2
        className="text-xl font-normal mb-2"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-primary)" }}
      >
        Something went wrong
      </h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
        {error.message || "An unexpected error occurred. Your data is safe."}
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={reset}
        className="w-full max-w-xs font-semibold rounded-2xl"
        style={{
          backgroundColor: "var(--color-brand-primary)",
          color: "var(--color-text-primary)",
          minHeight: 58,
          fontFamily: "var(--font-body)",
        }}
      >
        Try again
      </motion.button>
    </div>
  );
}
