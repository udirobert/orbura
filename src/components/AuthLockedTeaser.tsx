"use client";

import { Lock } from "lucide-react";
import { auth } from "@/lib/sdk/eazo-client";

/**
 * Compact locked teaser for auth-only dashboard sections (heatmap, history).
 * Keeps guests oriented without implying the feature is missing.
 */
export function AuthLockedTeaser({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="relative z-10 mb-6">
      <button
        type="button"
        onClick={() => {
          const callbackUrl =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/";
          auth.login(callbackUrl).catch(() => undefined);
        }}
        className="w-full rounded-2xl px-4 py-3 text-left flex items-start gap-3 transition-colors [@media(hover:hover)]:hover:bg-[rgba(234,88,12,0.04)]"
        style={{
          backgroundColor: "var(--color-bg-surface)",
          border: "1px solid rgba(168,162,158,0.08)",
        }}
      >
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-text-faint)" }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: "var(--color-text-faint)" }}
            >
              {title}
            </span>
            <span
              className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: "var(--color-brand-primary)" }}
            >
              Sign in
            </span>
          </div>
          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {body}
          </p>
        </div>
      </button>
    </div>
  );
}
