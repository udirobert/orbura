"use client";

import { useEffect, useRef } from "react";
import { auth } from "@/lib/sdk/eazo-client";
import { useEazo } from "@/lib/sdk/eazo-react";
import { fetchUserProfile } from "@/lib/api";

/**
 * Mobile-only: hits /api/user/profile once after login to upsert the user
 * into the local DB. Web doesn't need this — the SDK already calls the same
 * endpoint during web bootstrap; mobile bootstraps from the bridge `hello`
 * instead and never auto-fetches profile, so the upsert has to be triggered
 * manually here.
 */
export function UserSyncEffect() {
  const authenticated = useEazo((s) => s.auth.authenticated);
  const platform = useEazo((s) => s.device.platform);
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || platform !== "mobile") return;

    const userId = auth.user?.id ?? null;
    if (!userId || syncedUserId.current === userId) return;

    syncedUserId.current = userId;

      fetchUserProfile();
  }, [authenticated, platform]);

  return null;
}
