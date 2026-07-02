import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// ─── Mocks: external dependencies ──────────────────────────────────────────

// framer-motion — render children without animation
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileTap, whileHover, variants, ...safe } = props;
      return <div {...safe}>{children as ReactNode}</div>;
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, variants, ...safe } = props;
      return <span {...safe}>{children as ReactNode}</span>;
    },
    button: ({ children, ...props }: Record<string, unknown>) => {
      const { whileTap, initial, animate, exit, transition, variants, ...safe } = props;
      return <button {...safe}>{children as ReactNode}</button>;
    },
    a: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, variants, ...safe } = props;
      return <a {...safe}>{children as ReactNode}</a>;
    },
  },
  AnimatePresence: ({ children }: Record<string, unknown>) => <>{children as ReactNode}</>,
}));

// next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// @eazo/sdk
vi.mock("@/lib/sdk/eazo-client", () => ({
  memory: { reportAction: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/sdk/eazo-react", () => ({
  useEazo: vi.fn(() => ({ auth: { user: null } })),
}));

// Recovery context
vi.mock("@/lib/contexts/RecoveryContext", () => ({
  useRecoveryContext: () => ({
    vocabulary: { appName: "BODY DEBT", scheduleLabel: "Recovery Schedule" },
    supportsSquad: false,
  }),
}));

// orbPersonality
vi.mock("@/lib/orbPersonality", () => ({
  getOrbCopy: () => ({ highDebt: "That's rough.", lowDebt: "You're good." }),
  getPersonality: () => ({ label: "Honest", emoji: "🤖", verdictPrefix: "" }),
}));

// i18n
vi.mock("@/lib/i18n", () => ({
  getStrings: () => ({
    verdictPrefix: { honest: "" },
    labels: {
      recoveryAround: "Recovery around",
      checkBack: "Check back tomorrow",
      checkBackSubtitle: "Your body is still recovering.",
      streakChain: (days: number) => `${days}-day streak`,
    },
    ctas: { viewPrescription: "View Prescription", shareScore: "Share Score", startFresh: "Start Fresh", cancel: "Cancel" },
  }),
}));

// debt-band
vi.mock("@/lib/debt-band", () => ({
  bandMeta: () => ({ color: "var(--color-states-success)", label: "Low" }),
  bandLabel: () => "Low",
}));

// ─── Store mock ────────────────────────────────────────────────────────────

// Mutable container so tests can swap the store state before rendering.
// useBodyDebtStore() without a selector returns the full state (zustand v5).
const storeState: Record<string, unknown> = {};

vi.mock("@/stores/useBodyDebtStore", () => ({
  useBodyDebtStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    return selector ? selector(storeState) : storeState;
  },
}));

function setStoreState(partial: Record<string, unknown>) {
  Object.assign(storeState, partial);
}

// ─── Sub-component mocks ───────────────────────────────────────────────────

vi.mock("@/components/screens/DebtOrb", () => ({
  DebtOrb: () => <div data-testid="debt-orb" />,
}));

vi.mock("@/components/screens/DebtGauge", () => ({
  DebtGauge: () => <div data-testid="debt-gauge" />,
}));

vi.mock("@/components/screens/RecoveryTimeline", () => ({
  RecoveryTimeline: () => <div data-testid="recovery-timeline" />,
}));

vi.mock("@/components/screens/StressorBreakdownChart", () => ({
  DonutChart: () => <div data-testid="donut-chart" />,
  BarChartView: () => <div data-testid="bar-chart" />,
}));

vi.mock("@/components/AnalysisLoader", () => ({
  AnalysisLoader: () => <div data-testid="analysis-loader" />,
}));

vi.mock("@/components/SystemPanels", () => ({
  SystemPanels: () => <div data-testid="system-panels" />,
}));

vi.mock("@/components/SystemClearanceNotifier", () => ({
  SystemClearanceNotifier: () => <div data-testid="clearance-notifier" />,
}));

vi.mock("./personality-picker", () => ({
  PersonalityPicker: () => <div data-testid="personality-picker" />,
}));

vi.mock("./debt-history", () => ({
  DebtHistory: () => <div data-testid="debt-history" />,
}));

vi.mock("./score-heatmap", () => ({
  ScoreHeatmap: () => <div data-testid="score-heatmap" />,
}));

vi.mock("@/components/notifications/notifications-toggle", () => ({
  NotificationsToggle: () => <div data-testid="notifications-toggle" />,
}));

vi.mock("@/components/AgentTracePanel", () => ({
  AgentTracePanel: () => <div data-testid="agent-trace-panel" />,
}));

vi.mock("@/components/ModeToggle", () => ({
  ModeToggle: () => <div data-testid="mode-toggle" />,
}));

vi.mock("./SquadScreen", () => ({
  SquadPanel: () => <div data-testid="squad-panel" />,
}));

vi.mock("@/components/GuestAuthCard", () => ({
  GuestAuthCard: () => <div data-testid="guest-auth-card" />,
}));

vi.mock("@/components/PrimaryButton", () => ({
  PrimaryButton: ({ children }: Record<string, unknown>) => (
    <button data-testid="primary-button">{children as ReactNode}</button>
  ),
}));

vi.mock("@/components/SecondaryButton", () => ({
  SecondaryButton: ({ children }: Record<string, unknown>) => (
    <button data-testid="secondary-button">{children as ReactNode}</button>
  ),
}));

vi.mock("@/components/SignalUpsellCard", () => ({
  SignalUpsellCard: () => <div data-testid="signal-upsell" />,
}));

vi.mock("@/components/screens/RecoverySchedule", () => ({
  RecoverySchedule: () => <div data-testid="recovery-schedule" />,
}));

vi.mock("@/components/screens/dashboard/ConfidenceSignal", () => ({
  ConfidenceSignal: () => <div data-testid="confidence-signal" />,
}));

vi.mock("@/components/screens/dashboard/VerdictCard", () => ({
  VerdictCard: ({ verdict }: { verdict: string }) => (
    <div data-testid="verdict-card">{verdict}</div>
  ),
}));

vi.mock("@/components/screens/dashboard/SystemIconRow", () => ({
  SystemIconRow: () => <div data-testid="system-icon-row" />,
}));

vi.mock("@/components/screens/dashboard/PatternLayer", () => ({
  PatternLayer: () => <div data-testid="pattern-layer" />,
}));

vi.mock("@/components/screens/dashboard/AgentSchedule", () => ({
  AgentSchedule: () => <div data-testid="agent-schedule" />,
}));

// ─── Default store state ───────────────────────────────────────────────────

const DEFAULT_STORE = {
  analysis: null,
  selectedStressors: [],
  reset: vi.fn(),
  isAnalyzing: false,
  hrvData: null,
  faceAnalysis: null,
  zkProof: null,
  streakDays: 0,
  confidenceTier: "estimated" as const,
  orbPersonality: "honest" as const,
  agentEvents: [],
  agentProgress: null,
  locale: "en" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset store to defaults
  Object.keys(storeState).forEach((k) => delete storeState[k]);
  setStoreState(DEFAULT_STORE);
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("DashboardScreen — empty state", () => {
  it("renders the empty state when no analysis or stressors exist", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByText("Your body is waiting")).toBeDefined();
    expect(screen.getByText("Start assessment")).toBeDefined();
  });

  it("renders the loading state when isAnalyzing is true", async () => {
    setStoreState({ isAnalyzing: true });
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByTestId("analysis-loader")).toBeDefined();
  });
});

describe("DashboardScreen — main dashboard", () => {
  beforeEach(() => {
    const mockAnalysis = {
      debtScore: 45,
      verdict: "Your body is recovering from a rough night.",
      recoveryTime: "30 hours",
      prescription: {
        rightNow: "Hydrate and rest.",
        thisMorning: "Light movement if you feel up to it.",
        today: "Avoid alcohol and caffeine after 4pm.",
        avoid: "No high-intensity training.",
      },
      stressorBreakdown: [
        { stressor: "Alcohol", points: 30, insight: "3 drinks", icon: "🍺" },
        { stressor: "Sleep", points: 15, insight: "5 hours", icon: "😴" },
      ],
      recoveryArc: {
        dangerEnds: new Date().toISOString(),
        partialEnds: new Date().toISOString(),
        clearedAt: new Date().toISOString(),
      },
      confidenceLevel: "medium" as const,
      systemScores: [
        { system: "cardiovascular" as const, label: "Cardiovascular", icon: "🫀", score: 30, clearedAt: "", causeText: "", actionText: "" },
        { system: "brain" as const, label: "Brain", icon: "🧠", score: 60, clearedAt: "", causeText: "", actionText: "" },
      ],
      agentTrace: { steps: [], source: "deterministic" as const },
    };

    setStoreState({
      analysis: mockAnalysis,
      selectedStressors: [{ type: "alcohol" }, { type: "sleep" }],
      confidenceTier: "partial",
      streakDays: 3,
    });
  });

  it("renders the app name in the header", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByText("BODY DEBT")).toBeDefined();
  });

  it("renders the score display", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    // The score-animation starts at 0 and counts up to 45
    expect(screen.getByText("0")).toBeDefined();
  });

  it("renders the verdict text", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByText(/Your body is recovering/)).toBeDefined();
  });

  it("renders sub-components", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByTestId("debt-orb")).toBeDefined();
    expect(screen.getByTestId("debt-gauge")).toBeDefined();
    expect(screen.getByTestId("recovery-timeline")).toBeDefined();
    expect(screen.getByTestId("recovery-schedule")).toBeDefined();
    expect(screen.getByTestId("system-icon-row")).toBeDefined();
  });

  it("renders CTAs", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByTestId("primary-button")).toBeDefined();
    expect(screen.getByTestId("secondary-button")).toBeDefined();
  });

  it("renders streak indicator when streakDays > 0", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByText("3d streak")).toBeDefined();
  });

  it("renders confidence signal", async () => {
    const { DashboardScreen } = await import("@/components/screens/DashboardScreen");
    render(<DashboardScreen />);
    expect(screen.getByTestId("confidence-signal")).toBeDefined();
  });
});
