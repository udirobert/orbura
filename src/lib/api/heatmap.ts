import { request } from "./request";

export interface HeatmapDay {
  date: string;
  debtScore: number;
  sessionCount: number;
}

export async function fetchScoreHeatmap(): Promise<HeatmapDay[]> {
  try {
    const res = await request("/api/user/heatmap");
    if (!res.ok) return [];
    const data = await res.json();
    return data.days ?? [];
  } catch {
    return [];
  }
}
