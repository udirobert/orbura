export function normalizeFieldElement(value: string): string | null {
  const trimmed = value.trim();
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return BigInt(trimmed).toString();
  }
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const bigEndian = Array.from(trimmed.matchAll(/[0-9a-fA-F]{2}/g))
      .map((match) => match[0])
      .reverse()
      .join("");
    return BigInt(`0x${bigEndian}`).toString();
  }
  return null;
}

export function collectFieldElements(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectFieldElements(item));
  }
  if (typeof value === "bigint") {
    return [value.toString()];
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return [value.toString()];
  }
  if (typeof value === "string") {
    const normalized = normalizeFieldElement(value);
    return normalized ? [normalized] : [];
  }
  return [];
}

export function extractPublicInstances(proofData: unknown): string[] | undefined {
  if (!proofData || typeof proofData !== "object") return undefined;
  const record = proofData as Record<string, unknown>;
  const candidates = [
    record.instances,
    record.public_inputs,
    record.publicInputs,
    record.inputs,
  ];
  for (const candidate of candidates) {
    const elements = collectFieldElements(candidate);
    if (elements.length > 0) return elements;
  }
  return undefined;
}
