// ─── Wake-time slots: 4:00 AM – 12:00 PM in 30-min increments ─────────────
export function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 4; h <= 11; h++) {
    ["00", "30"].forEach((m) => {
      slots.push(`${h}:${m} ${h < 12 ? "AM" : "PM"}`);
    });
  }
  slots.push("12:00 PM");
  return slots;
}

// ─── Bedtime slots: 6:00 PM – 4:30 AM in 30-min increments ────────────────
export function buildBedtimeSlots(): string[] {
  const slots: string[] = [];
  // 6pm → 11:30pm
  for (let h = 18; h <= 23; h++) {
    ["00", "30"].forEach((m) => {
      const disp = h > 12 ? `${h - 12}:${m} PM` : `${h}:${m} PM`;
      slots.push(disp);
    });
  }
  // 12:00am → 4:30am
  for (let h = 0; h <= 4; h++) {
    const minutes = ["00", "30"];
    minutes.forEach((m) => {
      if (h === 4 && m === "30") return;
      const disp = h === 0 ? `12:${m} AM` : `${h}:${m} AM`;
      slots.push(disp);
    });
  }
  return slots;
}

// ─── Circadian alignment feedback ──────────────────────────────────────────
export function getCircadianNote(slot: string): { label: string; color: string; penalty: "none" | "mild" | "significant" } {
  const isPM = slot.includes("PM");
  const isAM = slot.includes("AM");
  const parts = slot.replace(/ AM| PM/, "").split(":");
  let h = parseInt(parts[0], 10);
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;

  if (h >= 22 || h === 21) return { label: "Aligned. Good circadian timing.", color: "var(--color-states-success)", penalty: "none" };
  if (h >= 20) return { label: "Slightly early — still aligned.", color: "var(--color-states-success)", penalty: "none" };
  if (h >= 18) return { label: "Very early. Light sleep debt possible.", color: "var(--color-states-warning)", penalty: "mild" };
  if (h >= 0 && h <= 1) return { label: "Mildly misaligned. Brain recovery affected.", color: "var(--color-states-warning)", penalty: "mild" };
  if (h >= 2 && h <= 4) return { label: "Significant circadian misalignment. Debt elevated.", color: "var(--color-states-error)", penalty: "significant" };
  return { label: "Aligned. Optimal recovery window.", color: "var(--color-states-success)", penalty: "none" };
}
