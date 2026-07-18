import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { PATCH as patchIntervention } from "@/app/api/care/interventions/[id]/route";
import { PATCH as patchEscalation } from "@/app/api/care/escalations/[id]/route";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db/queries/care", () => ({
  getCarePatientByUserId: vi.fn(),
  getCareInterventionById: vi.fn(),
  updateCareInterventionStatus: vi.fn(),
  getCareEscalationWithPatientById: vi.fn(),
  updateCareEscalationStatus: vi.fn(),
  getCareClinician: vi.fn(),
  createCareAuditLog: vi.fn(),
  getActiveCareAcknowledgement: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import {
  getCarePatientByUserId,
  getCareInterventionById,
  updateCareInterventionStatus,
  getCareEscalationWithPatientById,
  updateCareEscalationStatus,
  getCareClinician,
  createCareAuditLog,
  getActiveCareAcknowledgement,
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

describe("PATCH /api/care/interventions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getActiveCareAcknowledgement as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ack-1", patientId: "patient-1", revokedAt: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/interventions/int-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    const res = await patchIntervention(req as never, { params: Promise.resolve({ id: "int-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid status", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/interventions/int-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    const res = await patchIntervention(req as never, { params: Promise.resolve({ id: "int-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when the intervention belongs to another patient", async () => {
    mockAuth();
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1" });
    (getCareInterventionById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "int-1", patientId: "patient-2" });

    const req = new Request("http://localhost:3000/api/care/interventions/int-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", outcomeCode: "helped" }),
    });
    const res = await patchIntervention(req as never, { params: Promise.resolve({ id: "int-1" }) });
    expect(res.status).toBe(403);
  });

  it("updates the intervention status", async () => {
    mockAuth();
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1" });
    (getCareInterventionById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "int-1", patientId: "patient-1" });
    (updateCareInterventionStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "int-1", status: "completed" });

    const req = new Request("http://localhost:3000/api/care/interventions/int-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", outcomeCode: "helped", outcomeNote: "Felt easier today" }),
    });
    const res = await patchIntervention(req as never, { params: Promise.resolve({ id: "int-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateCareInterventionStatus).toHaveBeenCalledWith("int-1", "completed", { code: "helped", note: "Felt easier today" });
  });
});

describe("PATCH /api/care/escalations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/escalations/esc-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", clinicId: "clinic-1" }),
    });
    const res = await patchEscalation(req as never, { params: Promise.resolve({ id: "esc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when clinicId is missing", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/escalations/esc-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved" }),
    });
    const res = await patchEscalation(req as never, { params: Promise.resolve({ id: "esc-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 403 when the caller is not a clinician for the clinic", async () => {
    mockAuth();
    (getCareEscalationWithPatientById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "esc-1",
      patientId: "patient-1",
      patient: { clinicId: "clinic-1" },
    });
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request("http://localhost:3000/api/care/escalations/esc-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", clinicId: "clinic-1", reason: "Reviewed and safe" }),
    });
    const res = await patchEscalation(req as never, { params: Promise.resolve({ id: "esc-1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 403 when the escalation belongs to a different clinic", async () => {
    mockAuth();
    (getCareEscalationWithPatientById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "esc-1",
      patientId: "patient-1",
      patient: { clinicId: "clinic-2" },
    });
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "user-1", clinicId: "clinic-1" });

    const req = new Request("http://localhost:3000/api/care/escalations/esc-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", clinicId: "clinic-1", reason: "Reviewed and safe" }),
    });
    const res = await patchEscalation(req as never, { params: Promise.resolve({ id: "esc-1" }) });
    expect(res.status).toBe(403);
  });

  it("updates the escalation status when the caller is an authorized clinician", async () => {
    mockAuth();
    (getCareEscalationWithPatientById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "esc-1",
      patientId: "patient-1",
      patient: { clinicId: "clinic-1" },
    });
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "user-1", clinicId: "clinic-1" });
    (updateCareEscalationStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "esc-1", status: "resolved" });

    const req = new Request("http://localhost:3000/api/care/escalations/esc-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "resolved", clinicId: "clinic-1", reason: "Reviewed and safe" }),
    });
    const res = await patchEscalation(req as never, { params: Promise.resolve({ id: "esc-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateCareEscalationStatus).toHaveBeenCalledWith("esc-1", "resolved");
    expect(createCareAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      clinicId: "clinic-1",
      actorUserId: "user-1",
      patientId: "patient-1",
      targetType: "escalation",
      targetId: "esc-1",
      actionType: "resolved",
      reason: "Reviewed and safe",
    }));
  });
});
