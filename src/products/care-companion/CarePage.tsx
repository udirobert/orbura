"use client";

import Link from "next/link";
import { ArrowRight, Clock3, HeartHandshake, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useEazo } from "@/lib/sdk/eazo-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { CareCheckInForm } from "./CareCheckInForm";

export function CarePage() {
  const user = useEazo((state) => state.auth.user);
  const [access, setAccess] = useState<"loading" | "ready" | "not-enrolled" | "error">("loading");

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    void fetch("/api/care/patient/summary")
      .then((response) => {
        if (cancelled) return;
        setAccess(response.ok ? "ready" : response.status === 403 ? "not-enrolled" : "error");
      })
      .catch(() => { if (!cancelled) setAccess("error"); });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <main
      className="min-h-svh px-5 py-6 sm:px-8 sm:py-10"
      style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <section className="flex flex-col justify-between lg:min-h-[42rem] lg:py-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--color-brand-secondary)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-brand-secondary)" }} />
              Your treatment companion
            </div>
            <h1 className="mt-5 max-w-md text-[2.35rem] leading-[0.98] tracking-[-0.035em] sm:text-5xl" style={{ fontFamily: "var(--font-heading)" }}>
              Support between appointments.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              A short check-in helps you take one safe next step. If something needs a clinician&apos;s judgement, we make sure it is seen.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:mt-0 lg:grid-cols-1">
            {[
              [Clock3, "About a minute", "Only answer what matters today."],
              [HeartHandshake, "One next step", "Clear, manageable support—not a lecture."],
              [ShieldCheck, "Human review when needed", "Concerning symptoms are routed to your care team."],
            ].map(([Icon, title, copy]) => {
              const FeatureIcon = Icon as typeof Clock3;
              return (
                <div key={title as string} className="flex gap-3 rounded-2xl p-3 sm:block sm:p-0 lg:flex lg:rounded-none lg:p-0">
                  <FeatureIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-brand-primary)" }} />
                  <div className="sm:mt-2 lg:mt-0">
                    <p className="text-xs font-semibold">{title as string}</p>
                    <p className="mt-0.5 text-[11px] leading-4" style={{ color: "var(--color-text-faint)" }}>{copy as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.75rem] p-5 sm:p-7" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>Today&apos;s check-in</p>
              <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
                How are you feeling?
              </h2>
            </div>
            {user && <span className="rounded-full px-2.5 py-1 text-[10px] font-mono" style={{ backgroundColor: "rgba(74,222,128,0.1)", color: "var(--color-states-success)" }}>Private</span>}
          </div>

          {user && access === "ready" ? (
            <CareCheckInForm />
          ) : user && access === "loading" ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Checking your care access…</p>
          ) : user && access === "not-enrolled" ? (
            <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)" }}>
              <p className="text-sm font-semibold">Your clinic sets up access</p>
              <p className="mt-2 text-xs leading-5" style={{ color: "var(--color-text-secondary)" }}>Once your clinic has enrolled you, your check-ins become part of the care record and can be reviewed when support is needed.</p>
            </div>
          ) : user ? (
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>We couldn&apos;t confirm your care access. Please try again.</p>
          ) : (
            <>
              <AuthLockedTeaser title="Sign in to check in" body="Your check-in becomes part of the care record shared with your clinic." />
              <Link href="/care/summary" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-brand-primary)" }}>
                I already have a care plan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}

          <p className="mt-6 border-t pt-4 text-[10px] leading-4" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-faint)" }}>
            This check-in does not replace urgent medical care. If you feel seriously unwell or your symptoms are rapidly worsening, seek urgent help now.
          </p>
        </section>
      </div>
    </main>
  );
}
