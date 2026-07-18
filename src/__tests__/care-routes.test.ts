import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/care/check-in/route";
import { GET } from "@/app/api/care/summary/route";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/application/care/check-in", () => ({
  processCheckIn: vi.fn(),
}));

vi.mock("@/lib/db/queries/care", () => ({
  getCarePatientByUserId: vi.fn(),
  getOpenEscalationsForClinic: vi.fn(),
  getPendingInterventionsForClinic: vi.fn(),
  getRecentInterventionOutcomesForClinic: vi.fn(),
  getCareClinician: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { processCheckIn } from "@/application/care/check-in";
import {
  getCarePatientByUserId,
  getOpenEscalationsForClinic,
  getPendingInterventionsForClinic,
  getRecentInterventionOutcomesForClinic,
  getCareClinician,
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

describe("POST /api/care/check-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: ["nausea"], symptomSeverity: "mild", adherence: "taken_as_prescribed" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: [] }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid symptomSeverity", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: ["nausea"], symptomSeverity: "extreme", adherence: "taken_as_prescribed" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("processes a valid check-in and returns the action", async () => {
    mockAuth();
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-1", clinicId: "clinic-1" });
    const now = new Date();
    (processCheckIn as ReturnType<typeof vi.fn>).mockResolvedValue({
      observation: { id: "obs-1", checkInAt: now },
      action: { type: "intervention", action: "Drink water." },
      intervention: { id: "int-1", action: "Drink water." },
    });

    const req = new Request("http://localhost:3000/api/care/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: ["nausea"],
        symptomSeverity: "mild",
        adherence: "taken_as_prescribed",
      }),
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.action.type).toBe("intervention");
    expect(processCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        symptoms: ["nausea"],
        symptomSeverity: "mild",
        adherence: "taken_as_prescribed",
      }),
      expect.any(Object),
    );
  });
});

describe("GET /api/care/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/summary?clinicId=clinic-1");

    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when clinicId is missing", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/summary");

    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 403 when the caller is not a clinician for the clinic", async () => {
    mockAuth();
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request("http://localhost:3000/api/care/summary?clinicId=clinic-1");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("returns open escalations and pending interventions for an authorized clinician", async () => {
    mockAuth();
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "user-1", clinicId: "clinic-1" });
    const escalations = [{ id: "esc-1", reason: "Severe symptom" }];
    const interventions = [{ id: "int-1", action: "Drink water." }];
    const outcomes = [{ id: "out-1", action: "Drink water.", status: "completed" }];
    (getOpenEscalationsForClinic as ReturnType<typeof vi.fn>).mockResolvedValue(escalations);
    (getPendingInterventionsForClinic as ReturnType<typeof vi.fn>).mockResolvedValue(interventions);
    (getRecentInterventionOutcomesForClinic as ReturnType<typeof vi.fn>).mockResolvedValue(outcomes);

    const req = new Request("http://localhost:3000/api/care/summary?clinicId=clinic-1");
    const res = await GET(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.openEscalations).toEqual(escalations);
    expect(data.pendingInterventions).toEqual(interventions);
    expect(data.recentOutcomes).toEqual(outcomes);
    expect(getOpenEscalationsForClinic).toHaveBeenCalledWith("clinic-1");
    expect(getPendingInterventionsForClinic).toHaveBeenCalledWith("clinic-1");
  });
});
