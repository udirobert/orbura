import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/sdk/eazo-react", () => ({
  useEazo: vi.fn(),
}));

vi.mock("@/components/PrimaryButton", () => ({
  PrimaryButton: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children as React.ReactNode}</button>
  ),
}));

vi.mock("@/components/AuthLockedTeaser", () => ({
  AuthLockedTeaser: ({ title, body }: { title: string; body: string }) => (
    <div data-testid="auth-locked">
      <p>{title}</p>
      <p>{body}</p>
    </div>
  ),
}));

import { useSearchParams } from "next/navigation";
import { useEazo } from "@/lib/sdk/eazo-react";
import { ClinicianPage } from "@/products/care-companion/ClinicianPage";

function setSearchParams(params: Record<string, string>) {
  (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue({
    get: (key: string) => params[key] ?? null,
  });
}

function setUser(user: { id: string; email: string } | null) {
  (useEazo as ReturnType<typeof vi.fn>).mockReturnValue(user);
}

function mockFetch(response: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(response),
  });
}

describe("ClinicianPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an auth teaser when the user is not signed in", () => {
    setUser(null);
    setSearchParams({});
    render(<ClinicianPage />);

    expect(screen.getByTestId("auth-locked")).toBeDefined();
  });

  it("prompts for clinic access when none is provided", async () => {
    setUser({ id: "user-1", email: "doc@example.com" });
    setSearchParams({});
    mockFetch({ ok: true, clinics: [] });
    render(<ClinicianPage />);

    expect(screen.getByText("Clinic dashboard")).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText("No clinic access yet")).toBeDefined();
    });
  });

  it("fetches and displays escalations and interventions", async () => {
    setUser({ id: "user-1", email: "doc@example.com" });
    setSearchParams({ clinicId: "clinic-1" });
    mockFetch({
      ok: true,
      openEscalations: [
        { id: "esc-1", patientId: "p-1", reason: "Severe vomiting", createdAt: new Date().toISOString() },
      ],
      pendingInterventions: [
        { id: "int-1", patientId: "p-1", action: "Drink water", dueAt: new Date().toISOString() },
      ],
    });

    render(<ClinicianPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/care/summary?clinicId=clinic-1");
      expect(screen.getByText("Severe vomiting")).toBeDefined();
      expect(screen.getByText("Drink water")).toBeDefined();
    });
  });

  it("shows an error when the summary request fails", async () => {
    setUser({ id: "user-1", email: "doc@example.com" });
    setSearchParams({ clinicId: "clinic-1" });
    mockFetch({ error: "clinic not found" }, false);

    render(<ClinicianPage />);

    await waitFor(() => {
      expect(screen.getByText("clinic not found")).toBeDefined();
    });
  });
});
