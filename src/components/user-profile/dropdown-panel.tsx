"use client";

import { X } from "lucide-react";
import type { User } from "@eazo/sdk";
import { Avatar } from "./avatar";
import { Row } from "./form-row";

export function DropdownPanel({
  user,
  onClose,
  children,
}: {
  user: User;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name ?? "—"}</p>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground space-y-1.5">
        <Row label="User ID" value={user.id} mono />
      </div>

      {children && (
        <div className="border-t border-border px-4 py-2">{children}</div>
      )}
    </div>
  );
}
