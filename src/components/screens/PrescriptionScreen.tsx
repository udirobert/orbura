"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";
import { auth, memory } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { ChevronLeft } from "lucide-react";
import { getOrbCopy } from "@/lib/orbPersonality";
import { MiniOrb } from "@/components/MiniOrb";

// ─── Config ────────────────────────────────────────────────────────────────────

const COMMAND_BLOCKS = [
  { key: "rightNow"    as const, label: "RIGHT NOW",    icon: "💧", labelColor: "#DC2626" },
  { key: "thisMorning" as const, label: "THIS MORNING", icon: "☕", labelColor: "#EA580C" },
  { key: "today"       as const, label: "TODAY",        icon: "🎯", labelColor: "#F59E0B" },
  { key: "avoid"       as const, label: "AVOID TODAY",  icon: "🚫", labelColor: "#DC2626" },
];

const FALLBACK_PRESCRIPTION = {
  rightNow:    "Drink 500ml of water with electrolytes. Your cells are dehydrated.",
  thisMorning: "No caffeine until 10am — it'll spike cortisol on an already stressed system.",
  today:       "Your one real focus window is 11am–1pm. Protect it.",
  avoid:       "Intense training. You'll create more debt, not fitness.",
};

// ─── Notification scheduler ───────────────────────────────────────────────────

async function scheduleReminders(prescription: typeof FALLBACK_PRESCRIPTION): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let permission = Notification.permission;
  if (permission === "default") {
    try { permission = await Notification.requestPermission(); }
    catch { return false; }
  }
  if (permission !== "granted") return false;

  const reminders = [
    { delay: 60000,      title: "💧 Right now",     body: prescription.rightNow },
    { delay: 30 * 60000, title: "☕ This morning",  body: prescription.thisMorning },
    { delay: 90 * 60000, title: "🎯 Today",          body: prescription.today },
  ];

  reminders.forEach(r => {
    setTimeout(() => {
      try { new Notification(r.title, { body: r.body }); }
      catch { /* silent */ }
    }, r.delay);
  });

  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PrescriptionScreen() {
  const router = useRouter();
  const { analysis, confidenceTier, orbPersonality } = useBodyDebtStore();
  const user = useEazo((s) => s.auth.user);
  const isGuest = !user && !!analysis;
  const personalityCopy = getOrbCopy(orbPersonality);
  const rx = analysis?.prescription ?? FALLBACK_PRESCRIPTION;
  const score = analysis?.debtScore ?? 0;

  const [remindersSet, setRemindersSet] = useState(false);
  const [reminderPending, setReminderPending] = useState(false);
  const reportedView = useRef(false);

  // Report prescription view once
  useEffect(() => {
    if (reportedView.current) return;
    reportedView.current = true;
    memory.reportAction({
      content: `User viewed prescription. Score: ${score}.`,
      event_type: "page_view",
      page: "prescription",
      metadata: { type: "view_prescription", debt_score: score },
    }).catch(() => {});
  }, [score]);

  const handleSetReminders = async () => {
    setReminderPending(true);
    const success = await scheduleReminders(rx);
    setReminderPending(false);
    if (success) {
      setRemindersSet(true);
      memory.reportAction({
        content: "User set prescription reminders.",
        event_type: "create",
        page: "prescription",
        metadata: { type: "set_reminders" },
      }).catch(() => {});
    }
  };

  return (
    <div className="relative min-h-svh flex flex-col px-5 overflow-hidden"
      style={{ backgroundColor: "#0A0A0B" }}>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between mt-12">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-[11px] font-medium"
          style={{ color: "#A8A29E", minHeight: "44px" }}
        >
          <ChevronLeft className="w-4 h-4" />
          Score
        </button>
        <MiniOrb score={score} size={28} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 mt-4 mb-6"
      >
        <h1 className="font-black uppercase tracking-widest"
          style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.1rem,5vw,1.4rem)", color: "#F5F5F4", letterSpacing: "0.08em" }}>
          {personalityCopy.prescriptionHeader}
        </h1>
        <p className="text-xs mt-1" style={{ color: "#524F4C" }}>
          Based on your current body state. Specific. Actionable.
        </p>
      </motion.div>

      {/* Directive blocks — always fully expanded */}
      <div className="relative z-10 flex flex-col gap-3">
        {COMMAND_BLOCKS.map(({ key, label, icon, labelColor }, i) => (
          <motion.div key={key}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
          >
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-1">
              <span className="text-base flex-shrink-0">{icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: labelColor }}>
                {label}
              </span>
            </div>
            <p className="px-4 pb-4 text-sm leading-relaxed font-medium" style={{ color: "#F5F5F4" }}>
              {rx[key]}
            </p>
          </motion.div>
        ))}

        {/* Reminder prompt */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="rounded-2xl px-4 py-4"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.2)" }}
        >
          <AnimatePresence mode="wait">
            {remindersSet ? (
              <motion.div key="set"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center">
                <p className="text-sm font-semibold" style={{ color: "#4ADE80" }}>✓ Reminders set</p>
                <p className="text-[10px] mt-1" style={{ color: "#524F4C" }}>
                  Your orb will prompt you throughout the day.
                </p>
              </motion.div>
            ) : (
              <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#F5F5F4" }}>
                  {personalityCopy.reminderPrompt}
                </p>
                <p className="text-[10px] mb-3" style={{ color: "#524F4C" }}>
                  One tap sets timed nudges from this prescription.
                </p>
                <motion.button whileTap={{ scale: 0.98 }} onClick={handleSetReminders}
                  disabled={reminderPending}
                  className="w-full text-xs font-semibold rounded-xl"
                  style={{
                    backgroundColor: reminderPending ? "rgba(234,88,12,0.4)" : "#EA580C",
                    color: "#F5F5F4", minHeight: 44, fontFamily: "var(--font-body)",
                  }}>
                  {reminderPending ? "Setting reminders..." : "Set reminders"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upsell — only at low confidence */}
        {(confidenceTier === "partial" || confidenceTier === "estimated") && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="rounded-2xl px-4 py-4 text-center"
            style={{ backgroundColor: "#141416", border: "1px solid rgba(168,162,158,0.08)" }}
          >
            <p className="text-xs italic mb-1" style={{ color: "#A8A29E" }}>
              &ldquo;I can see more if you let me.&rdquo;
            </p>
            <p className="text-[10px] mb-3" style={{ color: "#524F4C" }}>
              Face scan + wearable data makes this prescription 3× more precise.
            </p>
            <motion.button whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/face-scan")}
              className="text-[10px] font-semibold uppercase tracking-wider px-4 py-2 rounded-xl"
              style={{ backgroundColor: "rgba(234,88,12,0.15)", color: "#EA580C", border: "1px solid rgba(234,88,12,0.3)" }}>
              7 days free · give your orb more signal
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Auth upgrade */}
      {isGuest && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 mt-6 rounded-2xl p-4 text-center"
          style={{ backgroundColor: "#141416", border: "1px solid rgba(234,88,12,0.25)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#F5F5F4" }}>
            Your data is saved on this device
          </p>
          <p className="text-[10px] mb-3" style={{ color: "#A8A29E" }}>
            Sign in to keep your history across devices and unlock AI-powered insights.
          </p>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => auth.login().catch(() => undefined)}
            className="text-xs font-semibold px-5 py-2.5 rounded-xl"
            style={{ backgroundColor: "#EA580C", color: "#F5F5F4" }}>
            Sign in to save
          </motion.button>
        </motion.div>
      )}

      {/* Bottom CTAs */}
      <div className="relative z-10 pb-10 pt-6 flex flex-col gap-2">
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/share-card")}
          className="w-full font-semibold text-sm rounded-2xl"
          style={{ backgroundColor: "#EA580C", color: "#F5F5F4", fontFamily: "var(--font-body)", minHeight: 56 }}>
          Share my score
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/dashboard")}
          className="w-full font-semibold text-xs rounded-2xl"
          style={{ backgroundColor: "#141416", color: "#A8A29E", border: "1px solid rgba(168,162,158,0.15)", minHeight: 48 }}>
          ← Back to score
        </motion.button>
      </div>
    </div>
  );
}
