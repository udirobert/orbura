import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/care/clinics/[id]/patients/[patientId]/today/route";

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db/queries/care", () => ({
  getCareClinician: vi.fn(),
  getCarePatientById: vi.fn(),
}));
vi.mock("@/lib/today/build-today", () => ({ buildTodayState: vi.fn() }));

import { requireAuth } from "@/lib/auth";
import { getCareClinician, getCarePatientById } from "@/lib/db/queries/care";
import { buildTodayState } from "@/lib/today/build-today";

const params = Promise.resolve({ id: "clinic-1", patientId: "patient-1" });
const req = new Request("http://localhost/api") as never;

const fakeToday = {
  surface: "care",
  rule: "care-action",
  provenance: {},
  headline: { stateWord: "Steady", deltaPct: null, source: null, asOf: null, freshness: "none" },
  primaryAction: { id: "care-i1", kind: "care-action", label: "Drink water" },
  secondaryActions: [],
  context: { treatmentWeek: 2, openEscalation: false, patternLines: [], streakDays: 0, pendingFollowThroughDate: null },
};

describe("GET /api/care/clinics/[id]/patients/[patientId]/today", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for guests", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "authentication required" }, { status: 401 }),
    });
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when clinician is not in the patient's clinic", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, user: { id: "doc-1" } });
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getCarePatientById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", clinicId: "clinic-1", userId: "user-9" });
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
  });

  it("returns the patient's TodayState for an authorized clinician", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, user: { id: "doc-1" } });
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1" });
    (getCarePatientById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", clinicId: "clinic-1", userId: "user-9" });
    (buildTodayState as ReturnType<typeof vi.fn>).mockResolvedValue(fakeToday);

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.today.rule).toBe("care-action");
    expect(buildTodayState).toHaveBeenCalledWith("user-9");
  });
});
