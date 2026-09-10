import { NextRequest, NextResponse } from "next/server";
import { parser as createParser } from "sax";
import { requireAuth } from "@/lib/auth";
import { buildHRVData, type WearableSnapshot } from "@/lib/baselines";

export const maxDuration = 30;

const TARGET_TYPES = new Set([
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKCategoryTypeIdentifierSleepAnalysis",
]);

interface RawRecord {
  type: string;
  value: string;
  unit?: string;
  startDate?: string;
  endDate?: string;
  sourceName?: string;
}

interface TimedRecord {
  start: Date;
  end: Date;
  v: number;
}

interface SleepRecord {
  start: Date;
  end: Date;
  v: string;
}

/**
 * POST /api/apple-health/parse
 *
 * Accepts an Apple Health "Export All Health Data" XML file as multipart
 * form data (field name: "xml"). Parses the XML with a streaming SAX parser,
 * extracts HRV, resting heart rate, heart rate, and sleep-stage records, and
 * returns an HRVData object. When the user is authenticated, metrics are
 * persisted and the delta is computed against a personal rolling baseline.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  const userId = auth.ok ? auth.user.id : null;

  let xmlText: string;
  try {
    const form = await request.formData();
    const xmlFile = form.get("xml") as File | null;
    if (!xmlFile) {
      return NextResponse.json({ error: "No XML file provided" }, { status: 400 });
    }
    xmlText = await xmlFile.text();
  } catch {
    return NextResponse.json({ error: "Could not read uploaded file" }, { status: 400 });
  }

  try {
    const records = parseAppleHealthXml(xmlText);
    const snapshot = extractSnapshotFromRecords(records);
    if (!snapshot) {
      return NextResponse.json(
        { error: "PARSE_FAILED", message: "Could not find usable health data." },
        { status: 422 }
      );
    }
    const hrvData = await buildHRVData(snapshot, userId);
    if (!hrvData) {
      return NextResponse.json(
        { error: "PARSE_FAILED", message: "Could not find usable health data." },
        { status: 422 }
      );
    }
    return NextResponse.json({ hrvData });
  } catch {
    return NextResponse.json(
      { error: "PARSE_FAILED", message: "Could not parse this Apple Health export." },
      { status: 422 }
    );
  }
}

function parseAppleHealthXml(xml: string): RawRecord[] {
  const records: RawRecord[] = [];
  const parser = createParser(true, { trim: true });

  parser.onopentag = (tag: { name: string; attributes: Record<string, unknown> }) => {
    if (tag.name !== "Record") return;
    const a = tag.attributes;
    const type = a.type as string | undefined;
    if (!type || !TARGET_TYPES.has(type)) return;
    records.push({
      type,
      value: (a.value as string) ?? "",
      unit: a.unit as string | undefined,
      startDate: a.startDate as string | undefined,
      endDate: a.endDate as string | undefined,
      sourceName: a.sourceName as string | undefined,
    });
  };

  parser.onerror = () => {
    // Recoverable XML oddities (e.g., unusual entities) should not abort the parse.
  };

  const chunkSize = 64 * 1024;
  for (let i = 0; i < xml.length; i += chunkSize) {
    parser.write(xml.slice(i, i + chunkSize));
  }
  parser.close();

  return records;
}

function extractSnapshotFromRecords(records: RawRecord[]): WearableSnapshot | null {
  const hrvRecords: TimedRecord[] = [];
  const hrRecords: TimedRecord[] = [];
  const restingRecords: TimedRecord[] = [];
  const sleepRecords: SleepRecord[] = [];

  for (const r of records) {
    const start = parseAppleDate(r.startDate);
    const end = parseAppleDate(r.endDate);
    if (!start || !end) continue;

    if (r.type === "HKQuantityTypeIdentifierHeartRateVariabilitySDNN") {
      const v = parseFloat(r.value);
      if (!isNaN(v)) hrvRecords.push({ start, end, v });
    } else if (r.type === "HKQuantityTypeIdentifierHeartRate") {
      const v = parseFloat(r.value);
      if (!isNaN(v)) hrRecords.push({ start, end, v });
    } else if (r.type === "HKQuantityTypeIdentifierRestingHeartRate") {
      const v = parseFloat(r.value);
      if (!isNaN(v)) restingRecords.push({ start, end, v });
    } else if (r.type === "HKCategoryTypeIdentifierSleepAnalysis") {
      sleepRecords.push({ start, end, v: r.value });
    }
  }

  const sleepWindow = findMainSleepWindow(sleepRecords);

  // Resting HR: prefer Apple's RestingHeartRate, then 5th percentile of HR in sleep.
  let restingHr: number | null = null;
  const recentResting = restingRecords.filter((r) =>
    isWithinLast(r.end, 24 * 60 * 60 * 1000)
  );
  if (recentResting.length > 0) {
    restingHr = recentResting.sort((a, b) => a.start.getTime() - b.start.getTime()).pop()?.v ?? null;
  } else if (sleepWindow && hrRecords.length > 0) {
    const windowHrs = hrRecords.filter(
      (r) => r.start >= sleepWindow.start && r.end <= sleepWindow.end
    );
    if (windowHrs.length > 0) {
      const sorted = windowHrs.map((r) => r.v).sort((a, b) => a - b);
      restingHr = sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0];
    }
  }
  if (restingHr == null && hrRecords.length > 0) {
    const recentHr = hrRecords.filter((r) =>
      isWithinLast(r.end, 24 * 60 * 60 * 1000)
    );
    if (recentHr.length > 0) {
      const sorted = recentHr.map((r) => r.v).sort((a, b) => a - b);
      restingHr = sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0];
    }
  }

  // HRV: average SDNN during the main sleep window, or last 24h if no sleep.
  let lastNightHrv: number | null = null;
  let hrvTimestamp: Date | undefined;
  if (sleepWindow && hrvRecords.length > 0) {
    const windowHrv = hrvRecords.filter(
      (r) => r.start >= sleepWindow.start && r.end <= sleepWindow.end
    );
    if (windowHrv.length > 0) {
      lastNightHrv = Math.round(windowHrv.reduce((a, r) => a + r.v, 0) / windowHrv.length);
      hrvTimestamp = sleepWindow.end;
    }
  }
  if (lastNightHrv == null && hrvRecords.length > 0) {
    const recentHrv = hrvRecords.filter((r) =>
      isWithinLast(r.end, 24 * 60 * 60 * 1000)
    );
    if (recentHrv.length > 0) {
      lastNightHrv = Math.round(recentHrv.reduce((a, r) => a + r.v, 0) / recentHrv.length);
      hrvTimestamp = recentHrv[recentHrv.length - 1]?.end;
    }
  }

  if (lastNightHrv == null && restingHr == null) {
    return null;
  }

  const sleepStages = sleepWindow ? extractSleepStages(sleepRecords, sleepWindow) : null;

  return {
    source: "apple_health",
    recordedAt: hrvTimestamp ?? sleepWindow?.end ?? new Date(),
    hrvValue: lastNightHrv ?? undefined,
    hrvMetric: "hrv_sdnn",
    restingHr: restingHr ?? undefined,
    sleepStages: sleepStages ?? undefined,
    confidence: lastNightHrv != null ? "high" : "medium",
  };
}

function findMainSleepWindow(sleepRecords: SleepRecord[]): SleepRecord | null {
  const recent = sleepRecords.filter((r) =>
    isWithinLast(r.end, 24 * 60 * 60 * 1000)
  );
  if (recent.length === 0) return null;

  const inBed = recent
    .filter((r) => r.v === "HKCategoryValueSleepAnalysisInBed")
    .sort((a, b) => (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime()));
  if (inBed.length > 0) return inBed[0];

  const asleep = recent.filter((r) =>
    r.v === "HKCategoryValueSleepAnalysisAsleep" ||
    r.v === "HKCategoryValueSleepAnalysisAsleepCore" ||
    r.v === "HKCategoryValueSleepAnalysisAsleepDeep" ||
    r.v === "HKCategoryValueSleepAnalysisAsleepREM" ||
    r.v === "HKCategoryValueSleepAnalysisAsleepUnspecified"
  );
  if (asleep.length === 0) return null;

  const sorted = [...asleep].sort((a, b) => a.start.getTime() - b.start.getTime());
  let best: SleepRecord | null = null;
  let current: SleepRecord | null = null;

  for (const r of sorted) {
    if (!current) { current = r; continue; }
    const gap = r.start.getTime() - current.end.getTime();
    if (gap < 30 * 60 * 1000) {
      current = { start: current.start, end: r.end, v: current.v };
    } else {
      if (!best || (current.end.getTime() - current.start.getTime()) > (best.end.getTime() - best.start.getTime())) {
        best = current;
      }
      current = r;
    }
  }
  if (current && (!best || (current.end.getTime() - current.start.getTime()) > (best.end.getTime() - best.start.getTime()))) {
    best = current;
  }

  return best && (best.end.getTime() - best.start.getTime()) >= 2 * 60 * 60 * 1000 ? best : null;
}

function extractSleepStages(sleepRecords: SleepRecord[], window: SleepRecord) {
  const inside = sleepRecords.filter(
    (r) => r.start >= window.start && r.end <= window.end
  );

  const deepMs = inside
    .filter((r) => r.v === "HKCategoryValueSleepAnalysisAsleepDeep")
    .reduce((a, r) => a + (r.end.getTime() - r.start.getTime()), 0);
  const remMs = inside
    .filter((r) => r.v === "HKCategoryValueSleepAnalysisAsleepREM")
    .reduce((a, r) => a + (r.end.getTime() - r.start.getTime()), 0);
  const lightMs = inside
    .filter((r) =>
      r.v === "HKCategoryValueSleepAnalysisAsleepCore" ||
      r.v === "HKCategoryValueSleepAnalysisAsleepUnspecified" ||
      r.v === "HKCategoryValueSleepAnalysisAsleep"
    )
    .reduce((a, r) => a + (r.end.getTime() - r.start.getTime()), 0);

  const deep = Math.round(deepMs / (1000 * 60));
  const rem = Math.round(remMs / (1000 * 60));
  const light = Math.round(lightMs / (1000 * 60));

  if (deep === 0 && rem === 0 && light === 0) return null;

  return { deep, rem, light };
}

function isWithinLast(end: Date, ms: number) {
  return end.getTime() >= Date.now() - ms;
}

function parseAppleDate(s: string | undefined): Date | null {
  if (!s) return null;
  const iso = s
    .replace(" ", "T")
    .replace(/\s+(?=[+-]\d)/, "")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
