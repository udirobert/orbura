"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";

// Turbulence frames for dormant orb
const DORMANT_FRAMES = [
  "52% 48% 50% 50% / 50% 52% 48% 50%",
  "50% 50% 52% 48% / 52% 48% 50% 50%",
  "48% 52% 50% 50% / 50% 50% 52% 48%",
  "50% 50% 48% 52% / 48% 52% 50% 50%",
];

export function OpeningScreen() {
  const router = useRouter();
  const { analysis, setHasSeenOpening } = useBodyDebtStore();
  const [orbVisible, setOrbVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [btnVisible, setBtnVisible] = useState(false);
  const [exiting, setExiting] = useState(false); // kept for orb visual only

  useEffect(() => {
    if (analysis) {
      router.replace("/dashboard");
      return;
    }
    // Prefetch next routes while user reads the opening screen
    router.prefetch("/wake-time");
    router.prefetch("/intake");
    const t1 = setTimeout(() => setOrbVisible(true), 200);
    const t2 = setTimeout(() => setTextVisible(true), 1000);
    const t3 = setTimeout(() => setBtnVisible(true), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [analysis, router]);

  const handleFindOut = () => {
    setHasSeenOpening(true);
    setExiting(true);
    router.prefetch("/wake-time");
    memory.reportAction({
      content: "User started a body debt session from the opening screen.",
      event_type: "start",
      page: "opening",
      metadata: { type: "start_session" },
    }).catch(() => {});
    router.push("/wake-time");
  };

  return (
    <motion.div
      className="relative min-h-svh flex flex-col items-center justify-between overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.38 }}
    >
      {/* Full-bleed amber glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "38%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "480px", height: "480px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Brand */}
      <div className="relative z-10 w-full flex justify-center pt-16">
        <AnimatePresence>
          {textVisible && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span
                className="tracking-[0.25em] text-xs font-semibold uppercase"
                style={{ color: "rgba(168,162,158,0.5)" }}
              >
                BODY DEBT
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dormant orb */}
      <div className="relative z-10 flex flex-col items-center gap-8" style={{ marginTop: "-5vh" }}>
        <AnimatePresence>
          {orbVisible && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative flex items-center justify-center"
              style={{ width: "52vw", maxWidth: 240, height: "52vw", maxHeight: 240 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: "0 0 80px 28px rgba(245,158,11,0.15)" }}
                animate={{ opacity: [0.4, 0.75, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: "74%", height: "74%",
                  background: "radial-gradient(circle at 35% 30%, #F59E0B, #EA580C 55%, #1a0800 100%)",
                  boxShadow: "0 0 50px 12px rgba(245,158,11,0.2)",
                }}
                animate={{ borderRadius: DORMANT_FRAMES, scale: [1, 1.025, 1] }}
                transition={{
                  borderRadius: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                  scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "46%", height: "46%",
                  background: "radial-gradient(circle at 28% 28%, rgba(255,255,255,0.13), transparent 65%)",
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <div
                className="absolute text-center font-normal"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2rem, 8vw, 3rem)",
                  color: "rgba(245,245,244,0.25)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                —
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {textVisible && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-center px-8"
            >
              <p
                className="leading-relaxed"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.05rem, 4.5vw, 1.3rem)",
                  color: "rgba(168,162,158,0.7)",
                  letterSpacing: "0.01em",
                }}
              >
                Your body is keeping score.
                <br />
                <span style={{ color: "rgba(168,162,158,0.45)" }}>Are you?</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="relative z-10 w-full px-6 pb-14">
        <AnimatePresence>
          {btnVisible && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleFindOut}
                className="w-full font-bold uppercase tracking-[0.18em] rounded-2xl relative overflow-hidden"
                style={{
                  backgroundColor: "#EA580C",
                  color: "#F5F5F4",
                  fontFamily: "var(--font-body)",
                  minHeight: "64px",
                  fontSize: "15px",
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1 }}
                />
                <span className="relative z-10">Find Out</span>
              </motion.button>
              <p
                className="text-center mt-4 text-[10px] tracking-widest uppercase font-mono"
                style={{ color: "rgba(82,79,76,0.7)" }}
              >
                No account · Free to start
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
