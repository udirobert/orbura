"use client";

import { useRef, useState, useEffect } from "react";
import { LogOut, UserRound } from "lucide-react";
import { auth } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { BadgeTrigger } from "./badge-trigger";
import { DropdownPanel } from "./dropdown-panel";

export function UserBadge() {
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (loading) {
    return (
      <div className="flex h-9 items-center rounded-full border border-border bg-background px-3 shadow-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => {
          auth.login().catch(() => undefined);
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
      >
        <UserRound className="h-4 w-4 text-muted-foreground" />
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <BadgeTrigger user={user} onClick={() => setOpen((v) => !v)} />
      {open && (
        <DropdownPanel user={user} onClose={() => setOpen(false)}>
          <button
            onClick={() => {
              auth.logout();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </DropdownPanel>
      )}
    </div>
  );
}
