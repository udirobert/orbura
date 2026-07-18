import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "@/app/api/care/patient/summary/route";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db/queries/care", () => ({
  getCarePatientByUserId: vi.fn(),
  getCareObservationsForPatient: vi.fn(),
  getPendingInterventionsForPatient: vi.fn(),
  getRecentInterventionOutcomesForPatient: vi.fn(),
  getOpenEscalationsForPatient: vi.fn(),
  getCareClinicById: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import {
  getCarePatientByUserId,
  getCareObservationsForPatient,
  getPendingInterventionsForPatient,
  getRecentInterventionOutcomesForPatient,
  getOpenEscalationsForPatient,
  getCareClinicById,
} from "@/lib/db/queries/care";

function mockAuth(userId = "user-1") {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    user: { id: userId, email: "patient@example.com" },
  });
}

function mockGuest() {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "authentication required" }, { status: 401 }),
  });
}

describe("GET /api/care/patient/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/patient/summary");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns the patient summary", async () => {
    mockAuth();
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-1", clinicId: "clinic-1" });
    (getCareClinicById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clinic-1", name: "Demo Clinic" });
    (getCareObservationsForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "obs-1", symptoms: ["nausea"], symptomSeverity: "mild", adherence: "taken_as_prescribed" },
    ]);
    (getPendingInterventionsForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "int-1", action: "Drink water", status: "pending" },
    ]);
    (getRecentInterventionOutcomesForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getOpenEscalationsForPatient as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request("http://localhost:3000/api/care/patient/summary");
    const res = await GET(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.observations).toHaveLength(1);
    expect(data.pendingInterventions).toHaveLength(1);
    expect(data.openEscalations).toHaveLength(0);
  });
});
