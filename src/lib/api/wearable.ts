import type { HRVData } from "@/lib/types";
import { request } from "./request";

// ─── Terra ─────────────────────────────────────────────────────────────────────

export interface TerraWidgetResponse {
  url: string;
  sessionId: string;
}

export interface TerraDataResponse {
  hrvData: HRVData;
  provider?: string;
  rawHrvRmssd?: number | null;
  rawRestingHr?: number | null;
}

/**
 * Generates a Terra widget session URL for OAuth.
 * POST /api/terra/widget
 */
export async function getTerraWidgetSession(): Promise<TerraWidgetResponse> {
  const res = await request("/api/terra/widget", {
    method: "POST",
    body: "{}",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.message ?? json.error);
  return json as TerraWidgetResponse;
}

// Discriminated union: either Terra data or a non-fatal error
// (NO_SLEEP_DATA is the expected non-fatal case)
export type TerraDataResult =
  | { hrvData: HRVData; provider?: string; rawHrvRmssd?: number | null; rawRestingHr?: number | null }
  | { error: string; message?: string };

/**
 * Fetches sleep + HRV data from Terra for a connected user.
 * GET /api/terra/data?terraUserId=...
 */
export async function getTerraData(
  terraUserId: string
): Promise<TerraDataResult> {
  const res = await request(
    `/api/terra/data?terraUserId=${encodeURIComponent(terraUserId)}`
  );
  const json = await res.json();

  if (json.error) {
    // NO_SLEEP_DATA is non-fatal — caller can use a conservative estimate
    return json as TerraDataResult;
  }

  return json as TerraDataResult;
}

// ─── Garmin CSV ────────────────────────────────────────────────────────────────

export interface GarminParseResponse {
  hrvData: HRVData;
}

/**
 * Parses a Garmin Connect HRV CSV export.
 * POST /api/garmin/parse
 */
export async function parseGarminCsv(
  csvText: string
): Promise<GarminParseResponse> {
  const res = await request("/api/garmin/parse", {
    method: "POST",
    body: JSON.stringify({ csvText }),
  });
  const json = await res.json();
  if (!res.ok || !json.hrvData) {
    throw new Error(json.message ?? "Could not read this file.");
  }
  return json as GarminParseResponse;
}

// ─── Google Fit ────────────────────────────────────────────────────────────────

export interface GoogleFitDataResponse {
  hrvData: HRVData;
}

/**
 * Pulls sleep data from Google Fit REST API using an OAuth access token.
 * POST /api/google-fit/data
 */
export async function getGoogleFitData(
  accessToken: string
): Promise<GoogleFitDataResponse> {
  const res = await fetch("/api/google-fit/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Google Fit fetch failed");
  return json as GoogleFitDataResponse;
}

// ─── Unified HRV resolve ───────────────────────────────────────────────────────

export interface HrvResolveResponse {
  hrvData: HRVData | null;
  resolvedLayer: string;
  sourceLabel?: string;
}

/**
 * Walks the HRV fallback chain: Terra → (client-side HealthKit) → Google Fit.
 * Pass ?demo=true for simulated data.
 * GET /api/hrv/resolve
 */
export async function resolveHrv(
  terraUserId?: string,
  demo: boolean = false
): Promise<HrvResolveResponse> {
  const params = new URLSearchParams();
  if (terraUserId) params.set("terraUserId", terraUserId);
  if (demo) params.set("demo", "true");

  const res = await request(`/api/hrv/resolve?${params.toString()}`);
  return (await res.json()) as HrvResolveResponse;
}
