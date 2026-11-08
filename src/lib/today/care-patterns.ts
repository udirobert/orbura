import type { CareObservationRow } from "@/lib/db/schema/care";

const SEVERITY_SCORE = { mild: 1, moderate: 2, severe: 3 } as const;
const WINDOW_DAYS = 90;
const MIN_OBSERVATIONS = 3;

function symptomLabel(s: string) {
  return s.replace(/_/g, " ");
}

/**
 * Observation-style pattern lines from a care patient's check-in history.
 * Each line is a fact about the record — never a causal claim. Returns []
 * when there isn't enough history to say anything honest.
 */
export function buildCarePatternLines(
  observations: Pick<CareObservationRow, "checkInAt" | "symptoms" | "symptomSeverity" | "adherence">[],
  now: Date = new Date(),
): string[] {
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const obs = observations
    .filter((o) => o.checkInAt.getTime() >= cutoff)
    .sort((a, b) => a.checkInAt.getTime() - b.checkInAt.getTime());
  if (obs.length < MIN_OBSERVATIONS) return [];

  const lines: string[] = [];

  // Most frequently reported symptom.
  const counts = new Map<string, number>();
  for (const o of obs) {
    for (const s of new Set(o.symptoms)) {
      if (s === "none") continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const [topSymptom, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topSymptom && topCount >= 2 && topCount / obs.length >= 0.3) {
    lines.push(
      `${symptomLabel(topSymptom)} is your most frequent check-in symptom — reported in ${topCount} of ${obs.length} check-ins.`,
    );
  }

  // Severity trend: compare the older half of the window against the newer half.
  const mid = Math.floor(obs.length / 2);
  const avgSeverity = (rows: typeof obs) =>
    rows.reduce((sum, o) => sum + SEVERITY_SCORE[o.symptomSeverity], 0) / rows.length;
  const delta = avgSeverity(obs.slice(mid)) - avgSeverity(obs.slice(0, mid));
  if (Math.abs(delta) >= 0.5) {
    lines.push(
      delta < 0
        ? "Reported symptom severity has eased across your recent check-ins."
        : "Reported symptom severity has risen across your recent check-ins.",
    );
  }

  // Missed / stopped treatment reports.
  const missed = obs.filter(
    (o) => o.adherence === "missed_one_dose" || o.adherence === "missed_multiple",
  ).length;
  const stopped = obs.filter((o) => o.adherence === "stopped").length;
  const totalMissed = missed + stopped;
  if (totalMissed >= 2) {
    lines.push(
      `You've reported missed or stopped treatment in ${totalMissed} of your last ${obs.length} check-ins.`,
    );
  }

  return lines.slice(0, 3);
}
