"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { memory } from "@/lib/sdk/eazo-client";
import { DawnParticle } from "./dawn-particle";
import { TimeDrum } from "./time-drum";
import { SleepArc } from "./sleep-arc";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  buildTimeSlots,
  buildBedtimeSlots,
  getCircadianNote,
  sleepDurationLabel,
  slotToMinutes,
} from "@/lib/time-utils";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";

const WAKE_SLOTS = buildTimeSlots();
const BED_SLOTS = buildBedtimeSlots();
const DEFAULT_WAKE = WAKE_SLOTS.indexOf("7:30 AM");
const DEFAULT_BED = BED_SLOTS.indexOf("11:00 PM");

function idxOr(slots: string[], value: string | null | undefined, fallback: number) {
  if (!value) return fallback === -1 ? 0 : fallback;
  const i = slots.indexOf(value);
  return i === -1 ? (fallback === -1 ? 0 : fallback) : i;
}

/**
 * Sleep window — one wizard step for bedtime + wake.
 * Dual drums sit side-by-side so short phones keep the CTA on-screen.
 */
export function WakeTimeScreen() {
  const router = useRouter();
  const {
    setWakeTime,
    setBedTime,
    setSessionStartedAt,
    lastWakeTime,
    lastBedTime,
    setLastSleepWindow,
  } = useBodyDebtStore();

  const remembered = !!(lastWakeTime && lastBedTime);
  const [wakeIdx, setWakeIdx] = useState(() =>
    idxOr(WAKE_SLOTS, lastWakeTime, DEFAULT_WAKE === -1 ? 7 : DEFAULT_WAKE),
  );
  const [bedIdx, setBedIdx] = useState(() =>
    idxOr(BED_SLOTS, lastBedTime, DEFAULT_BED === -1 ? 10 : DEFAULT_BED),
  );

  const [roomy, setRoomy] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-height: 760px)");
    const apply = () => setRoomy(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const wakeTime = WAKE_SLOTS[wakeIdx];
  const bedTime = BED_SLOTS[bedIdx];
  const note = getCircadianNote(bedTime);
  const duration = sleepDurationLabel(bedTime, wakeTime);

  // Duration-aware insight — turns the raw window into a small coaching nudge
  const sleepMins = (() => {
    let m = slotToMinutes(wakeTime) - slotToMinutes(bedTime);
    if (m <= 0) m += 24 * 60;
    return m;
  })();
  const insight =
    sleepMins < 360
      ? "Short night — deep sleep will be compressed"
      : sleepMins < 420
        ? "Under 7h — expect some sleep debt"
        : sleepMins <= 540
          ? "Within the 7–9h sweet spot"
          : sleepMins <= 600
            ? "Long sleep — your body may be catching up"
            : "Very long sleep — worth noting if you're still tired";
  const matchesHabit =
    remembered && wakeTime === lastWakeTime && bedTime === lastBedTime;

  const handleConfirm = () => {
    setBedTime(bedTime);
    setWakeTime(wakeTime);
    setLastSleepWindow(bedTime, wakeTime);
    setSessionStartedAt(new Date().toISOString());
    memory
      .reportAction({
        content: `User set sleep window: bed ${bedTime}, wake ${wakeTime}.`,
        event_type: "create",
        page: "wake-time",
        metadata: {
          type: "start_session",
          bed_time: bedTime,
          wake_time: wakeTime,
        },
      })
      .catch(() => {});
    router.push("/intake");
  };

  return (
    <div
      className="relative min-h-svh flex flex-col items-center overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-base)" }}
    >
      <motion.div
        className="absolute pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          top: "-18%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 50% 50%, rgba(245,158,11,0.18) 0%, rgba(234,88,12,0.08) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {[
        { delay: 0, x: "18%", size: 3 },
        { delay: 1.4, x: "78%", size: 3 },
      ].map((p, i) => (
        <DawnParticle key={i} {...p} />
      ))}

      <div className="relative z-10 w-full px-5">
        <ScreenHeader
          back={{ href: "/", label: "Back" }}
          progress={{ current: 1, total: 5 }}
        />
      </div>

      <div className="relative z-10 text-center px-6 mb-2 space-y-1">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_PROTOCOL }}
          className="font-normal leading-snug"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.25rem, 5vw, 1.6rem)",
            color: "var(--color-text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          When did you sleep?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[11px]"
          style={{ color: "var(--color-text-faint)" }}
        >
          {remembered
            ? "Starting from your usual times — swipe to adjust"
            : "Swipe each drum. Your recovery clock starts here"}
        </motion.p>
      </div>

      {/* Sleep window arc + drums — centered so tall screens don't leave a void */}
      <div className="relative z-10 w-full px-3 flex-1 flex flex-col justify-center min-h-0">
        <div className="w-full max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_PROTOCOL }}
          >
            <SleepArc bedTime={bedTime} wakeTime={wakeTime} duration={duration} />
          </motion.div>

          <div className="grid grid-cols-2 gap-1 items-start mt-3">
            <div>
              <p
                className="text-[9px] font-mono uppercase tracking-widest text-center mb-0.5"
                style={{ color: "var(--color-text-faint)" }}
              >
                Bedtime
              </p>
              <TimeDrum
                slots={BED_SLOTS}
                selectedIdx={bedIdx}
                onSelect={setBedIdx}
                size={roomy ? "default" : "compact"}
              />
            </div>
            <div>
              <p
                className="text-[9px] font-mono uppercase tracking-widest text-center mb-0.5"
                style={{ color: "var(--color-text-faint)" }}
              >
                Wake
              </p>
              <TimeDrum
                slots={WAKE_SLOTS}
                selectedIdx={wakeIdx}
                onSelect={setWakeIdx}
                size={roomy ? "default" : "compact"}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${bedTime}-${wakeTime}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="text-center mt-2 px-4 space-y-0.5"
            >
              <p
                className="text-[11px] font-mono"
                style={{ color: note.color, opacity: 0.9 }}
              >
                {matchesHabit ? "Same as last time · " : ""}
                {duration} · {note.label}
              </p>
              <p
                className="text-[10px] font-mono"
                style={{ color: "var(--color-text-faint)" }}
              >
                {insight}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="relative z-10 w-full px-6 pb-8 pt-3"
      >
        <PrimaryButton size="lg" shimmer onClick={handleConfirm}>
          Continue to stressors
        </PrimaryButton>
      </motion.div>
    </div>
  );
}
