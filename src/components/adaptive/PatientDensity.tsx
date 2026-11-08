"use client";

import type { TodayState } from "@/lib/today/types";
import { TodayScreen } from "@/components/screens/TodayScreen";

/**
 * Patient density — the production TodayScreen, reused verbatim so the
 * preview proves the real component, not a mock.
 */
export function PatientDensity({ state }: { state: TodayState }) {
  return (
    <div className="max-w-md mx-auto">
      <TodayScreen state={state} />
    </div>
  );
}
