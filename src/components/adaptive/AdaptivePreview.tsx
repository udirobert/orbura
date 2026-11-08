"use client";

import { useState } from "react";
import { ADAPTIVE_SCENARIOS } from "@/lib/today/fixtures";
import { PatientDensity } from "@/components/adaptive/PatientDensity";
import { ClinicianDensity } from "@/components/adaptive/ClinicianDensity";
import { AuditorDensity } from "@/components/adaptive/AuditorDensity";

const DENSITIES = [
  { id: "patient", label: "Patient" },
  { id: "clinician", label: "Clinician" },
  { id: "auditor", label: "Auditor" },
] as const;

export function AdaptivePreview() {
  const [scenarioId, setScenarioId] = useState(ADAPTIVE_SCENARIOS[0].id);
  const [density, setDensity] = useState<(typeof DENSITIES)[number]["id"]>("patient");
  const scenario = ADAPTIVE_SCENARIOS.find((s) => s.id === scenarioId)!;

  return (
    <div className="min-h-svh px-5 py-10" style={{ backgroundColor: "var(--color-bg-base)" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
            Adaptive UX · role densities
          </p>
          <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            One decision, three densities
          </h1>
          <p className="text-sm max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
            The same deterministic TodayState rendered for the person acting on it,
            the clinician overseeing it, and the auditor verifying it.
          </p>
        </header>

        {/* Scenario picker */}
        <div className="flex flex-wrap gap-2">
          {ADAPTIVE_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenarioId(s.id)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: scenarioId === s.id ? "var(--color-brand-primary)" : "var(--color-bg-surface)",
                color: scenarioId === s.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                border: "1px solid var(--color-border-subtle)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs -mt-5" style={{ color: "var(--color-text-muted)" }}>
          {scenario.blurb}
        </p>

        {/* Density picker */}
        <div className="flex gap-1 p-1 rounded-full self-start" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDensity(d.id)}
              className="px-5 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                backgroundColor: density === d.id ? "var(--color-brand-primary)" : "transparent",
                color: density === d.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {density === "patient" && <PatientDensity state={scenario.state} />}
            {density === "clinician" && <ClinicianDensity scenario={scenario} />}
            {density === "auditor" && <AuditorDensity scenario={scenario} />}
          </div>
          <aside
            className="rounded-2xl p-4 h-fit"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}
          >
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
              Decision object
            </p>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><dt style={{ color: "var(--color-text-muted)" }}>rule</dt><dd className="font-mono" style={{ color: "var(--color-text-secondary)" }}>{scenario.state.rule}</dd></div>
              <div className="flex justify-between"><dt style={{ color: "var(--color-text-muted)" }}>surface</dt><dd className="font-mono" style={{ color: "var(--color-text-secondary)" }}>{scenario.state.surface}</dd></div>
              <div className="flex justify-between"><dt style={{ color: "var(--color-text-muted)" }}>action</dt><dd className="font-mono text-right" style={{ color: "var(--color-text-secondary)" }}>{scenario.state.primaryAction.label}</dd></div>
              <div className="flex justify-between"><dt style={{ color: "var(--color-text-muted)" }}>state</dt><dd className="font-mono" style={{ color: "var(--color-text-secondary)" }}>{scenario.state.headline.stateWord}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}
