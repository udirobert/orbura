import type { FaceAnalysisResult } from "@/lib/types";
import { request } from "./request";

/**
 * Analyzes a facial image for visible physiological stress markers.
 * The image is processed in memory and discarded — never stored.
 *
 * POST /api/face-scan
 */
export async function analyzeFaceImage(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<FaceAnalysisResult> {
  const res = await request("/api/face-scan", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as FaceAnalysisResult;
}
