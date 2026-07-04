"use client";

import { useEffect, useRef } from "react";
import type { SystemScore } from "@/lib/types";

/**
 * SystemClearanceNotifier
 *
 * Schedules browser Notification API reminders for each system clearance time.
 * Works when the tab is open; gracefully skips when permission is not granted.
 *
 * For background delivery (tab closed), a server-side push via the
 * notifications cron endpoint would be needed — deferred to a future pass.
 *
 * Copy from the product brief:
 *   "🫀 Heart cleared. Cardio is back on the table."
 *   "🧠 Brain fog lifted. Your full focus window is open."
 *   "🫁 Liver processed. You're metabolically clear."
 *   "💪 CNS recovered. Train when you're ready."
 *   "🦠 Gut settled. All digestive systems green."
 */

const CLEARANCE_COPY: Record<string, { title: string; body: string }> = {
  cardiovascular: { title: "🫀 Heart cleared",   body: "Cardio is back on the table." },
  brain:          { title: "🧠 Brain fog lifted", body: "Your full focus window is open." },
  liver:          { title: "🫁 Liver processed",  body: "You're metabolically clear." },
  muscular:       { title: "💪 CNS recovered",    body: "Train when you're ready." },
  gut:            { title: "🦠 Gut settled",      body: "All digestive systems green." },
};

const ALL_CLEAR = { title: "All clear 🟢", body: "Your body paid the debt." };

interface Props {
  systems: SystemScore[];
  analysisId?: string | number;
}

export function SystemClearanceNotifier({ systems, analysisId }: Props) {
  const lastScheduledId = useRef<string | number | undefined>(undefined);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Only schedule once per analysis session
    if (!systems?.length) return;
    if (analysisId === lastScheduledId.current) return;
    lastScheduledId.current = analysisId;

    // Clear any previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    scheduleWithBrowserAPI(systems, timersRef.current);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [systems, analysisId]);

  return null;
}

async function scheduleWithBrowserAPI(
  systems: SystemScore[],
  timers: ReturnType<typeof setTimeout>[]
) {
  if (typeof window === "undefined") return;

  // Request permission if not yet granted
  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return; // Browser doesn't support Notification API
    }
  }
  if (permission !== "granted") return;

  const now = Date.now();

  // Determine if all systems clear within the same hour
  const futureClearTimes = systems
    .filter(s => s.hasData && s.clearedAt && new Date(s.clearedAt).getTime() > now)
    .map(s => new Date(s.clearedAt).getTime());

  const allSameHour =
    futureClearTimes.length === systems.length &&
    futureClearTimes.length > 0 &&
    new Set(futureClearTimes.map(t => Math.floor(t / 3600000))).size === 1;

  if (allSameHour && futureClearTimes.length > 0) {
    // Single "All clear" notification at the latest clearance time
    const fireAt = Math.max(...futureClearTimes);
    const delay = fireAt - now;
    if (delay > 0 && delay < 24 * 3600 * 1000) {
      timers.push(setTimeout(() => {
        new Notification(ALL_CLEAR.title, { body: ALL_CLEAR.body, icon: "/icon-192.png" });
      }, delay));
    }
    return;
  }

  // Individual system notifications
  for (const sys of systems) {
    if (!sys.hasData || !sys.clearedAt) continue;
    const fireAt = new Date(sys.clearedAt).getTime();
    const delay = fireAt - now;

    // Only schedule if it fires within the next 24hrs and is in the future
    if (delay <= 0 || delay > 24 * 3600 * 1000) continue;

    const copy = CLEARANCE_COPY[sys.system];
    if (!copy) continue;

    timers.push(setTimeout(() => {
      try {
        new Notification(copy.title, { body: copy.body, icon: "/icon-192.png" });
      } catch {
        // Notification constructor failed — silently skip
      }
    }, delay));
  }
}
