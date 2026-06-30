/**
 * Debt score band classification.
 *
 * Single source of truth for the 4-tier debt scale used across the
 * client (color, glow, gradient stops) and the API route (verdict
 * text). Thresholds: 0–20 clear, 21–40 mild, 41–60 elevated, 61–100
 * critical. The English-default label helper exposes the 5-tier
 * vocabulary ("Damage control" → "Working overtime" → "Elevated
 * burden" → "Mild debt" → "Body is clear") used in the gauge and
 * share card; i18n overrides live in `src/lib/i18n.ts`.
 */

export type DebtBand = "clear" | "mild" | "elevated" | "critical";

export interface DebtBandMeta {
  band: DebtBand;
  /** Primary text/icon/border color. */
  color: string;
  /** Secondary color for gradients. */
  colorSecondary: string;
  /** Glow color (with alpha) for shadows and halos. */
  glow: string;
  /** True when score >= 61. */
  isCritical: boolean;
  /** True when score >= 41 (includes critical). */
  isElevated: boolean;
}

export const DEBT_BAND_META: Record<
  DebtBand,
  Omit<DebtBandMeta, "band" | "isCritical" | "isElevated">
> = {
  clear:    { color: "var(--color-states-success)", colorSecondary: "var(--color-states-success)", glow: "rgba(74,222,128,0.25)" },
  mild:     { color: "var(--color-states-warning)", colorSecondary: "var(--color-states-warning)", glow: "rgba(245,158,11,0.25)" },
  elevated: { color: "var(--color-brand-primary)",  colorSecondary: "var(--color-states-warning)", glow: "rgba(234,88,12,0.3)"  },
  critical: { color: "var(--color-states-error)",   colorSecondary: "var(--color-brand-primary)",  glow: "rgba(220,38,38,0.35)" },
};

export function debtBand(score: number): DebtBand {
  if (score >= 61) return "critical";
  if (score >= 41) return "elevated";
  if (score >= 21) return "mild";
  return "clear";
}

export function bandMeta(score: number): DebtBandMeta {
  const band = debtBand(score);
  return {
    band,
    ...DEBT_BAND_META[band],
    isCritical: band === "critical",
    isElevated: band === "elevated" || band === "critical",
  };
}

/** Solid tinted background for score swatches (heatmap, legend). */
export function bandBackground(score: number): string {
  if (score >= 61) return "rgba(220,38,38,0.25)";
  if (score >= 41) return "rgba(234,88,12,0.25)";
  if (score >= 21) return "rgba(245,158,11,0.25)";
  return "rgba(74,222,128,0.25)";
}

/** Faint tint for cells with no data (negative sentinel). */
export const BAND_BG_NONE = "rgba(168,162,158,0.04)";

/** Short 5-tier English label for tight surfaces. */
export function bandLabel(score: number): string {
  if (score >= 81) return "Damage control";
  if (score >= 61) return "Working overtime";
  if (score >= 41) return "Elevated burden";
  if (score >= 21) return "Mild debt";
  return "Body is clear";
}

/** Short 5-tier label for the heatmap legend (different vocabulary). */
export function bandLegend(score: number): string {
  if (score >= 61) return "High";
  if (score >= 41) return "Elevated";
  if (score >= 21) return "Mild";
  if (score > 0)  return "Low";
  return "No data";
}

/** Short status verb for inline band callouts (e.g. "Above baseline"). */
export function bandVerb(score: number): string {
  if (score >= 61) return "This is significant";
  if (score >= 41) return "Above baseline";
  return "Below threshold";
}
