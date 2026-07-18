"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { AuthLockedTeaser } from "@/components/AuthLockedTeaser";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useEazo } from "@/lib/sdk/eazo-react";

type Invitation = { clinic: { id: string; name: string }; expiresAt: string };

function invitationErrorBody(error: string, code?: string) {
  if (code === "not_recipient") {
    return "This invitation is linked to a different email address. Make sure you are signed in with the email address your clinic invited, then open the link again.";
  }
  if (code === "accepted") {
    return "You have already accepted this invitation. You can start your first check-in.";
  }
  if (code === "expired") {
    return "This invitation has expired. Ask your clinic to send a fresh secure link.";
  }
  if (code === "revoked") {
    return "This invitation has been replaced by a newer one. Ask your clinic to send the latest secure link.";
  }
  if (code === "invalid") {
    return "This invitation link is no longer available. Ask your clinic for a new secure link.";
  }
  return error;
}

export function CareInvitationPage() {
  const user = useEazo((state) => state.auth.user);
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!user || !token) return;
    fetch(`/api/care/invitations/validate?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) {
          setError(invitationErrorBody(json.error || "Unable to verify invitation", json.code));
          return;
        }
        setInvitation(json);
      })
      .catch(() => setError(invitationErrorBody("Unable to verify invitation")));
  }, [token, user]);

  async function acceptInvitation() {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      const response = await fetch("/api/care/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const json = await response.json();
      if (!response.ok) {
        setError(invitationErrorBody(json.error || "Unable to accept invitation", json.code));
        return;
      }
      router.replace("/care");
    } catch {
      setError(invitationErrorBody("Unable to accept invitation"));
    } finally {
      setAccepting(false);
    }
  }

  return <main className="min-h-svh px-5 py-10" style={{ backgroundColor: "var(--color-bg-base)", color: "var(--color-text-primary)" }}><div className="mx-auto max-w-md space-y-5"><p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>Care Companion</p>{!token ? <InvitationMessage title="This invitation link is incomplete" body="Ask your clinic for a new secure invitation link." /> : !user ? <AuthLockedTeaser title="Sign in to accept your care invitation" body="Use the email address your clinic invited. We’ll bring you back here afterwards." /> : error ? <InvitationMessage title="This invitation is unavailable" body={error} /> : invitation ? <section className="rounded-[1.5rem] p-6 space-y-5" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><div className="flex gap-3"><div className="rounded-full p-2 h-fit" style={{ backgroundColor: "rgba(74,222,128,0.1)" }}><ShieldCheck className="h-5 w-5" style={{ color: "var(--color-states-success)" }} /></div><div><h1 className="text-xl" style={{ fontFamily: "var(--font-heading)" }}>A calmer week between appointments</h1><p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>{invitation.clinic.name} has invited you to share simple check-ins with its care team.</p></div></div><div className="space-y-3 border-y py-4" style={{ borderColor: "var(--color-border-subtle)" }}><p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "var(--color-text-faint)" }}>What happens next</p>{[["1", "A short check-in", "Tell us how today is going—usually about a minute."], ["2", "One useful next step", "You’ll get a clinic-approved action, not a lecture."], ["3", "Human attention when needed", "Concerning symptoms are made visible to your care team."]].map(([number, title, body]) => <div key={number} className="flex gap-3"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-mono" style={{ backgroundColor: "var(--color-bg-elevated)", color: "var(--color-brand-primary)" }}>{number}</span><p className="text-xs leading-5"><span className="font-semibold">{title}</span><br /><span style={{ color: "var(--color-text-secondary)" }}>{body}</span></p></div>)}</div><div className="rounded-xl p-4 text-sm leading-6" style={{ backgroundColor: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}><p>Your check-ins are shared with {invitation.clinic.name} so their team can review concerns that need human judgement.</p><p className="mt-3">This companion does not prescribe, change medication doses, or replace urgent medical care.</p></div><p className="text-xs" style={{ color: "var(--color-text-faint)" }}>Pilot acknowledgement · Link expires {new Date(invitation.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p><PrimaryButton type="button" onClick={acceptInvitation} disabled={accepting} className="w-full">{accepting ? "Setting up your care…" : <>I understand and continue <ArrowRight className="ml-1 inline h-4 w-4" /></>}</PrimaryButton><p className="text-center text-[11px]" style={{ color: "var(--color-text-faint)" }}>Questions about your care? Contact {invitation.clinic.name} directly.</p></section> : <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Checking your invitation…</p>}</div></main>;
}

function InvitationMessage({ title, body }: { title: string; body: string }) {
  return <section className="rounded-[1.5rem] p-6" style={{ backgroundColor: "var(--color-bg-surface)", border: "1px solid var(--color-border-subtle)" }}><CheckCircle2 className="h-5 w-5 mb-4" style={{ color: "var(--color-text-secondary)" }} /><h1 className="text-xl" style={{ fontFamily: "var(--font-heading)" }}>{title}</h1><p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>{body}</p></section>;
}
