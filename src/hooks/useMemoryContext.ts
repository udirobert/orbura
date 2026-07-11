"use client";

import { useEffect, useState, useCallback } from "react";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";

export interface MemoryFacts {
  enabled: boolean;
  profile: string;
  memories: string[];
}

/**
 * Fetches the user's Supermemory profile + relevant memories.
 * Shared by the dashboard memory card, opening screen, and
 * prescription "why this" callout.
 *
 * Returns { enabled: false, ... } when Supermemory is not running
 * so callers can gracefully hide memory UI.
 *
 * `refetch` triggers a re-fetch (used after forget operations).
 */
export function useMemoryContext(query?: string): {
  data: MemoryFacts | null;
  loading: boolean;
  refetch: () => void;
} {
  const anonymousId = useBodyDebtStore((s) => s.anonymousId);
  const [data, setData] = useState<MemoryFacts | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!anonymousId) return;
    let cancelled = false;
    const q = query ?? "body debt recovery patterns";
    fetch(`/api/memory/context?containerTag=${encodeURIComponent(anonymousId)}&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((json: MemoryFacts) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ enabled: false, profile: "", memories: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [anonymousId, query, nonce]);

  return { data, loading, refetch };
}
