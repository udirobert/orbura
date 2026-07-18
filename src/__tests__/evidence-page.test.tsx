import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvidencePage } from "@/components/screens/EvidencePage";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock framer-motion to render children without animation
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileTap, variants, ...safeProps } = props;
      return <div {...safeProps}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, variants, ...safeProps } = props;
      return <span {...safeProps}>{children}</span>;
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

// Mock next/link to render as a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Page structure tests ────────────────────────────────────────────────────

describe("EvidencePage — page structure", () => {
  it("renders the page title", () => {
    render(<EvidencePage />);
    expect(screen.getByText("QVAC Hackathon evidence bundle")).toBeDefined();
  });

  it("renders the app name badge", () => {
    render(<EvidencePage />);
    expect(screen.getByText("BODY DEBT")).toBeDefined();
  });

  it("renders the Self-hosted AI badge", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Self-hosted AI · 4 agents")).toBeDefined();
  });

  it("renders navigation links", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Open live app →")).toBeDefined();
    expect(screen.getByText("View dashboard")).toBeDefined();
    expect(screen.getByText("Source code ↗")).toBeDefined();
  });

  it("renders all section headings", () => {
    render(<EvidencePage />);
    const headings = [
      "Measured self-hosted performance",
      "End-to-end architecture",
      "4-agent QVAC pipeline (recorded run)",
      "Edge vs Cloud — real measured timings",
      "Counterfactual — the highest-leverage line in the UI",
      "Graceful degradation — every layer has a fallback",
      "Privacy story — ZK proof as the verification layer",
      "Science behind the scoring",
      "Scoring methodology — how stressor inputs map to system scores",
      "Confidence tier ladder — from estimated to precise",
    ];
    for (const h of headings) {
      expect(screen.getByText(h)).toBeDefined();
    }
  });

  it("renders the footer", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/QVAC Hackathon I/)).toBeDefined();
  });
});

// ─── Metric cards ────────────────────────────────────────────────────────────

describe("EvidencePage — metric cards", () => {
  it("renders all 4 headline metric cards", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Self-hosted pipeline (4 agents)")).toBeDefined();
    expect(screen.getByText("Cloud verdict (parallel)")).toBeDefined();
    expect(screen.getByText("Self-hosted outputs vs cloud")).toBeDefined();
    expect(screen.getByText("Third-party model API")).toBeDefined();
  });

  it("renders the edge pipeline latency value (appears twice — metric card + total pipeline)", () => {
    render(<EvidencePage />);
    // 21_500 ms = 21.5s; appears in the metric card and the agent trace total
    expect(screen.getAllByText("21.5s").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the 'None' third-party API claim", () => {
    render(<EvidencePage />);
    expect(screen.getByText("None")).toBeDefined();
  });

  it("renders the '4×' throughput claim", () => {
    render(<EvidencePage />);
    expect(screen.getByText("4×")).toBeDefined();
  });
});

// ─── Architecture diagram ────────────────────────────────────────────────────

describe("EvidencePage — architecture diagram", () => {
  it("renders all 9 architecture steps", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Camera frame")).toBeDefined();
    expect(screen.getByText(/MediaPipe FaceMesh/)).toBeDefined();
    expect(screen.getByText(/EZKL ZK proof/)).toBeDefined();
    expect(screen.getByText(/SKALE on-chain commit/)).toBeDefined();
    expect(screen.getByText(/Deterministic 5-system score/)).toBeDefined();
    expect(screen.getByText(/Counterfactual engine/)).toBeDefined();
    // "QVAC 4-agent pipeline" also appears in the fallback chain
    expect(screen.getAllByText(/QVAC 4-agent pipeline/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Deterministic schedule/)).toBeDefined();
    expect(screen.getByText(/Streaming SSE/)).toBeDefined();
  });
});

// ─── Agent trace ────────────────────────────────────────────────────────────

describe("EvidencePage — agent trace", () => {
  it("shows the recorded run input", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/alcohol 3 drinks \+ sleep 5h/)).toBeDefined();
  });

  it("shows all 4 agent entries", () => {
    render(<EvidencePage />);
    // "coach agent" also appears in the fallback chain ("QVAC Coach Agent")
    expect(screen.getByText(/triage agent/i)).toBeDefined();
    expect(screen.getAllByText(/coach agent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/schedule agent/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/reflection agent/i)).toBeDefined();
  });
});

// ─── Edge vs Cloud ──────────────────────────────────────────────────────────

describe("EvidencePage — Edge vs Cloud benchmark", () => {
  it("renders both timing labels", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/Self-hosted \(4 agents\)/)).toBeDefined();
    expect(screen.getByText(/Cloud \(parallel verdict\)/)).toBeDefined();
  });
});

// ─── Counterfactual ─────────────────────────────────────────────────────────

describe("EvidencePage — counterfactual section", () => {
  it("renders the counterfactual heading", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Counterfactual — the highest-leverage line in the UI")).toBeDefined();
  });

  it("renders the counterfactual insight text", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/slept 7\+ hours/)).toBeDefined();
    expect(screen.getByText(/−45 points/)).toBeDefined();
  });
});

// ─── Fallback chain ─────────────────────────────────────────────────────────

describe("EvidencePage — fallback chain", () => {
  it("renders all fallback chain layers", () => {
    render(<EvidencePage />);
    // "QVAC 4-agent pipeline" also appears in architecture diagram
    expect(screen.getAllByText("QVAC 4-agent pipeline").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Verdict")).toBeDefined();
    expect(screen.getByText("Prescription")).toBeDefined();
    expect(screen.getByText("Schedule")).toBeDefined();
    expect(screen.getByText("Counterfactual")).toBeDefined();
  });

  it("renders primary and fallback columns", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Self-hosted inference")).toBeDefined();
    expect(screen.getByText("Always available — no AI needed")).toBeDefined();
    expect(screen.getByText(/Deterministic rule-based prescription/)).toBeDefined();
  });
});

// ─── Privacy story ──────────────────────────────────────────────────────────

describe("EvidencePage — privacy story", () => {
  it("renders the privacy section", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Privacy story — ZK proof as the verification layer")).toBeDefined();
  });

  it("mentions SKALE testnet", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/SKALE Europa testnet/)).toBeDefined();
  });

  it("mentions HealthCredentialVerifier", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/HealthCredentialVerifier\.verifyAndLogCredential/)).toBeDefined();
  });
});

// ─── Science behind the scoring ─────────────────────────────────────────────

describe("EvidencePage — science behind the scoring", () => {
  it("renders the section heading and description", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Science behind the scoring")).toBeDefined();
    expect(screen.getByText(/deterministic, rule-based system rooted in peer-reviewed/)).toBeDefined();
  });

  it("renders all 5 system cards with their names", () => {
    render(<EvidencePage />);
    // "Cardiovascular" also appears as a circadian table column header
    expect(screen.getAllByText("Cardiovascular").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Brain / Cognition")).toBeDefined();
    expect(screen.getByText("Liver")).toBeDefined();
    expect(screen.getByText("Muscular / CNS")).toBeDefined();
    expect(screen.getByText("Gut")).toBeDefined();
  });

  it("renders Cardiovascular science fact and citation", () => {
    render(<EvidencePage />);
    expect(
      screen.getByText(/Resting heart rate remains elevated for 12–24 hours after alcohol consumption/)
    ).toBeDefined();
    expect(screen.getByText(/Spaak et al\./)).toBeDefined();
  });

  it("renders Brain / Cognition science fact and citation", () => {
    render(<EvidencePage />);
    expect(
      screen.getByText(/Sleep deprivation of even one night impairs prefrontal cortex/)
    ).toBeDefined();
    expect(screen.getByText(/Harrison & Horne/)).toBeDefined();
  });

  it("renders Liver science fact and citation", () => {
    render(<EvidencePage />);
    expect(
      screen.getByText(/liver metabolises approximately one standard drink per hour/)
    ).toBeDefined();
    expect(screen.getByText(/Lieber, Physiological Reviews, 1997/)).toBeDefined();
  });

  it("renders Muscular / CNS science fact and citation", () => {
    render(<EvidencePage />);
    // The fact starts with uppercase "Alcohol" in the component
    expect(
      screen.getByText(/Alcohol consumed within 24 hours of resistance training reduces muscle protein synthesis/i)
    ).toBeDefined();
    expect(screen.getByText(/Parr et al\., PLOS ONE, 2014/)).toBeDefined();
  });

  it("renders Gut science fact and citation", () => {
    render(<EvidencePage />);
    expect(
      screen.getByText(/single episode of heavy drinking alters gut microbiome composition/)
    ).toBeDefined();
    expect(screen.getByText(/Bishehsari et al\., Alcohol Research, 2017/)).toBeDefined();
  });

  it("renders expanded physiology context for each system", () => {
    render(<EvidencePage />);
    expect(
      screen.getByText(/Alcohol suppresses vagal tone and increases sympathetic activity/)
    ).toBeDefined();
    expect(
      screen.getByText(/brain is the most stressor-sensitive system/)
    ).toBeDefined();
    expect(
      screen.getByText(/liver is the primary ethanol-metabolising organ/)
    ).toBeDefined();
    expect(
      screen.getByText(/Muscle recovery is primarily CNS-driven/)
    ).toBeDefined();
    expect(
      screen.getByText(/gut microbiome is highly sensitive to alcohol/)
    ).toBeDefined();
  });

  it("renders 'Scoring inputs' label for each system card", () => {
    render(<EvidencePage />);
    const scoringInputs = screen.getAllByText("Scoring inputs");
    expect(scoringInputs).toHaveLength(5);
  });

  it("renders stressor names within each system card", () => {
    render(<EvidencePage />);
    // These appear in multiple system cards, use getAllByText
    expect(screen.getAllByText("Alcohol").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Training").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Match minutes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Illness").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Self-care").length).toBeGreaterThanOrEqual(1);
    // Brain-specific — appear only once
    expect(screen.getByText("Concussion")).toBeDefined();
    expect(screen.getByText("Card stress")).toBeDefined();
    expect(screen.getByText("Circadian")).toBeDefined();
  });
});

// ─── Scoring methodology ────────────────────────────────────────────────────

describe("EvidencePage — scoring methodology", () => {
  it("renders all 3 methodology categories", () => {
    render(<EvidencePage />);
    // "Alcohol" also appears in system science cards
    expect(screen.getAllByText("Alcohol").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Sleep deprivation")).toBeDefined();
    expect(screen.getAllByText("Training").length).toBeGreaterThanOrEqual(1);
  });

  it("renders alcohol drink-type modifier table", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Beer")).toBeDefined();
    expect(screen.getByText("Red wine")).toBeDefined();
    expect(screen.getByText("White wine")).toBeDefined();
    expect(screen.getByText("Champagne")).toBeDefined();
    expect(screen.getByText("Spirits")).toBeDefined();
    expect(screen.getByText("Cocktails")).toBeDefined();
  });

  it("renders alcohol drink-type modifier values with × suffix (appears in multiple rows)", () => {
    render(<EvidencePage />);
    // "0.8×" appears in Beer (liver) and the count modifiers table
    expect(screen.getAllByText("0.8×").length).toBeGreaterThanOrEqual(1);
  });

  it("renders alcohol count modifiers sub-table", () => {
    render(<EvidencePage />);
    expect(screen.getByText("1–2 drinks")).toBeDefined();
    expect(screen.getByText("3–4 drinks")).toBeDefined();
    expect(screen.getByText("5+ drinks")).toBeDefined();
    expect(screen.getByText("Lost count")).toBeDefined();
  });

  it("renders count multiplier values", () => {
    render(<EvidencePage />);
    expect(screen.getByText("0.5×")).toBeDefined();
    // "1.2×" also appears in training intensity (destroyed = 1.2×) somewhere in
    // expanded text — use getAllByText
    expect(screen.getAllByText("1.2×").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sleep deprivation modifier table", () => {
    render(<EvidencePage />);
    expect(screen.getByText("< 4 hours")).toBeDefined();
    expect(screen.getByText("4–6 hours")).toBeDefined();
    expect(screen.getByText("6–7 hours")).toBeDefined();
  });

  it("renders training area × intensity table", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Legs / Full body")).toBeDefined();
    expect(screen.getByText("HIIT")).toBeDefined();
    expect(screen.getByText("Cardio / Upper")).toBeDefined();
    expect(screen.getByText("Mobility")).toBeDefined();
  });
});

// ─── Circadian penalty ──────────────────────────────────────────────────────

describe("EvidencePage — circadian penalty", () => {
  it("renders the circadian section heading", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Circadian penalty — bedtime timing")).toBeDefined();
  });

  it("renders all 4 bedtime window rows", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Before midnight")).toBeDefined();
    expect(screen.getByText("12am – 2am")).toBeDefined();
    expect(screen.getByText("2am – 4am")).toBeDefined();
    expect(screen.getByText("4am – 6am")).toBeDefined();
  });

  it("renders all 4 classification labels", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Aligned")).toBeDefined();
    expect(screen.getByText("Mild mismatch")).toBeDefined();
    expect(screen.getByText("Significant")).toBeDefined();
    expect(screen.getByText("Severe")).toBeDefined();
  });

  it("renders brain penalty values for each row", () => {
    render(<EvidencePage />);
    // "+10" also appears in "Under 30 min: 0.3–0.4×, 30–60 min: 0.6–0.7×" in
    // football stressors — the regex "60 min" contains "10" but not "+10"
    expect(screen.getAllByText("+10").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("+22")).toBeDefined();
    expect(screen.getByText("+32")).toBeDefined();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Football-specific stressors ────────────────────────────────────────────

describe("EvidencePage — football-specific stressors", () => {
  it("renders the section heading", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Football-specific stressors (Match Fit mode)")).toBeDefined();
  });

  it("renders all 4 football stressor titles", () => {
    render(<EvidencePage />);
    // "Match minutes" also appears in system science cards
    expect(screen.getAllByText("Match minutes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Card/disciplinary stress")).toBeDefined();
    expect(screen.getByText("Travel / timezone shift")).toBeDefined();
    expect(screen.getByText("Concussion check")).toBeDefined();
  });

  it("renders concussion severity modifiers", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/Minor: 0\.8×, moderate: 1\.0×, protocol: 1\.5×/)).toBeDefined();
  });
});

// ─── Confidence tier ladder ──────────────────────────────────────────────────

describe("EvidencePage — confidence tier ladder", () => {
  it("renders all 5 confidence tiers", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Estimated")).toBeDefined();
    expect(screen.getByText("Partial")).toBeDefined();
    expect(screen.getByText("Good")).toBeDefined();
    expect(screen.getByText("Accurate")).toBeDefined();
    expect(screen.getByText("Precise")).toBeDefined();
  });

  it("renders tier level badges", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Stressors only")).toBeDefined();
    expect(screen.getByText("Stressor specifics")).toBeDefined();
    expect(screen.getByText("Stressor context + timing")).toBeDefined();
    expect(screen.getByText("+ Face scan biometrics")).toBeDefined();
    expect(screen.getByText("+ Wearable HRV data")).toBeDefined();
  });

  it("renders tier descriptions", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/Basic debt score from user-reported stressors alone/)).toBeDefined();
    expect(screen.getByText(/HRV delta and resting heart rate from Terra/)).toBeDefined();
  });
});

// ─── Footer ─────────────────────────────────────────────────────────────────

describe("EvidencePage — footer", () => {
  it("renders the hackathon attribution", () => {
    render(<EvidencePage />);
    expect(screen.getByText(/Built for the QVAC Hackathon I/)).toBeDefined();
  });
});
