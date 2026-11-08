/**
 * Deterministic digest of the facial stress feature vector.
 *
 * Stored on zk_credentials rows as `inputDigest` — enough to correlate an
 * audit record with a specific check-in, never enough to reconstruct the
 * features. Feature order is fixed so identical inputs always digest
 * identically across browsers and workers.
 */

export interface DigestibleFeatures {
  leftEyeAspect: number;
  rightEyeAspect: number;
  browTension: number;
  mouthTension: number;
  eyeSymmetry: number;
  mouthOpening: number;
}

const ORDER: (keyof DigestibleFeatures)[] = [
  "leftEyeAspect",
  "rightEyeAspect",
  "browTension",
  "mouthTension",
  "eyeSymmetry",
  "mouthOpening",
];

export async function digestStressFeatures(
  features: DigestibleFeatures
): Promise<string> {
  // Round to 6 decimals — absorbs float noise without losing identity.
  const canonical = ORDER.map((k) => features[k].toFixed(6)).join(",");
  const bytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}
