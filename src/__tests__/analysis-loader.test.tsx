import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import type { AgentEventState } from "@/components/AnalysisLoader";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock bandMeta to return predictable colors
vi.mock("@/lib/debt-band", () => ({
  bandMeta: () => ({ color: "var(--color-states-success)" }),
}));

// Mock framer-motion to render children without animation
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Filter out framer-motion-specific props to avoid React warnings
      const { initial, animate, exit, transition, whileTap, variants, ...safeProps } = props;
      return <div {...safeProps}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, ...safeProps } = props;
      return <span {...safeProps}>{children}</span>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, ...safeProps } = props;
      return <p {...safeProps}>{children}</p>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { whileTap, initial, animate, exit, transition, variants, ...safeProps } = props;
      return <button {...safeProps}>{children}</button>;
    },
    a: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, ...safeProps } = props;
      return <a {...safeProps}>{children}</a>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AnalysisLoader — personalized signal labels", () => {
  it("shows generic 'Autonomic signals' label when no HRV context is provided", () => {
    render(<AnalysisLoader hasFaceScan={false} hasHRV={true} />);
    // The HRV signal should show the generic label
    expect(screen.getByText("Autonomic signals")).toBeDefined();
  });

  it("shows personalized HRV label with negative delta when hrvContext is provided", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={true}
        hrvContext={{ deltaPercent: -15, source: "manual_proxy" }}
      />
    );
    expect(screen.getByText("HRV -15% (manual proxy)")).toBeDefined();
  });

  it("shows personalized HRV label with positive delta and + prefix when above baseline", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={true}
        hrvContext={{ deltaPercent: 10, source: "garmin_export" }}
      />
    );
    // Should include the + sign for positive values
    expect(screen.getByText("HRV +10% (garmin export)")).toBeDefined();
  });

  it("shows personalized HRV label with zero delta", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={true}
        hrvContext={{ deltaPercent: 0, source: "terra" }}
      />
    );
    expect(screen.getByText("HRV 0% (terra)")).toBeDefined();
  });

  it("replaces underscores in source name with spaces", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={true}
        hrvContext={{ deltaPercent: -20, source: "google_fit" }}
      />
    );
    // "google_fit" should become "google fit"
    expect(screen.getByText("HRV -20% (google fit)")).toBeDefined();
  });

  it("shows generic 'Face biomarkers' label when no face context is provided", () => {
    render(<AnalysisLoader hasFaceScan={true} hasHRV={false} />);
    expect(screen.getByText("Face biomarkers")).toBeDefined();
  });

  it("shows personalized face label with summary when faceContext is provided", () => {
    render(
      <AnalysisLoader
        hasFaceScan={true}
        hasHRV={false}
        faceContext={{ summary: "ZK-verified stress check." }} // 27 chars — no truncation
      />
    );
    // Summary is under 32 chars, so no truncation
    expect(screen.getByText("Face: ZK-verified stress check.…")).toBeDefined();
  });

  it("truncates long face summaries to 32 characters", () => {
    render(
      <AnalysisLoader
        hasFaceScan={true}
        hasHRV={false}
        faceContext={{ summary: "A very long summary that should definitely be truncated beyond recognition" }}
      />
    );
    // slice(0,32) of the long summary = "A very long summary that shou"
    // Use a function matcher to handle possible text-node splitting
    expect(
      screen.getByText((content: string) =>
        content.includes("A very long summary that shou") &&
        content.includes("Face:")
      )
    ).toBeDefined();
  });

  it("shows face signal even when hasFaceScan is false if faceContext is provided", () => {
    // The filter checks: if (s.id === "face" && !hasFaceScan && !faceContext) return false
    // So if faceContext is provided, the signal should appear even without hasFaceScan
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        faceContext={{ summary: "Manual assessment." }}
      />
    );
    expect(screen.getByText("Face: Manual assessment.…")).toBeDefined();
  });

  it("shows HRV signal even when hasHRV is false if hrvContext is provided", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        hrvContext={{ deltaPercent: -5, source: "manual_proxy" }}
      />
    );
    expect(screen.getByText("HRV -5% (manual proxy)")).toBeDefined();
  });

  it("hides HRV signal when both hasHRV is false and hrvContext is undefined", () => {
    render(<AnalysisLoader hasFaceScan={false} hasHRV={false} />);
    expect(screen.queryByText("Autonomic signals")).toBeNull();
    expect(screen.queryByText(/HRV/)).toBeNull();
  });

  it("hides face signal when both hasFaceScan is false and faceContext is undefined", () => {
    render(<AnalysisLoader hasFaceScan={false} hasHRV={false} />);
    expect(screen.queryByText("Face biomarkers")).toBeNull();
    expect(screen.queryByText(/Face:/)).toBeNull();
  });
});

describe("AnalysisLoader — live agent events", () => {
  it("shows agent names when agent events are provided", () => {
    const agents: AgentEventState[] = [
      { agent: "triage", description: "Analyzing...", status: "done", durationMs: 1200 },
      { agent: "coach", description: "Generating plan...", status: "active" },
    ];
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentEvents={agents}
      />
    );
    expect(screen.getByText("Triage Agent")).toBeDefined();
    expect(screen.getByText("Recovery Coach")).toBeDefined();
  });

  it("shows 'QVAC agents working' label when agents are running", () => {
    const agents: AgentEventState[] = [
      { agent: "triage", description: "Analyzing...", status: "active" },
    ];
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentEvents={agents}
      />
    );
    expect(screen.getByText("QVAC agents working")).toBeDefined();
  });

  it("shows completed agent with duration", () => {
    const agents: AgentEventState[] = [
      { agent: "triage", description: "Done", status: "done", durationMs: 2500 },
    ];
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentEvents={agents}
      />
    );
    expect(screen.getByText(/2\.5s/)).toBeDefined();
  });

  it("shows 'processing signals' when no agents and no model download", () => {
    render(<AnalysisLoader hasFaceScan={false} hasHRV={false} />);
    expect(screen.getByText("processing signals")).toBeDefined();
  });

  it("shows 'loading AI model' when agentProgress indicates downloading", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentProgress={{ status: "downloading", percent: 50, loaded: 350, total: 773 }}
      />
    );
    expect(screen.getByText("loading AI model")).toBeDefined();
  });

  it("shows model download progress bar with MB values", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentProgress={{ status: "downloading", percent: 65, loaded: 350_000_000, total: 773_000_000 }}
      />
    );
    // 350_000_000 bytes ≈ 334MB, 773_000_000 bytes ≈ 737MB
    expect(screen.getByText(/334MB/)).toBeDefined();
    expect(screen.getByText(/737MB/)).toBeDefined();
    expect(screen.getByText("65%")).toBeDefined();
  });

  it("shows percentage when agents are live", () => {
    const agents: AgentEventState[] = [
      { agent: "triage", description: "Done", status: "done" },
    ];
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        agentEvents={agents}
      />
    );
    // One agent done out of one = 100%
    expect(screen.getByText("100%")).toBeDefined();
  });
});

describe("AnalysisLoader — signal filtering", () => {
  it("shows only relevant signals based on hasHRV and hasFaceScan", () => {
    render(<AnalysisLoader hasFaceScan={true} hasHRV={true} />);
    expect(screen.getByText("Stressor intake")).toBeDefined();
    expect(screen.getByText("Context depth")).toBeDefined();
    expect(screen.getByText("Face biomarkers")).toBeDefined();
    expect(screen.getByText("Autonomic signals")).toBeDefined();
    expect(screen.getByText("Recovery arc")).toBeDefined();
    expect(screen.getByText("Generating prescription")).toBeDefined();
  });

  it("hides face and HRV signals when flags are false and no context", () => {
    render(<AnalysisLoader hasFaceScan={false} hasHRV={false} />);
    expect(screen.getByText("Stressor intake")).toBeDefined();
    expect(screen.getByText("Context depth")).toBeDefined();
    expect(screen.queryByText("Face biomarkers")).toBeNull();
    expect(screen.queryByText("Autonomic signals")).toBeNull();
    expect(screen.getByText("Recovery arc")).toBeDefined();
    expect(screen.getByText("Generating prescription")).toBeDefined();
  });

  it("includes HRV signal when context is provided even if hasHRV is false", () => {
    render(
      <AnalysisLoader
        hasFaceScan={false}
        hasHRV={false}
        hrvContext={{ deltaPercent: -10, source: "terra" }}
      />
    );
    expect(screen.getByText("HRV -10% (terra)")).toBeDefined();
  });
});
