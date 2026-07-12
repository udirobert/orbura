"use client";

import { motion } from "framer-motion";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";
import Link from "next/link";
import {
  TOURNAMENT_DATES,
  PITCH,
  HERO,
  EXPERIENCES,
  FAN_STORY,
  FAN_SCIENCE,
  FAN_STRESSORS,
  FAN_QVAC_OUTPUT,
  FOOTBALL_STRESSORS,
  READINESS_TIERS,
  QVAC_PIPELINE,
  ARCHITECTURE,
  PERFORMANCE,
  JUDGING_CRITERIA,
  TETHER_LINKS,
  FALLBACK_CHAIN,
  PAYMENT_TYPES,
  PAYMENT_FLOW,
} from "./tether-data";

/**
 * TetherPage — judge page for the Tether Developers Cup.
 *
 * Story: a football match is a physiological event for the players AND the
 * billions who watch. One on-device engine, two experiences — Match Fit (the
 * team doctor for players & coaches, + WDK squad payments) and Fan Recovery
 * (an emotional-recovery coach for fans). No cloud, no API keys, no account.
 */
export function TetherPage() {
  return (
    <div
      className="min-h-svh px-5 py-10 overflow-x-hidden"
      style={{
        backgroundColor: "var(--color-bg-base)",
        color: "var(--color-text-primary)",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-12">
        {/* ─── Hero ─── */}
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "var(--color-text-primary)" }}
            >
              BODY DEBT
            </span>
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: "var(--color-states-success)" }}
              />
              <span
                className="text-[8px] font-mono uppercase tracking-wider"
                style={{ color: "var(--color-states-success)" }}
              >
                QVAC + WDK · Tether Cup
              </span>
            </span>
          </div>

          <span
            className="text-[10px] font-mono uppercase tracking-widest block"
            style={{ color: "var(--color-text-faint)" }}
          >
            {HERO.eyebrow}
          </span>

          <h1
            className="text-4xl font-normal leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {HERO.headlineTop}
            <br />
            <span style={{ color: "var(--color-states-success)" }}>
              {HERO.headlineAccent}
            </span>
          </h1>

          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {HERO.subheadline}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={TETHER_LINKS.live}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-states-success)",
                color: "#0A0A0B",
              }}
            >
              Open Match Fit →
            </Link>
            <Link
              href={TETHER_LINKS.squad}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              Squad view →
            </Link>
            <a
              href={TETHER_LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              Source code ↗
            </a>
            <a
              href={TETHER_LINKS.qvac}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              QVAC SDK ↗
            </a>
            <a
              href={TETHER_LINKS.wdk}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              WDK ↗
            </a>
          </div>
        </header>

        {/* ─── Two experiences, one engine ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Two experiences · one on-device engine
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {EXPERIENCES.map((e, i) => (
              <motion.div
                key={e.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, ease: EASE_PROTOCOL }}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: `1px solid ${e.color}22`,
                  borderLeft: `3px solid ${e.color}`,
                }}
              >
                <span className="text-xl flex-shrink-0">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: e.color }}
                    >
                      {e.name}
                    </span>
                    <span
                      className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--color-bg-elevated)",
                        color: "var(--color-text-faint)",
                      }}
                    >
                      {e.audience}
                    </span>
                  </div>
                  <p
                    className="text-[11px] mt-1 leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {e.line}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <p
            className="text-[10px] mt-2 font-mono"
            style={{ color: "var(--color-text-faint)" }}
          >
            Same scoring engine, same QVAC pipeline, same five-system model —
            re-pointed at a new audience through a data-driven context, not a fork.
          </p>
        </section>

        {/* ─── The problem / solution ─── */}
        <section className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(220,38,38,0.15)",
              borderLeft: "3px solid var(--color-states-error)",
            }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2"
              style={{ color: "var(--color-states-error)" }}
            >
              The problem
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {PITCH.problem}
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(74,222,128,0.15)",
              borderLeft: "3px solid var(--color-states-success)",
            }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2"
              style={{ color: "var(--color-states-success)" }}
            >
              The solution
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {PITCH.solution}
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(34,211,238,0.15)",
              borderLeft: "3px solid #22D3EE",
            }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2"
              style={{ color: "#22D3EE" }}
            >
              Why QVAC makes this possible
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {PITCH.whyQvac}
            </p>
          </div>
        </section>

        {/* ─── Performance metrics ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            On-device performance
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Full pipeline"
              value={PERFORMANCE.totalPipeline}
              sub={PERFORMANCE.model}
              color="var(--color-states-success)"
            />
            <MetricCard
              label="Model size"
              value={PERFORMANCE.modelSize}
              sub="Q4 quantized, cached after first run"
              color="var(--color-states-warning)"
            />
            <MetricCard
              label="Cloud calls"
              value="0"
              sub="All inference via @qvac/sdk"
              color="#22D3EE"
            />
            <MetricCard
              label="Outputs per scan"
              value="4"
              sub="Triage + Rx + Schedule + Reflection"
              color="var(--color-brand-primary)"
            />
          </div>
        </section>

        {/* ─── Architecture ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            End-to-end — from squad to readiness board
          </h2>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {ARCHITECTURE.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, ease: EASE_PROTOCOL }}
                className="flex items-start gap-3"
              >
                <span className="text-sm flex-shrink-0 w-6 text-center mt-0.5">
                  {step.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-mono"
                      style={{
                        color: "var(--color-text-faint)",
                        minWidth: 16,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {step.step}
                    </span>
                  </div>
                  <p
                    className="text-[10px] mt-0.5 pl-6"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {step.detail}
                  </p>
                </div>
                {i < ARCHITECTURE.length - 1 && (
                  <span
                    className="text-[10px] mt-1"
                    style={{ color: "var(--color-text-disabled)" }}
                  >
                    ↓
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── QVAC 4-agent pipeline ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            QVAC 4-agent pipeline — football output
          </h2>
          <div className="space-y-3">
            {QVAC_PIPELINE.map((a, i) => (
              <motion.div
                key={a.agent}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, ease: EASE_PROTOCOL }}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid rgba(74,222,128,0.12)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg flex-shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-semibold capitalize"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {a.agent} agent
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--color-states-success)" }}
                      >
                        ✓ {a.duration}
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {a.role}
                    </p>
                    <pre
                      className="text-[10px] font-mono mt-2 whitespace-pre-wrap leading-relaxed rounded-lg p-2"
                      style={{
                        color: "var(--color-text-secondary)",
                        backgroundColor: "var(--color-bg-elevated)",
                      }}
                    >
                      {a.footballOutput}
                    </pre>
                  </div>
                </div>
              </motion.div>
            ))}
            <div
              className="flex items-center justify-between pt-2 px-1"
            >
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: "var(--color-text-faint)" }}
              >
                Total pipeline
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: "var(--color-states-success)" }}
              >
                {PERFORMANCE.totalPipeline} · on-device · zero cloud
              </span>
            </div>
          </div>
        </section>

        {/* ─── Fan Recovery — emotional debt ─── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">❤️</span>
            <h2
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "#fb7185" }}
            >
              Fan Recovery
            </h2>
            <span
              className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "rgba(251,113,133,0.1)", color: "#fb7185" }}
            >
              The billions who watch
            </span>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(251,113,133,0.15)",
              borderLeft: "3px solid #fb7185",
            }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2"
              style={{ color: "#fb7185" }}
            >
              The problem no one builds for
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {FAN_STORY.problem}
            </p>
          </div>

          {/* Science hook — the NEJM stat */}
          <div
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(251,113,133,0.15)",
            }}
          >
            <span
              className="text-4xl font-bold leading-none flex-shrink-0"
              style={{ color: "#fb7185", fontFamily: "var(--font-heading)" }}
            >
              {FAN_SCIENCE.stat}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {FAN_SCIENCE.claim}
              </p>
              <p
                className="text-[10px] font-mono mt-1.5"
                style={{ color: "var(--color-text-faint)" }}
              >
                {FAN_SCIENCE.cite}
              </p>
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(251,113,133,0.15)",
              borderLeft: "3px solid #fb7185",
            }}
          >
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest block mb-2"
              style={{ color: "#fb7185" }}
            >
              The same engine, re-pointed at the fan
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {FAN_STORY.solution}
            </p>
          </div>

          {/* Sample on-device wind-down output */}
          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(251,113,133,0.12)",
            }}
          >
            <span
              className="text-[9px] font-mono uppercase tracking-wider block mb-2"
              style={{ color: "var(--color-text-faint)" }}
            >
              QVAC coach · after a shootout defeat · on-device
            </span>
            <pre
              className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed rounded-lg p-2 mb-2"
              style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-elevated)" }}
            >
              {FAN_QVAC_OUTPUT.triage}
            </pre>
            <pre
              className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed rounded-lg p-2"
              style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-elevated)" }}
            >
              {FAN_QVAC_OUTPUT.coach}
            </pre>
          </div>

          {/* Fan stressor catalog */}
          <div className="grid grid-cols-1 gap-2">
            {FAN_STRESSORS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: EASE_PROTOCOL }}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid rgba(168,162,158,0.06)",
                }}
              >
                <span className="text-base flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="text-[9px] font-mono flex-shrink-0"
                      style={{ color: "#fb7185" }}
                    >
                      {s.scoring}
                    </span>
                  </div>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {s.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── WDK squad payments ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            WDK squad payments — self-custodial USDt
          </h2>
          <div className="grid grid-cols-1 gap-2 mb-4">
            {PAYMENT_TYPES.map((p, i) => (
              <motion.div
                key={p.type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_PROTOCOL }}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: `1px solid ${p.color}22`,
                  borderLeft: `3px solid ${p.color}`,
                }}
              >
                <span className="text-base flex-shrink-0">{p.icon}</span>
                <div className="flex-1">
                  <span
                    className="text-xs font-semibold block"
                    style={{ color: p.color }}
                  >
                    {p.label}
                  </span>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            <span
              className="text-[9px] font-mono uppercase tracking-wider block mb-1"
              style={{ color: "var(--color-text-faint)" }}
            >
              Payment flow
            </span>
            {PAYMENT_FLOW.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-sm flex-shrink-0 w-6 text-center mt-0.5">
                  {s.icon}
                </span>
                <div className="flex-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {s.step}
                  </span>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {s.detail}
                  </p>
                </div>
                {i < PAYMENT_FLOW.length - 1 && (
                  <span
                    className="text-[10px] mt-1"
                    style={{ color: "var(--color-text-disabled)" }}
                  >
                    ↓
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Fallback chain (deterministic, no cloud AI) ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Graceful degradation — no cloud AI, ever
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {FALLBACK_CHAIN.map((f, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-4 py-2.5 text-[10px]"
                style={{
                  borderBottom:
                    i < FALLBACK_CHAIN.length - 1
                      ? "1px solid rgba(168,162,158,0.04)"
                      : "none",
                }}
              >
                <span
                  className="font-mono font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {f.layer}
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--color-states-success)" }}
                >
                  {f.primary}
                </span>
                <span
                  className="font-mono"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  → {f.fallback}
                </span>
              </div>
            ))}
          </div>
          <p
            className="text-[10px] mt-2 font-mono"
            style={{ color: "var(--color-text-faint)" }}
          >
            Every layer has a deterministic fallback. No cloud AI calls, ever.
            The app works fully offline after the QVAC model is cached.
          </p>
        </section>

        {/* ─── Squad readiness tiers ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Squad readiness board — traffic-light tiers
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {READINESS_TIERS.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_PROTOCOL }}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    i < READINESS_TIERS.length - 1
                      ? "1px solid rgba(168,162,158,0.04)"
                      : "none",
                }}
              >
                <span className="text-lg flex-shrink-0">{t.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: t.color }}
                    >
                      {t.label}
                    </span>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      {t.range}
                    </span>
                  </div>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {t.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <p
            className="text-[10px] mt-2 font-mono"
            style={{ color: "var(--color-text-faint)" }}
          >
            The squad view shows every player on one screen with their tier.
            Managers can share a squad snapshot link with coaching staff.
          </p>
        </section>

        {/* ─── Football stressors ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Football-specific stressor catalog
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {FOOTBALL_STRESSORS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, ease: EASE_PROTOCOL }}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid rgba(168,162,158,0.06)",
                }}
              >
                <span className="text-base flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {s.name}
                    </span>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: "var(--color-states-warning)" }}
                    >
                      {s.scoring}
                    </span>
                  </div>
                  <p
                    className="text-[10px] mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {s.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Judging criteria ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            How we score on each criterion
          </h2>
          <div className="space-y-2">
            {JUDGING_CRITERIA.map((c, i) => (
              <motion.div
                key={c.criterion}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_PROTOCOL }}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid rgba(168,162,158,0.08)",
                }}
              >
                <span
                  className="text-xs font-semibold block mb-1.5"
                  style={{ color: "var(--color-states-success)" }}
                >
                  {c.criterion}
                </span>
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {c.score}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Tournament timeline ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Tournament timeline
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {TOURNAMENT_DATES.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom:
                    i < TOURNAMENT_DATES.length - 1
                      ? "1px solid rgba(168,162,158,0.04)"
                      : "none",
                }}
              >
                <span
                  className="text-[10px] font-mono font-bold flex-shrink-0 w-20"
                  style={{ color: "var(--color-states-success)" }}
                >
                  {d.date}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {d.event}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="text-center pt-6 pb-2 space-y-2">
          <p
            className="text-[10px] font-mono"
            style={{ color: "var(--color-text-disabled)" }}
          >
            Built for the{" "}
            <a
              href={TETHER_LINKS.dorahacks}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Tether Developers Cup
            </a>{" "}
            · QVAC + WDK · July 2026
          </p>
          <p
            className="text-[10px] font-mono"
            style={{ color: "var(--color-text-disabled)" }}
          >
            For the players and the billions who watch. Scan a player and send a bonus — or log a loss and get a wind-down. All on-device. No cloud. No API keys.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/evidence"
              className="text-[10px] font-mono underline"
              style={{ color: "var(--color-text-faint)" }}
            >
              QVAC evidence page
            </Link>
            <span style={{ color: "var(--color-text-disabled)" }}>·</span>
            <Link
              href="/autoscientist"
              className="text-[10px] font-mono underline"
              style={{ color: "var(--color-text-faint)" }}
            >
              AutoScientist page
            </Link>
            <span style={{ color: "var(--color-text-disabled)" }}>·</span>
            <Link
              href="/"
              className="text-[10px] font-mono underline"
              style={{ color: "var(--color-text-faint)" }}
            >
              Live app
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "var(--color-bg-surface)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <div
        className="text-[9px] font-mono uppercase tracking-wider"
        style={{ color: "var(--color-text-faint)" }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color }}
      >
        {value}
      </div>
      <div
        className="text-[10px] mt-0.5"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {sub}
      </div>
    </div>
  );
}
