"use client";

import { useEffect, useState } from "react";
import { getTodayState } from "@/lib/api/today";
import type { TodayState } from "@/lib/today/types";
import { TodayScreen } from "./TodayScreen";

/**
 * Fetches the canonical TodayState and renders the adaptive surface.
 * Renders nothing for guests or on failure — the dashboard keeps its
 * existing guest-first flow.
 */
export function TodayCard() {
  const [state, setState] = useState<TodayState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTodayState()
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  return (
    <div className="relative z-10 px-1 mb-6">
      <TodayScreen state={state} />
    </div>
  );
}
