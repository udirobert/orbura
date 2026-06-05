"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDebtHistory } from "./debt-history";
import { fetchScoreHeatmap } from "./heatmap";
import { fetchUserProfile } from "./user-profile";
import type { DebtHistoryItem } from "./debt-history";
import type { HeatmapDay } from "./heatmap";
import type { User } from "@eazo/sdk";

/**
 * React Query hook for authenticated user's debt history.
 * Caches results for 5 minutes, re-fetches on window focus.
 */
export function useDebtHistory() {
  return useQuery<DebtHistoryItem[]>({
    queryKey: ["debt-history"],
    queryFn: fetchDebtHistory,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * React Query hook for the score heatmap (30-day calendar view).
 * Caches for 10 minutes — daily data changes slowly.
 */
export function useScoreHeatmap() {
  return useQuery<HeatmapDay[]>({
    queryKey: ["score-heatmap"],
    queryFn: fetchScoreHeatmap,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * React Query hook for the authenticated user's profile.
 * Caches for 30 minutes — profile data rarely changes.
 */
export function useUserProfile() {
  return useQuery<User | null>({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });
}
