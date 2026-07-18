"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Info, ArrowRight, Stethoscope } from "lucide-react";

export interface CareCheckInResponse {
  ok?: boolean;
  observation: {
    symptoms: string[];
    symptomSeverity: "mild" | "moderate" | "severe";
    adherence: string;
    checkInAt: string;
    notes?: string | null;
  };
  action:
    | { type: "escalate"; reason: string }
    | { type: "intervention"; action: string; explanation?: string };
  intervention?: {
    id: string;
    action: string;
    dueAt?: string;
  };
  escalation?: {
    id: string;
    reason: string;
    createdAt?: string;
  };
}

function symptomLabel(s: string) {
  return s.replace(/_/g, " ");
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CareCheckInResult({ result }: { result: CareCheckInResponse }) {
  const symptoms = result.observation.symptoms.map(symptomLabel).join(", ");
  const severity = result.observation.symptomSeverity;

  if (result.action.type === "escalate") {
    return (
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          backgroundColor: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--color-text-primary)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
            <AlertTriangle className="h-5 w-5" style={{ color: "#dc2626" }} />
          </div>
          <div>
            <h2 className="font-semibold text-base">Your care team has been notified</h2>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {result.action.reason}
            </p>
          </div>
        </div>

        <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <p>
            You reported <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{symptoms}</span> with{" "}
            <span className="font-medium" style={{ color: "#dc2626" }}>{severity}</span> severity. A clinician will review this and reach out if needed.
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-sm space-y-2"
          style={{ backgroundColor: "rgba(239,68,68,0.06)", color: "#7f1d1d" }}
        >
          <p className="font-medium flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            When to seek urgent care now
          </p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>You can&apos;t keep fluids down or show signs of dehydration.</li>
            <li>You have severe or worsening abdominal pain.</li>
            <li>You notice yellowing skin/eyes, dark urine, or pale stools.</li>
            <li>You have trouble breathing, swallowing, or swelling/hives.</li>
          </ul>
        </div>

        <Link
          href="/care/summary"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#dc2626", color: "white" }}
        >
          View in care summary
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const explanation = (result.action as Extract<CareCheckInResponse["action"], { type: "intervention" }>).explanation;
  const actionText = result.intervention?.action ?? (result.action as Extract<CareCheckInResponse["action"], { type: "intervention" }>).action;
  const dueAt = result.intervention?.dueAt ? `Due ${formatDate(result.intervention.dueAt)}` : "";

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        backgroundColor: severity === "severe" ? "rgba(234,88,12,0.08)" : "rgba(34,197,94,0.08)",
        border: `1px solid ${severity === "severe" ? "rgba(234,88,12,0.2)" : "rgba(34,197,94,0.2)"}`,
        color: "var(--color-text-primary)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 p-2 rounded-full"
          style={{ backgroundColor: severity === "severe" ? "rgba(234,88,12,0.12)" : "rgba(34,197,94,0.12)" }}
        >
          {severity === "severe" ? (
            <Info className="h-5 w-5" style={{ color: "#ea580c" }} />
          ) : (
            <CheckCircle2 className="h-5 w-5" style={{ color: "#16a34a" }} />
          )}
        </div>
        <div>
          <h2 className="font-semibold text-base">
            {severity === "severe" ? "You&apos;re on the right track — keep monitoring" : "You&apos;re on track"}
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {severity === "severe" ? "Your symptoms are notable but manageable right now." : "No red flags detected."}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 space-y-2"
        style={{ backgroundColor: "rgba(255,255,255,0.5)", color: "var(--color-text-primary)" }}
      >
        <p className="text-sm font-medium">{actionText}</p>
        {explanation && (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {explanation}
          </p>
        )}
        {dueAt && (
          <p className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--color-text-faint)" }}>
            <Clock className="h-3 w-3" />
            {dueAt}
          </p>
        )}
      </div>

      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        This guidance is based on your reported symptoms, medication, and dose. Check in again tomorrow or if anything changes.
      </p>

      <Link
        href="/care/summary"
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: severity === "severe" ? "#ea580c" : "#16a34a", color: "white" }}
      >
        View care summary
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
