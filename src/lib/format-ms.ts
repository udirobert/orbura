/**
 * Format a millisecond value for display.
 * Returns e.g. "800ms" or "21.5s".
 */
export function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
