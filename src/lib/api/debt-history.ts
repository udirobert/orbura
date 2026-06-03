import { request } from "./request";

export interface DebtHistoryItem {
  id: number;
  debtScore: number;
  verdict: string;
  recoveryTime: string | null;
  stressorCount: number;
  hasFaceScan: boolean;
  hasHRV: boolean;
  createdAt: string;
}

export async function fetchDebtHistory(): Promise<DebtHistoryItem[]> {
  try {
    const res = await request("/api/user/debt-history");
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions ?? [];
  } catch {
    return [];
  }
}
