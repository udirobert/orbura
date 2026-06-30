"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ minHeight: "100svh", backgroundColor: "var(--color-bg-base)" }}
        className="max-w-sm mx-auto w-full"
      >
        {/* Mobile-first container — centred on desktop, full-width on mobile */}
        <div className="mx-auto w-full" style={{ maxWidth: "430px" }}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
