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
  return parseGarminUpload({ csvText });
}

/**
 * Parses a Garmin .FIT file (base64-encoded).
 * POST /api/garmin/parse
 */
export async function parseGarminFit(
  fitBase64: string
): Promise<GarminParseResponse> {
  return parseGarminUpload({ fitBase64 });
}

async function parseGarminUpload(
  body: { csvText: string } | { fitBase64: string }
): Promise<GarminParseResponse> {
  const res = await request("/api/garmin/parse", {
    method: "POST",
    body: JSON.stringify(body),
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

// ─── Apple Health ──────────────────────────────────────────────────────────────

export interface AppleHealthParseResponse {
  hrvData: HRVData;
}

/**
 * Parses an Apple Health export XML extracted from export.zip.
 * POST /api/apple-health/parse
 */
export async function parseAppleHealth(
  xmlText: string,
  filename = "export.xml"
): Promise<AppleHealthParseResponse> {
  const form = new FormData();
  form.append("xml", new Blob([xmlText], { type: "text/xml" }), filename);

  const res = await request("/api/apple-health/parse", {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.hrvData) {
    throw new Error(json.message ?? "Could not parse Apple Health export.");
  }
  return json as AppleHealthParseResponse;
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

// ─── Trend history ─────────────────────────────────────────────────────────────

export interface WearableTrendPoint {
  date: string;
  hrv?: number;
  restingHr?: number;
  deep?: number;
  rem?: number;
  light?: number;
}

export interface WearableTrendResponse {
  trend: WearableTrendPoint[];
  days: number;
}

/**
 * Fetches the authenticated user's per-day wearable trend.
 * GET /api/wearables/trend?days=...
 */
export async function getWearableTrend(days = 14): Promise<WearableTrendResponse> {
  const res = await request(`/api/wearables/trend?days=${days}`);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to load wearable trend");
  }
  return (await res.json()) as WearableTrendResponse;
}

// ─── Withings ──────────────────────────────────────────────────────────────────

export interface WithingsAuthResponse {
  url: string;
  state: string;
}

export interface WithingsDataResponse {
  hrvData: HRVData;
}

/**
 * Starts a Withings OAuth popup flow.
 * POST /api/withings/auth
 */
export async function startWithingsAuth(): Promise<WithingsAuthResponse> {
  const res = await request("/api/withings/auth", { method: "POST", body: "{}" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Withings auth failed");
  return json as WithingsAuthResponse;
}

/**
 * Polls Withings sleep data for the authenticated user.
 * GET /api/withings/data
 */
export async function getWithingsData(): Promise<WithingsDataResponse> {
  const res = await request("/api/withings/data");
  const json = await res.json();
  if (!res.ok || !json.hrvData) {
    throw new Error(json.message ?? "Withings data fetch failed");
  }
  return json as WithingsDataResponse;
}
