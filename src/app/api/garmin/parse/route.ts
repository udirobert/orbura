import { NextRequest, NextResponse } from "next/server";
import FitParser from "fit-file-parser";
import type { HRVData } from "@/lib/types";

export const maxDuration = 10;

const POPULATION_BASELINE_HRV = 65;
const POPULATION_BASELINE_HR = 60;

/**
 * POST /api/garmin/parse
 *
 * Body:
 *   { csvText: string }   — legacy Garmin Connect HRV CSV export
 *   { fitBase64: string } — Garmin .FIT file, base64-encoded
 *
 * Parses either source and returns HRVData. Never shows a raw error to the user.
 */
export async function POST(request: NextRequest) {
  let body: { csvText?: string; fitBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.csvText) {
    if (typeof body.csvText !== "string") {
      return NextResponse.json({ error: "csvText must be a string" }, { status: 400 });
    }
    try {
      const result = parseGarminHRVCsv(body.csvText);
      if (!result) {
        return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
      }
      return NextResponse.json({ hrvData: result });
    } catch {
      return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
    }
  }

  if (body.fitBase64) {
    if (typeof body.fitBase64 !== "string") {
      return NextResponse.json({ error: "fitBase64 must be a string" }, { status: 400 });
    }
    try {
      const result = await parseGarminFitBase64(body.fitBase64);
      if (!result) {
        return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
      }
      return NextResponse.json({ hrvData: result });
    } catch {
      return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
    }
  }

  return NextResponse.json({ error: "csvText or fitBase64 required" }, { status: 400 });
}

function parseGarminHRVCsv(csv: string): HRVData | null {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Find header row — may not be the first line in all Garmin exports
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().includes("last night") || l.toLowerCase().includes("baseline")
  );
  if (headerIdx < 0) return null;

  const headers = splitCsvRow(lines[headerIdx]).map((h) =>
    h.toLowerCase().trim().replace(/['"]/g, "")
  );

  // Find the most recent data row (first non-empty row after header)
  const dataRow = lines
    .slice(headerIdx + 1)
    .map(splitCsvRow)
    .find((row) => row.some((cell) => cell.trim() !== ""));

  if (!dataRow) return null;

  const get = (partial: string): number | null => {
    const idx = headers.findIndex((h) => h.includes(partial.toLowerCase()));
    if (idx < 0 || idx >= dataRow.length) return null;
    const raw = dataRow[idx].replace(/[^0-9.-]/g, "");
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  };

  const lastNightAvg  = get("last night's average") ?? get("last night average");
  const baselineLow   = get("baseline low");
  const baselineHigh  = get("baseline high");

  if (lastNightAvg === null) return null;

  // Derive personal baseline midpoint; fall back to population average
  const baselineMid = baselineLow !== null && baselineHigh !== null
    ? (baselineLow + baselineHigh) / 2
    : POPULATION_BASELINE_HRV;

  const hrvDeltaPercent = Math.round(((lastNightAvg - baselineMid) / baselineMid) * 100);

  return {
    hrvDeltaPercent: Math.max(-80, Math.min(30, hrvDeltaPercent)),
    restingHrDelta: 0, // not in HRV export
    source: "garmin_export",
    confidence: "medium", // real data, but potentially from yesterday or earlier
  };
}

async function parseGarminFitBase64(fitBase64: string): Promise<HRVData | null> {
  const buffer = Buffer.from(fitBase64, "base64");
  const parser = new FitParser({ mode: "list" });
  // fit-file-parser accepts Buffer at runtime; its own types use the bundled
  // buffer package's Buffer, so we cast through unknown to avoid a TS mismatch.
  const parsed = await parser.parseAsync(buffer as unknown as ArrayBuffer);
  return extractHRVDataFromFit(parsed as unknown as Record<string, unknown>);
}

function extractHRVDataFromFit(data: Record<string, unknown>): HRVData | null {
  const hrvSummary = first(data.hrv_status_summary) as Record<string, unknown> | undefined;
  const lastNightHrv = hrvSummary?.last_night_average as number | undefined;

  // Try session average/min heart rate, then fall back to 10th percentile of records.
  let restingHr: number | null = null;
  const sessions = toArray(data.sessions);
  for (const s of sessions) {
    const hr = (s as Record<string, unknown>)?.avg_heart_rate as number | undefined;
    if (hr != null) { restingHr = hr; break; }
  }
  if (restingHr == null) {
    const records = toArray(data.records);
    const hrs = records
      .map((r) => (r as Record<string, unknown>)?.heart_rate as number | undefined)
      .filter((v): v is number => v != null);
    if (hrs.length > 0) {
      const sorted = [...hrs].sort((a, b) => a - b);
      restingHr = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0];
    }
  }

  if (lastNightHrv == null && restingHr == null) {
    return null;
  }

  const baselineHrv = hrvSummary?.weekly_average as number | undefined ?? POPULATION_BASELINE_HRV;
  const baselineHr = POPULATION_BASELINE_HR;

  let hrvDeltaPercent: number;
  let confidence: "high" | "medium" | "low";

  if (lastNightHrv != null) {
    hrvDeltaPercent = Math.round(((lastNightHrv - baselineHrv) / baselineHrv) * 100);
    confidence = "high";
  } else {
    const hrDelta = (restingHr ?? baselineHr) - baselineHr;
    hrvDeltaPercent = Math.max(-60, Math.min(20, Math.round(-hrDelta * 1.5)));
    confidence = "medium";
  }

  const restingHrDelta = restingHr != null ? Math.round(restingHr - baselineHr) : 0;
  const sleepStages = extractFitSleepStages(data);

  return {
    hrvDeltaPercent: Math.max(-80, Math.min(30, hrvDeltaPercent)),
    restingHrDelta,
    source: "garmin_fit",
    confidence,
    ...(sleepStages ? { sleepStages } : {}),
  };
}

function extractFitSleepStages(data: Record<string, unknown>) {
  const levels = toArray(data.sleep_level);
  if (levels.length === 0) return null;

  const timestamps = levels
    .map((l) => (l as Record<string, unknown>).timestamp as Date | undefined)
    .filter((t): t is Date => t instanceof Date);

  let intervalSeconds = 60;
  if (timestamps.length > 1) {
    const diffs: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const s = (timestamps[i].getTime() - timestamps[i - 1].getTime()) / 1000;
      if (s > 0) diffs.push(s);
    }
    if (diffs.length > 0) {
      diffs.sort((a, b) => a - b);
      intervalSeconds = diffs[Math.floor(diffs.length / 2)] ?? 60;
    }
    if (intervalSeconds <= 0 || intervalSeconds > 300) intervalSeconds = 60;
  }

  const duration = (level: string) =>
    Math.round(
      levels.filter((l) => (l as Record<string, unknown>).sleep_level === level).length *
        (intervalSeconds / 60)
    );

  const deep = duration("deep");
  const rem = duration("rem");
  const light = duration("light");

  if (deep === 0 && rem === 0 && light === 0) return null;

  return { deep, rem, light };
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function first<T>(v: T | T[] | undefined): T | undefined {
  return toArray(v)[0];
}

function splitCsvRow(row: string): string[] {
  // Handle quoted fields with commas
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}
