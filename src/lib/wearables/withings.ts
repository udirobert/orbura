import { randomBytes } from "crypto";
import type { WearableSnapshot } from "@/lib/baselines";
import { getWithingsToken, saveWithingsToken, type WithingsTokenRecord } from "@/lib/db/queries";

const AUTHORIZE_URL = "https://account.withings.com/oauth2_user/authorize2";
const TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const SLEEP_URL = "https://wbsapi.withings.net/v2/sleep";
const MEASURE_URL = "https://wbsapi.withings.net/measure";

// Withings meastypes: 1=weight(kg), 9=diastolic BP, 10=systolic BP
const MEASTYPE_WEIGHT = 1;
const MEASTYPE_BP_DIASTOLIC = 9;
const MEASTYPE_BP_SYSTOLIC = 10;

function getConfig() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  const redirectUri = getRedirectUri();
  if (!clientId || !clientSecret) {
    throw new Error("WITHINGS_CLIENT_ID and WITHINGS_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret, redirectUri };
}

function getRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin}/api/withings/callback`;
}

export function buildWithingsAuthUrl(state: string): string {
  const { clientId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    state,
    scope: "user.info,user.metrics,user.activity,user.sleepevents",
    redirect_uri: redirectUri,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface WithingsTokenResponse {
  status: number;
  body?: {
    userid?: string;
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
  };
}

export async function exchangeWithingsCode(code: string): Promise<WithingsTokenRecord | null> {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const body = new URLSearchParams({
    action: "requesttoken",
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as WithingsTokenResponse;
  return normalizeTokenResponse(json);
}

export async function refreshWithingsToken(
  record: WithingsTokenRecord
): Promise<WithingsTokenRecord | null> {
  const { clientId, clientSecret } = getConfig();
  const body = new URLSearchParams({
    action: "requesttoken",
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: record.refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as WithingsTokenResponse;
  const next = normalizeTokenResponse(json);
  if (!next) return null;
  // Preserve userId mapping if Withings does not return it on refresh.
  return { ...next, userId: record.userId, withingsUserId: next.withingsUserId ?? record.withingsUserId };
}

function normalizeTokenResponse(json: WithingsTokenResponse): WithingsTokenRecord | null {
  if (json.status !== 0 || !json.body?.access_token || !json.body?.refresh_token) return null;
  const { body } = json;
  return {
    userId: "", // filled by caller
    accessToken: body.access_token as string,
    refreshToken: body.refresh_token as string,
    withingsUserId: body.userid != null ? String(body.userid) : null,
    scope: body.scope ?? null,
    expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : null,
  };
}

async function getValidToken(userId: string): Promise<WithingsTokenRecord | null> {
  const record = await getWithingsToken(userId);
  if (!record) return null;

  if (record.expiresAt && record.expiresAt.getTime() > Date.now() + 60_000) {
    return record;
  }

  const refreshed = await refreshWithingsToken(record);
  if (!refreshed) return null;
  refreshed.userId = userId;
  await saveWithingsToken({
    userId,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    withingsUserId: refreshed.withingsUserId,
    scope: refreshed.scope,
    expiresAt: refreshed.expiresAt,
  });
  return refreshed;
}

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface SleepSeriesData {
  total_timeinbed?: number;
  total_sleep_time?: number;
  deepsleepduration?: number;
  remsleepduration?: number;
  lightsleepduration?: number;
  hr_average?: number;
  hr_min?: number;
  hr_max?: number;
  rmssd_start_avg?: number;
  rmssd_end_avg?: number;
  sleep_score?: number;
  sleep_efficiency?: number;
}

interface SleepSeriesItem {
  date: string;
  startdate: number;
  enddate: number;
  data: SleepSeriesData;
}

interface SleepSummaryResponse {
  status: number;
  body?: {
    series?: SleepSeriesItem[];
    more?: number;
  };
}

async function fetchSleepSummary(accessToken: string, startYmd: string, endYmd: string): Promise<SleepSeriesItem[]> {
  const fields = [
    "total_timeinbed",
    "total_sleep_time",
    "deepsleepduration",
    "remsleepduration",
    "lightsleepduration",
    "hr_average",
    "hr_min",
    "hr_max",
    "rmssd_start_avg",
    "rmssd_end_avg",
    "sleep_score",
    "sleep_efficiency",
  ].join(",");

  const body = new URLSearchParams({
    action: "getsummary",
    startdateymd: startYmd,
    enddateymd: endYmd,
    data_fields: fields,
  });

  const res = await fetch(SLEEP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body.toString(),
  });

  const json = (await res.json()) as SleepSummaryResponse;
  if (json.status !== 0 || !json.body?.series) return [];
  return json.body.series;
}

interface MeasureValue {
  type: number;
  value: number;
  unit: number; // real value = value * 10^unit
}

interface MeasureGroup {
  grpid: number;
  date: number; // unix seconds
  measures: MeasureValue[];
}

interface MeasureResponse {
  status: number;
  body?: {
    measuregrps?: MeasureGroup[];
    more?: number;
  };
}

async function fetchMeasures(
  accessToken: string,
  startdate: number,
  enddate: number
): Promise<MeasureGroup[]> {
  const body = new URLSearchParams({
    action: "getmeas",
    meastypes: `${MEASTYPE_WEIGHT},${MEASTYPE_BP_SYSTOLIC},${MEASTYPE_BP_DIASTOLIC}`,
    category: "1", // real measurements only — excludes objectives/ambiguous
    startdate: String(startdate),
    enddate: String(enddate),
  });

  const res = await fetch(MEASURE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body.toString(),
  });

  const json = (await res.json()) as MeasureResponse;
  if (json.status !== 0 || !json.body?.measuregrps) return [];
  return json.body.measuregrps;
}

/** Real-world value of a measure entry — Withings encodes as value * 10^unit. */
function measureValue(m: MeasureValue): number {
  return m.value * Math.pow(10, m.unit);
}

function pickMeasure(grp: MeasureGroup, type: number): number | undefined {
  const m = grp.measures.find((x) => x.type === type);
  if (!m) return undefined;
  const v = measureValue(m);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : undefined;
}

function avg(...values: (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
}

export async function fetchWithingsHRV(userId: string): Promise<WearableSnapshot | null> {
  const token = await getValidToken(userId);
  if (!token) return null;

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);

  const [series, measureGroups] = await Promise.all([
    fetchSleepSummary(token.accessToken, ymd(start), ymd(end)),
    fetchMeasures(
      token.accessToken,
      Math.floor(start.getTime() / 1000),
      Math.floor(end.getTime() / 1000)
    ).catch(() => [] as MeasureGroup[]),
  ]);
  if (!series.length) return null;

  // Latest measurement group — scale/BP readings have their own timestamp.
  const latestGrp = [...measureGroups].sort((a, b) => b.date - a.date)[0];
  const measures = latestGrp
    ? {
        weightKg: pickMeasure(latestGrp, MEASTYPE_WEIGHT),
        bpSystolic: pickMeasure(latestGrp, MEASTYPE_BP_SYSTOLIC),
        bpDiastolic: pickMeasure(latestGrp, MEASTYPE_BP_DIASTOLIC),
        recordedAt: new Date(latestGrp.date * 1000),
      }
    : undefined;

  // Withings returns series oldest first; use the latest completed night.
  const latest = [...series].reverse().find((s) => s.data && s.enddate > 0) ?? series[series.length - 1];
  const data = latest.data;
  const recordedAt = new Date(latest.enddate * 1000);

  const hrv = avg(data.rmssd_start_avg, data.rmssd_end_avg);
  const restingHr = data.hr_average;

  const hasHrv = hrv != null && Number.isFinite(hrv);
  const hasSleepStages =
    data.deepsleepduration != null ||
    data.remsleepduration != null ||
    data.lightsleepduration != null;

  const sleepStages = hasSleepStages
    ? {
        deep: Math.round((data.deepsleepduration ?? 0) / 60),
        rem: Math.round((data.remsleepduration ?? 0) / 60),
        light: Math.round((data.lightsleepduration ?? 0) / 60),
      }
    : undefined;

  return {
    source: "withings",
    recordedAt,
    hrvValue: hasHrv ? Math.round(hrv) : undefined,
    hrvMetric: hasHrv ? "hrv_rmssd" : undefined,
    restingHr: restingHr != null ? Math.round(restingHr) : undefined,
    sleepStages,
    measures,
    confidence: hasHrv ? "high" : restingHr != null ? "medium" : "low",
  };
}

export function generateWithingsState(): string {
  return randomBytes(16).toString("hex");
}
