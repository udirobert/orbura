"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MetricCard } from "./evidence/MetricCard";
import { SYSTEMS_SCIENCE } from "./evidence/systems-science";
import {
  SAMPLE_BENCHMARK,
  SAMPLE_COUNTERFACTUAL,
  ARCHITECTURE_STEPS,
  FALLBACK_CHAIN,
  CONFIDENCE_TIERS,
  DRINK_COUNT_MODS,
  SCORING_METHODOLOGY,
  CIRCADIAN_THRESHOLDS,
} from "./evidence/evidence-data";
import { formatMs } from "@/lib/format-ms";

/**
 * EvidencePage — a static, single-screen page judges can screenshot.
 *
 * Shows everything that matters for the QVAC Hackathon in one place:
 *   - Architecture diagram (camera → ZK proof → score → QVAC 4-agent pipeline)
 *   - Sample agent trace (4 agents with real durations from a recorded run)
 *   - Edge vs Cloud benchmark (real measured timings)
 *   - Counterfactual example output (highest-leverage line of UI)
 *   - Deterministic fallback chain (offline mode)
 *   - Direct links to live app and source code
 */

// ─── Data constants — imported from ./evidence/evidence-data
//     SAMPLE_BENCHMARK, SAMPLE_COUNTERFACTUAL, ARCHITECTURE_STEPS,
//     FALLBACK_CHAIN, CONFIDENCE_TIERS, DRINK_COUNT_MODS,
//     SCORING_METHODOLOGY, CIRCADIAN_THRESHOLDS

// ─── Science data — imported from ./evidence/systems-science

// formatMs imported from @/lib/format-ms

export function EvidencePage() {
  return (
    <div className="min-h-svh px-5 py-10 overflow-x-hidden"
      style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}>

      <div className="max-w-3xl mx-auto space-y-10">

        {/* Header */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🫀</span>
            <span className="app-name text-sm font-bold tracking-widest uppercase" style={{ color: "var(--color-text-primary)" }}>
              BODY DEBT
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--color-states-success)" }} />
              <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
                Edge AI · 4 agents
              </span>
            </span>
          </div>
          <h1 className="text-3xl font-normal leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Evidence bundle for QVAC Hackathon judges
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Single-page summary of architecture, agent pipeline, measured performance, and graceful degradation.
            Everything below is reproducible from the source code and live demo.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{ backgroundColor: "var(--color-brand-primary)", color: "var(--color-text-primary)" }}>
              Open live app →
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-secondary)", border: "1px solid rgba(168,162,158,0.15)" }}>
              View dashboard
            </Link>
            <a href="https://github.com/udirobert/bodydebt" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{ backgroundColor: "var(--color-bg-surface)", color: "var(--color-text-secondary)", border: "1px solid rgba(168,162,158,0.15)" }}>
              Source code ↗
            </a>
          </div>
        </header>

        {/* Headline metrics */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Measured on-device performance
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard label="Edge pipeline (4 agents)" value={formatMs(SAMPLE_BENCHMARK.edgeTotalMs)}
              sub={`${SAMPLE_BENCHMARK.model}`} />
            <MetricCard label="Cloud verdict (parallel)" value={formatMs(SAMPLE_BENCHMARK.cloudVerdictMs)}
              sub="Anthropic Claude 3.5 Haiku" color="var(--color-states-error)" />
            <MetricCard label="Edge outputs vs cloud" value="4×"
              sub="Verdict + Rx + Schedule + Reflection vs single verdict" color="var(--color-states-warning)" />
            <MetricCard label="Data leaving device" value="0 bytes"
              sub="Pipeline runs entirely on-device" color="var(--color-system-muscular)" />
          </div>
        </section>

        {/* Architecture diagram */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            End-to-end architecture
          </h2>
          <div className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            {ARCHITECTURE_STEPS.map((step, i) => (
              <motion.div key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3">
                <span className="text-sm flex-shrink-0 w-6 text-center">{step.icon}</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono" style={{ color: "var(--color-text-faint)", minWidth: 16 }}>
                    {i + 1}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-primary)" }}>
                    {step.label}
                  </span>
                </div>
                {i < ARCHITECTURE_STEPS.length - 1 && (
                  <span className="text-[10px]" style={{ color: "var(--color-text-disabled)" }}>↓</span>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Agent trace */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            4-agent QVAC pipeline (recorded run)
          </h2>
          <div className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(74,222,128,0.15)" }}>
            <div className="flex items-center justify-between pb-2"
              style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
                Input: {SAMPLE_BENCHMARK.input}
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--color-states-success)" }}>
                Personality: {SAMPLE_BENCHMARK.personality}
              </span>
            </div>
            {SAMPLE_BENCHMARK.agentBreakdown.map((a) => (
              <div key={a.agent} className="flex items-start gap-3">
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {a.agent === "triage" ? "🔬" : a.agent === "coach" ? "💊" : a.agent === "schedule" ? "📅" : "🎭"}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize" style={{ color: "var(--color-text-primary)" }}>
                      {a.agent} agent
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--color-states-success)" }}>
                      ✓ {formatMs(a.durationMs)}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{a.role}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2"
              style={{ borderTop: "1px solid rgba(168,162,158,0.06)" }}>
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                Total pipeline
              </span>
              <span className="text-xs font-bold" style={{ color: "var(--color-states-success)" }}>
                {formatMs(SAMPLE_BENCHMARK.edgeTotalMs)} · on-device
              </span>
            </div>
          </div>
        </section>

        {/* Edge vs Cloud bars */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Edge vs Cloud — real measured timings
          </h2>
          <div className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span style={{ color: "var(--color-states-success)" }}>Edge (on-device, 4 agents)</span>
                <span style={{ color: "var(--color-text-primary)" }}>{formatMs(SAMPLE_BENCHMARK.edgeTotalMs)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
                <motion.div className="h-full rounded-full" style={{ backgroundColor: "var(--color-states-success)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${(SAMPLE_BENCHMARK.edgeTotalMs / SAMPLE_BENCHMARK.cloudVerdictMs) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span style={{ color: "var(--color-states-error)" }}>Cloud (parallel verdict)</span>
                <span style={{ color: "var(--color-text-secondary)" }}>{formatMs(SAMPLE_BENCHMARK.cloudVerdictMs)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,162,158,0.1)" }}>
                <div className="h-full rounded-full" style={{ backgroundColor: "var(--color-states-error)", width: "100%" }} />
              </div>
            </div>
            <p className="text-[10px] text-center font-mono pt-1" style={{ color: "var(--color-text-primary)" }}>
              4× the outputs in similar latency — and zero biometric data left the device
            </p>
          </div>
        </section>

        {/* Counterfactual */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Counterfactual — the highest-leverage line in the UI
          </h2>
          <div className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(245,158,11,0.25)", borderLeft: "3px solid var(--color-states-warning)" }}>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2" style={{ color: "var(--color-states-warning)" }}>
              What would change this
            </span>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              If you had{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{SAMPLE_COUNTERFACTUAL.leverLabel}</strong>,{" "}
              <strong style={{ color: "var(--color-states-warning)" }}>{SAMPLE_COUNTERFACTUAL.systemLabel}</strong>{" "}
              debt would drop from{" "}
              <strong style={{ color: "var(--color-text-primary)" }}>{SAMPLE_COUNTERFACTUAL.fromScore}</strong> to{" "}
              <strong style={{ color: "var(--color-states-success)" }}>{SAMPLE_COUNTERFACTUAL.toScore}</strong>{" "}
              <span style={{ color: "var(--color-states-success)" }}>
                (−{SAMPLE_COUNTERFACTUAL.delta} points)
              </span>.
            </p>
            <p className="text-[9px] font-mono mt-3" style={{ color: "var(--color-text-faint)" }}>
              Deterministic engine. Single-variable re-run. Not an LLM. ~3ms.
            </p>
          </div>
        </section>

        {/* Fallback chain */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Graceful degradation — every layer has a fallback
          </h2>
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            <div className="grid grid-cols-3 px-4 py-2 text-[9px] font-mono uppercase tracking-wider"
              style={{ backgroundColor: "rgba(168,162,158,0.04)", color: "var(--color-text-faint)", borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
              <span>Layer</span>
              <span>Primary</span>
              <span>Fallback</span>
            </div>
            {FALLBACK_CHAIN.map((row, i) => (
              <div key={row.layer}
                className="grid grid-cols-3 px-4 py-2.5 text-[11px]"
                style={{ borderBottom: i < FALLBACK_CHAIN.length - 1 ? "1px solid rgba(168,162,158,0.04)" : "none" }}>
                <span style={{ color: "var(--color-text-primary)" }}>{row.layer}</span>
                <span style={{ color: "var(--color-states-success)" }}>{row.primary}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>{row.fallback}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2 font-mono" style={{ color: "var(--color-text-faint)" }}>
            Cloud calls have 5s and 8s timeouts. After first inference, the QVAC model is cached locally — subsequent runs work fully offline.
          </p>
        </section>

        {/* Privacy story */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Privacy story — ZK proof as the verification layer
          </h2>
          <div className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              The face scan produces a 7-dimensional feature vector. A zero-knowledge proof circuit
              runs in a Web Worker to prove the score was computed from real biometric data — without
              exposing that data. The proof is verified locally, then committed on-chain to{" "}
              <a href="https://juicy-low-small-testnet.explorer.skalenodes.com/"
                target="_blank" rel="noreferrer"
                className="underline" style={{ color: "var(--color-states-success)" }}>
                SKALE Europa testnet
              </a>{" "}
              via{" "}
              <code className="px-1 rounded font-mono text-[10px]"
                style={{ backgroundColor: "rgba(168,162,158,0.08)", color: "var(--color-text-primary)" }}>
                HealthCredentialVerifier.verifyAndLogCredential
              </code>
              .
            </p>
            <p className="text-[10px] font-mono" style={{ color: "var(--color-text-faint)" }}>
              Biometric data never leaves the device. The on-chain anchor is a verifiable commitment
              that the score came from a real face — not a screenshot.
            </p>
          </div>
        </section>

        {/* ── Science behind the scoring ── */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Science behind the scoring
          </h2>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            The Body Debt scoring engine is a deterministic, rule-based system rooted in peer-reviewed
            physiology research. Each of the five recovery systems accumulates debt independently based on
            the type, intensity, and timing of user-reported stressors. Below is the scientific basis for
            each system&apos;s scoring logic and the evidence that informs it.
          </p>

          {SYSTEMS_SCIENCE.map((s, i) => (
            <motion.div
              key={s.system}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl mb-3 overflow-hidden"
              style={{ backgroundColor: "var(--color-bg-surface)", border: `1px solid ${s.accent}22` }}
            >
              {/* System header */}
              <div className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
                <span className="text-lg">{s.icon}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {s.system}
                </span>
                <div className="w-1.5 h-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: s.accent }} />
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Science citation card */}
                <div className="rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: `${s.accent}0A`, border: `1px solid ${s.accent}18` }}>
                  <p className="text-[10px] italic leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    &ldquo;{s.fact}&rdquo;
                  </p>
                  <p className="text-[9px] font-mono mt-1" style={{ color: s.accent }}>
                    — {s.cite}
                  </p>
                </div>

                {/* Expanded context */}
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {s.expanded}
                </p>

                {/* Stressor scoring table */}
                <div>
                  <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                    Scoring inputs
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {s.stressors.map((st) => (
                      <div key={st.name} className="flex items-start gap-2 py-1">
                        <span className="text-[10px] font-mono font-medium flex-shrink-0" style={{ color: s.accent, minWidth: 80 }}>
                          {st.name}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--color-text-disabled)" }}>
                          {st.systems}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* ── Scoring methodology ── */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Scoring methodology — how stressor inputs map to system scores
          </h2>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            Each stressor the user logs carries a base point value and a set of system-specific multipliers.
            The scoring engine runs in under 5ms with no external calls — every score is fully deterministic
            and reproducible from the same inputs.
          </p>

          {SCORING_METHODOLOGY.map((cat) => (
            <div key={cat.category}
              className="rounded-2xl mb-3 overflow-hidden"
              style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
              <div className="px-4 py-2.5"
                style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {cat.category}
                </span>
                <p className="text-[9px] mt-0.5 font-mono" style={{ color: "var(--color-text-faint)" }}>
                  {cat.note}
                </p>
              </div>
              <div className="px-4 py-2.5 overflow-x-auto">
                <table className="w-full text-[9px] font-mono">
                  <thead>
                    <tr>
                      <th className="text-left py-1 pr-3" style={{ color: "var(--color-text-faint)" }}>Variable</th>
                      {Object.keys(cat.modifiers[0]).filter((k) => k !== "label").map((k) => (
                        <th key={k} className="text-right py-1 px-2" style={{ color: "var(--color-text-faint)" }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.modifiers.map((row) => (
                      <tr key={row.label}>
                        <td className="py-1 pr-3 font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {row.label}
                        </td>
                        {Object.entries(row).filter(([k]) => k !== "label").map(([k, v]) => (
                          <td key={k} className="text-right py-1 px-2" style={{ color: "var(--color-text-secondary)" }}>
                            {v}×
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Alcohol count modifiers — only shown for the Alcohol category */}
              {cat.category === "Alcohol" && (
                <div className="border-t" style={{ borderColor: "rgba(168,162,158,0.06)" }}>
                  <div className="px-4 py-2">
                    <span className="text-[8px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-faint)" }}>
                      Count multiplier (applied after drink-type modifier)
                    </span>
                    <table className="w-full text-[9px] font-mono mt-1">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-3" style={{ color: "var(--color-text-faint)" }}>Drinks</th>
                          <th className="text-right py-1 px-2" style={{ color: "var(--color-text-faint)" }}>Multiplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DRINK_COUNT_MODS.map((row) => (
                          <tr key={row.label}>
                            <td className="py-1 pr-3" style={{ color: "var(--color-text-primary)" }}>{row.label}</td>
                            <td className="text-right py-1 px-2" style={{ color: "var(--color-text-secondary)" }}>{row.mod}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Circadian penalty */}
          <div className="rounded-2xl mb-3 overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            <div className="px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Circadian penalty — bedtime timing
              </span>
              <p className="text-[9px] mt-0.5 font-mono" style={{ color: "var(--color-text-faint)" }}>
                Additional brain + cardiovascular debt from late bedtimes. Sleep under 6 hours adds +4 per missing hour regardless of timing.
              </p>
            </div>
            <div className="px-4 py-2.5 overflow-x-auto">
              <table className="w-full text-[9px] font-mono">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-3" style={{ color: "var(--color-text-faint)" }}>Bedtime window</th>
                    <th className="text-right py-1 px-2" style={{ color: "var(--color-text-faint)" }}>Brain</th>
                    <th className="text-right py-1 px-2" style={{ color: "var(--color-text-faint)" }}>Cardiovascular</th>
                    <th className="text-right py-1 pl-2" style={{ color: "var(--color-text-faint)" }}>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {CIRCADIAN_THRESHOLDS.map((r) => (
                    <tr key={r.window}>
                      <td className="py-1 pr-3 font-medium" style={{ color: "var(--color-text-primary)" }}>{r.window}</td>
                      <td className="text-right py-1 px-2" style={{ color: "var(--color-states-error)" }}>{r.brain}</td>
                      <td className="text-right py-1 px-2" style={{ color: r.cardio === "0" ? "var(--color-text-disabled)" : "var(--color-states-warning)" }}>{r.cardio}</td>
                      <td className="text-right py-1 pl-2" style={{
                        color: r.label === "Aligned"
                          ? "var(--color-states-success)"
                          : r.label === "Mild mismatch"
                          ? "var(--color-states-warning)"
                          : "var(--color-states-error)"
                      }}>{r.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Football-specific stressors */}
          <div className="rounded-2xl mb-3 overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            <div className="px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Football-specific stressors (Match Fit mode)
              </span>
              <p className="text-[9px] mt-0.5 font-mono" style={{ color: "var(--color-text-faint)" }}>
                Additional stressor types available when the app is in football/squad mode.
              </p>
            </div>
            <div className="px-4 py-2.5 space-y-3">
              <div>
                <span className="text-[9px] font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>Match minutes</span>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  35 points on muscular/CNS × modifier, 30 on cardiovascular × modifier.
                  Under 30 min: 0.3–0.4×, 30–60 min: 0.6–0.7×, 60–90 min: 0.9–1.0×, extra time: 1.2–1.3×.
                </p>
              </div>
              <div>
                <span className="text-[9px] font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>Card/disciplinary stress</span>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  20 points on brain × modifier, 10 on cardiovascular. Yellow: 0.4×, heavy foul: 0.7×, red: 1.0×.
                </p>
              </div>
              <div>
                <span className="text-[9px] font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>Travel / timezone shift</span>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  1–2h shift adds +8 brain, +5 cardio, +3 gut. 3–5h adds +18 brain, +10 cardio, +8 gut. 6h+ adds +30 brain, +18 cardio, +15 gut.
                </p>
              </div>
              <div>
                <span className="text-[9px] font-mono font-semibold" style={{ color: "var(--color-text-primary)" }}>Concussion check</span>
                <p className="text-[9px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  50 base points on brain × severity modifier. Minor: 0.8×, moderate: 1.0×, protocol: 1.5×.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Confidence tier ladder ── */}
        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--color-text-faint)" }}>
            Confidence tier ladder — from estimated to precise
          </h2>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            As more data sources are connected (face scan, wearable HRV), the debt score moves through
            five confidence tiers. Each tier adds a layer of biometric calibration over the deterministic
            base score.
          </p>
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid rgba(168,162,158,0.08)" }}>
            {CONFIDENCE_TIERS.map((t, i) => (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: i < CONFIDENCE_TIERS.length - 1 ? "1px solid rgba(168,162,158,0.04)" : "none" }}>
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: i < 2 ? "rgba(168,162,158,0.15)" : i === 2 ? "rgba(245,158,11,0.2)" : i === 3 ? "rgba(34,211,238,0.2)" : "rgba(74,222,128,0.2)",
                      border: `1px solid ${
                        i < 2 ? "rgba(168,162,158,0.3)" : i === 2 ? "rgba(245,158,11,0.4)" : i === 3 ? "rgba(34,211,238,0.4)" : "rgba(74,222,128,0.4)"
                      }`,
                    }}>
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: i < 2 ? "rgba(168,162,158,0.5)" : i === 2 ? "var(--color-states-warning)" : i === 3 ? "#22D3EE" : "var(--color-states-success)",
                      }} />
                  </div>
                  {i < CONFIDENCE_TIERS.length - 1 && (
                    <div className="w-px h-4" style={{ backgroundColor: "rgba(168,162,158,0.1)" }} />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {t.tier}
                    </span>
                    <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: i < 2 ? "rgba(168,162,158,0.08)" : i === 2 ? "rgba(245,158,11,0.1)" : i === 3 ? "rgba(34,211,238,0.1)" : "rgba(74,222,128,0.1)",
                        color: i < 2 ? "var(--color-text-faint)" : i === 2 ? "var(--color-states-warning)" : i === 3 ? "#22D3EE" : "var(--color-states-success)",
                      }}>
                      {t.level}
                    </span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {t.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 pb-2 space-y-2">
          <p className="text-[10px] font-mono" style={{ color: "var(--color-text-disabled)" }}>
            Built for the QVAC Hackathon I — Unleash Edge AI · DoraHacks · June 2026
          </p>
          <p className="text-[10px] font-mono" style={{ color: "var(--color-text-disabled)" }}>
            Three AI agents, one local model, zero cloud calls for the inference path.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/autoscientist" className="text-[10px] font-mono underline" style={{ color: "var(--color-text-faint)" }}>
              AutoScientist Challenge page
            </Link>
            <span style={{ color: "var(--color-text-disabled)" }}>·</span>
            <Link href="/tether" className="text-[10px] font-mono underline" style={{ color: "var(--color-text-faint)" }}>
              Tether Developers Cup page
            </Link>
            <span style={{ color: "var(--color-text-disabled)" }}>·</span>
            <Link href="/" className="text-[10px] font-mono underline" style={{ color: "var(--color-text-faint)" }}>
              Live app
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
