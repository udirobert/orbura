import "./anatomy.css";
import type { ReactNode } from "react";
import { AnatomyExplorerClient } from "./AnatomyExplorerClient";

/**
 * Anatomy models are from thebuggeddev/anatomy and are NOT yet licensed for
 * distribution. The explorer stays dark unless explicitly enabled:
 *   NEXT_PUBLIC_ANATOMY_ENABLED=true
 * See AGENTS.md — do not ship to patients without written permission and
 * clinician content review.
 */
function AnatomyUnavailable({ detail }: { detail?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">Anatomy explorer unavailable</h1>
      <p className="max-w-[40ch] opacity-70">
        This feature is temporarily disabled pending model licensing review.
      </p>
      {detail ? (
        <p className="max-w-[40ch] text-xs opacity-50">{detail}</p>
      ) : null}
    </main>
  );
}

export default function AnatomyPage() {
  const enabled = process.env.NEXT_PUBLIC_ANATOMY_ENABLED === "true";

  if (!enabled) {
    return (
      <AnatomyUnavailable detail="Set NEXT_PUBLIC_ANATOMY_ENABLED=true to preview locally." />
    );
  }

  return <AnatomyExplorerClient />;
}
