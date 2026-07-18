import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import { POST as createClinic } from "@/app/api/care/clinics/route";
import { POST as enrollPatient } from "@/app/api/care/clinics/[id]/patients/route";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db/queries/care", () => ({
  createCareClinic: vi.fn(),
  createCareClinician: vi.fn(),
  getCareClinician: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getCarePatientByUserId: vi.fn(),
  createCarePatient: vi.fn(),
  updateCarePatientClinic: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import {
  createCareClinic,
  createCareClinician,
  getCareClinician,
  getUserByEmail,
  createUser,
  getCarePatientByUserId,
  createCarePatient,
  updateCarePatientClinic,
} from "@/lib/db/queries/care";

function mockAuth(userId = "user-1") {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    user: { id: userId, email: "clinician@example.com" },
  });
}

function mockGuest() {
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "authentication required" }, { status: 401 }),
  });
}

describe("POST /api/care/clinics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({ name: "Demo Clinic" }),
    });
    const res = await createClinic(req as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    mockAuth();
    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await createClinic(req as never);
    expect(res.status).toBe(400);
  });

  it("creates a clinic and assigns the caller as admin", async () => {
    mockAuth("user-1");
    (createCareClinic as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clinic-1", name: "Demo Clinic" });
    (createCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1" });

    const req = new Request("http://localhost:3000/api/care/clinics", {
      method: "POST",
      body: JSON.stringify({ name: "Demo Clinic" }),
    });
    const res = await createClinic(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.clinic.id).toBe("clinic-1");
    expect(createCareClinician).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", clinicId: "clinic-1", role: "admin" }),
    );
  });
});

describe("POST /api/care/clinics/[id]/patients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGuest();
    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not a clinician for the clinic", async () => {
    mockAuth();
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    expect(res.status).toBe(403);
  });

  it("creates a new user and enrolls them as a patient", async () => {
    mockAuth("clinician-1");
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "clinician-1", clinicId: "clinic-1" });
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", email: "patient@example.com" });
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (createCarePatient as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-1" });

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com", name: "Jane Doe", medication: "Semaglutide" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(createUser).toHaveBeenCalledWith({ email: "patient@example.com", name: "Jane Doe" });
    expect(createCarePatient).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-2", clinicId: "clinic-1", medication: "Semaglutide" }),
    );
  });

  it("reuses an existing patient and updates their clinic if needed", async () => {
    mockAuth("clinician-1");
    (getCareClinician as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "clin-1", userId: "clinician-1", clinicId: "clinic-1" });
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-2", email: "patient@example.com" });
    (getCarePatientByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-2" });
    (updateCarePatientClinic as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "patient-1", userId: "user-2", clinicId: "clinic-1" });

    const req = new Request("http://localhost:3000/api/care/clinics/clinic-1/patients", {
      method: "POST",
      body: JSON.stringify({ email: "patient@example.com" }),
    });
    const res = await enrollPatient(req as never, { params: Promise.resolve({ id: "clinic-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateCarePatientClinic).toHaveBeenCalledWith("patient-1", "clinic-1");
  });
});
