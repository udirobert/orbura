"use client";

import { motion } from "framer-motion";
import { EASE_PROTOCOL } from "@/lib/motion/protocol";
import Link from "next/link";
import {
  PIPELINE_STEPS,
  AGENT_TARGETS,
  TRAINING_RECIPE,
  BEFORE_AFTER,
  QUALITY_METRICS,
  RELEASE_LINKS,
} from "./autoscientist-data";
import { SYSTEMS_SCIENCE } from "../evidence/systems-science";

/**
 * AutoScientistPage — a single-page story for AutoScientist Challenge judges.
 *
 * Narrative arc:
 *   1. The concept (body debt)
 *   2. The engine (deterministic scoring)
 *   3. The dataset (5,462 examples)
 *   4. The augmentation (Adaption Adaptive Data)
 *   5. The training (AutoScientist recipe)
 *   6. The results (before/after comparison)
 *   7. The release (HF + Kaggle)
 *   8. The science (peer-reviewed citations)
 */
export function AutoScientistPage() {
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
            <span className="text-xl">🫀</span>
            <span
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "var(--color-text-primary)" }}
            >
              BODY DEBT
            </span>
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "rgba(234,88,12,0.08)",
                border: "1px solid rgba(234,88,12,0.15)",
              }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: "var(--color-brand-primary)" }}
              />
              <span
                className="text-[8px] font-mono uppercase tracking-wider"
                style={{ color: "var(--color-brand-primary)" }}
              >
                AutoScientist · Healthcare
              </span>
            </span>
          </div>

          <h1
            className="text-4xl font-normal leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Your body has debt.
            <br />
            <span style={{ color: "var(--color-brand-primary)" }}>
              We trained a 3B model to fix it.
            </span>
          </h1>

          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Not financial debt — physiological. Every drink, every bad night, every hard
            session adds debt to five body systems. We built a deterministic engine that
            calculates it, then used{" "}
            <a
              href={RELEASE_LINKS.adaption}
              target="_blank"
              rel="noreferrer"
              className="underline"
              style={{ color: "var(--color-brand-primary)" }}
            >
              Adaption Labs&apos; AutoScientist
            </a>{" "}
            to train a Llama-3.2-3B model that produces recovery plans as good as the
            engine — small enough to run on your phone.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-brand-primary)",
                color: "#fff",
              }}
            >
              Open live app →
            </Link>
            <a
              href={RELEASE_LINKS.huggingFace}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              Hugging Face ↗
            </a>
            <a
              href={RELEASE_LINKS.kaggle}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                color: "var(--color-text-secondary)",
                border: "1px solid rgba(168,162,158,0.15)",
              }}
            >
              Kaggle ↗
            </a>
            <a
              href={RELEASE_LINKS.github}
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
          </div>
        </header>

        {/* ─── Headline metrics ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            The numbers
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Training examples"
              value="5,462"
              sub="4 agents × 3,200 profiles"
              color="var(--color-brand-primary)"
            />
            <MetricCard
              label="Quality improvement"
              value="+31.9%"
              sub="Grade C (7.0) → A (9.23)"
              color="var(--color-states-success)"
            />
            <MetricCard
              label="Model size"
              value="3B params"
              sub="Llama-3.2-3B-Instruct + LoRA"
              color="var(--color-states-warning)"
            />
            <MetricCard
              label="Training cost"
              value="$0"
              sub="4x H100, free via Adaption"
              color="var(--color-system-gut)"
            />
          </div>
        </section>

        {/* ─── The pipeline story ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            From scoring engine to trained model
          </h2>
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={step.id}
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
                      {step.label}
                    </span>
                  </div>
                  <p
                    className="text-[10px] mt-0.5 pl-6"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {step.detail}
                  </p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
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

        {/* ─── The 4 agents ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            The 4 fine-tuning targets
          </h2>
          <div className="space-y-3">
            {AGENT_TARGETS.map((a, i) => (
              <motion.div
                key={a.agent}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, ease: EASE_PROTOCOL }}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--color-bg-surface)",
                  border: "1px solid rgba(168,162,158,0.08)",
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
                        className="text-[10px] font-mono font-bold"
                        style={{ color: "var(--color-states-success)" }}
                      >
                        {a.improvement}
                      </span>
                    </div>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {a.role}
                    </p>
                    <div
                      className="mt-2 grid grid-cols-2 gap-2 text-[9px] font-mono"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      <div>
                        <span style={{ color: "var(--color-text-disabled)" }}>
                          Input:{" "}
                        </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {a.input}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--color-text-disabled)" }}>
                          Output:{" "}
                        </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {a.output}
                        </span>
                      </div>
                    </div>
                    <div
                      className="mt-2 flex items-center gap-3 text-[9px] font-mono"
                      style={{ color: "var(--color-text-faint)" }}
                    >
                      <span>{a.examples} examples</span>
                      <span style={{ color: "var(--color-text-disabled)" }}>·</span>
                      <span style={{ color: "var(--color-states-error)" }}>
                        {a.qualityBefore}
                      </span>
                      <span style={{ color: "var(--color-text-disabled)" }}>→</span>
                      <span style={{ color: "var(--color-states-success)" }}>
                        {a.qualityAfter}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Quality improvement ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Data quality — before and after Adaptive Data
          </h2>
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(74,222,128,0.15)",
            }}
          >
            <div className="flex items-end justify-between mb-4">
              <div>
                <div
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  Before augmentation
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--color-states-error)" }}
                >
                  {QUALITY_METRICS.before.score}
                </div>
                <div
                  className="text-[10px] font-mono"
                  style={{ color: "var(--color-states-error)" }}
                >
                  Grade {QUALITY_METRICS.before.grade} ·{" "}
                  {QUALITY_METRICS.before.label}
                </div>
              </div>
              <div
                className="text-2xl"
                style={{ color: "var(--color-text-faint)" }}
              >
                →
              </div>
              <div className="text-right">
                <div
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  After augmentation
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: "var(--color-states-success)" }}
                >
                  {QUALITY_METRICS.after.score}
                </div>
                <div
                  className="text-[10px] font-mono"
                  style={{ color: "var(--color-states-success)" }}
                >
                  Grade {QUALITY_METRICS.after.grade} ·{" "}
                  {QUALITY_METRICS.after.label}
                </div>
              </div>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(168,162,158,0.1)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-states-error), var(--color-states-warning), var(--color-states-success))",
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${QUALITY_METRICS.improvement}%` }}
                transition={{ duration: 1.2, ease: EASE_PROTOCOL }}
              />
            </div>
            <p
              className="text-[10px] text-center font-mono mt-2"
              style={{ color: "var(--color-states-success)" }}
            >
              +{QUALITY_METRICS.improvement}% improvement
            </p>
            <div className="mt-4 space-y-1">
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: "var(--color-text-faint)" }}
              >
                Augmentation recipes applied
              </span>
              {QUALITY_METRICS.recipes.map((r) => (
                <div
                  key={r}
                  className="flex items-center gap-2 text-[10px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <span style={{ color: "var(--color-states-success)" }}>✓</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Before/after comparison ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Before / after — same input, different model
          </h2>
          <p
            className="text-[11px] mb-3 font-mono"
            style={{ color: "var(--color-text-faint)" }}
          >
            Scenario: {BEFORE_AFTER.scenario} · Debt score:{" "}
            {BEFORE_AFTER.debtScore}/100
          </p>

          {/* System scores */}
          <div
            className="rounded-2xl p-3 mb-3 flex justify-around"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {BEFORE_AFTER.systems.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="w-8 h-8 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: `${s.accent}18`,
                    color: s.accent,
                    border: `1px solid ${s.accent}40`,
                  }}
                >
                  {s.score}
                </div>
                <div
                  className="text-[7px] font-mono mt-1"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {s.label.split(" / ")[0]}
                </div>
              </div>
            ))}
          </div>

          {/* Triage comparison */}
          <ComparisonBlock
            title="Triage Plan"
            icon="🔬"
            baseline={BEFORE_AFTER.baseline.triage}
            finetuned={BEFORE_AFTER.finetuned.triage}
            groundTruth={BEFORE_AFTER.groundTruth.triage}
          />

          {/* Coach comparison */}
          <ComparisonBlock
            title="Recovery Prescription"
            icon="💊"
            baseline={BEFORE_AFTER.baseline.coach}
            finetuned={BEFORE_AFTER.finetuned.coach}
            groundTruth={BEFORE_AFTER.groundTruth.coach}
          />
        </section>

        {/* ─── Training recipe ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            AutoScientist training recipe (co-optimized)
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(168,162,158,0.08)",
            }}
          >
            {TRAINING_RECIPE.map((row, i) => (
              <div
                key={row.param}
                className="grid grid-cols-2 px-4 py-2 text-[11px]"
                style={{
                  borderBottom:
                    i < TRAINING_RECIPE.length - 1
                      ? "1px solid rgba(168,162,158,0.04)"
                      : "none",
                }}
              >
                <span
                  className="font-mono"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  {row.param}
                </span>
                <span
                  className="font-mono text-right"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <p
            className="text-[10px] mt-2 font-mono"
            style={{ color: "var(--color-text-faint)" }}
          >
            AutoScientist co-optimized data and model recipe in lockstep. No manual
            hyperparameter tuning — the platform selected LoRA r=32, alpha=64, and 3
            epochs based on the dataset characteristics.
          </p>
        </section>

        {/* ─── Science (reused from evidence page) ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            The science behind the scoring
          </h2>
          <p
            className="text-xs mb-4 leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            The deterministic scoring engine is rooted in peer-reviewed physiology. Each
            system accumulates debt based on stressor type, intensity, and timing. This is
            what makes the training data ground truth — not human annotation, not LLM
            output, but deterministic physiology.
          </p>

          {SYSTEMS_SCIENCE.slice(0, 3).map((s, i) => (
            <motion.div
              key={s.system}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: EASE_PROTOCOL }}
              className="rounded-2xl mb-3 overflow-hidden"
              style={{
                backgroundColor: "var(--color-bg-surface)",
                border: `1px solid ${s.accent}22`,
              }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(168,162,158,0.06)" }}
              >
                <span className="text-lg">{s.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {s.system}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full ml-auto"
                  style={{ backgroundColor: s.accent }}
                />
              </div>
              <div className="px-4 py-3">
                <div
                  className="rounded-xl px-3 py-2.5"
                  style={{
                    backgroundColor: `${s.accent}0A`,
                    border: `1px solid ${s.accent}18`,
                  }}
                >
                  <p
                    className="text-[10px] italic leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    &ldquo;{s.fact}&rdquo;
                  </p>
                  <p
                    className="text-[9px] font-mono mt-1"
                    style={{ color: s.accent }}
                  >
                    — {s.cite}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          <Link
            href="/evidence"
            className="text-[10px] font-mono underline"
            style={{ color: "var(--color-text-faint)" }}
          >
            See all 5 systems with full scoring methodology →
          </Link>
        </section>

        {/* ─── Release ─── */}
        <section>
          <h2
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: "var(--color-text-faint)" }}
          >
            Open source release
          </h2>
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              backgroundColor: "var(--color-bg-surface)",
              border: "1px solid rgba(234,88,12,0.15)",
            }}
          >
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Both the adapted dataset and the trained weights are released under Apache
              2.0 on Hugging Face and Kaggle, as required by the challenge rules.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ReleaseCard
                label="Dataset"
                platforms={["Hugging Face", "Kaggle"]}
                href={RELEASE_LINKS.huggingFace}
                icon="📊"
              />
              <ReleaseCard
                label="Weights"
                platforms={["Hugging Face", "Kaggle"]}
                href={RELEASE_LINKS.huggingFace}
                icon="🧠"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={RELEASE_LINKS.demo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                style={{
                  backgroundColor: "var(--color-brand-primary)",
                  color: "#fff",
                }}
              >
                Try the demo →
              </a>
              <a
                href={RELEASE_LINKS.challenge}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider"
                style={{
                  backgroundColor: "var(--color-bg-elevated)",
                  color: "var(--color-text-secondary)",
                  border: "1px solid rgba(168,162,158,0.1)",
                }}
              >
                AutoScientist Challenge ↗
              </a>
            </div>
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
              href={RELEASE_LINKS.challenge}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              AutoScientist Challenge
            </a>{" "}
            · Adaption Labs · July 2026
          </p>
          <p
            className="text-[10px] font-mono"
            style={{ color: "var(--color-text-disabled)" }}
          >
            Deterministic engine → augmented dataset → co-optimized recipe → open weights
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
              href="/tether"
              className="text-[10px] font-mono underline"
              style={{ color: "var(--color-text-faint)" }}
            >
              Tether Cup page
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

function ComparisonBlock({
  title,
  icon,
  baseline,
  finetuned,
  groundTruth,
}: {
  title: string;
  icon: string;
  baseline: string;
  finetuned: string;
  groundTruth: string;
}) {
  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 mb-2"
      >
        <span className="text-sm">{icon}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <OutputCard
          label="Baseline (Llama-3.2-3B)"
          content={baseline}
          color="var(--color-states-error)"
          issues={true}
        />
        <OutputCard
          label="Fine-tuned (AutoScientist)"
          content={finetuned}
          color="var(--color-states-success)"
        />
        <OutputCard
          label="Ground Truth (Deterministic)"
          content={groundTruth}
          color="#7C3AED"
        />
      </div>
    </div>
  );
}

function OutputCard({
  label,
  content,
  color,
  issues,
}: {
  label: string;
  content: string;
  color: string;
  issues?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: `1px solid ${color}22`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[9px] font-mono uppercase tracking-wider font-bold"
          style={{ color }}
        >
          {label}
        </span>
        {issues && (
          <span
            className="text-[8px] font-mono px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(220,38,38,0.1)",
              color: "var(--color-states-error)",
            }}
          >
            Wrong format · verbose
          </span>
        )}
      </div>
      <pre
        className="text-[10px] font-mono whitespace-pre-wrap leading-relaxed"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {content}
      </pre>
    </div>
  );
}

function ReleaseCard({
  label,
  platforms,
  href,
  icon,
}: {
  label: string;
  platforms: string[];
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl p-3 block"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid rgba(168,162,158,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[9px] font-mono mt-1"
        style={{ color: "var(--color-text-faint)" }}
      >
        {platforms.join(" + ")}
      </div>
    </a>
  );
}
