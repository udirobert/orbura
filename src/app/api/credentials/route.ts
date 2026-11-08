import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createZkCredential } from "@/lib/db/queries/zk-credentials";

export const maxDuration = 10;

const PROVERS = new Set(["ezkl", "risc0"]);
const CHAINS = new Set(["skale", "starknet", "local"]);
const SOURCES = new Set(["face_scan", "camera_vitals"]);

/**
 * POST /api/credentials
 *
 * Records a confirmed ZK credential. The caller must only POST after the
 * on-chain verification transaction confirmed — `chain !== "local"`
 * requires a txHash. Guests receive 401.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { modelId, score, healthy, inputDigest, prover, chain, txHash, source } = body;

  if (typeof modelId !== "string" || !modelId) {
    return NextResponse.json({ error: "modelId required" }, { status: 400 });
  }
  if (typeof prover !== "string" || !PROVERS.has(prover)) {
    return NextResponse.json({ error: "prover must be ezkl or risc0" }, { status: 400 });
  }
  if (typeof chain !== "string" || !CHAINS.has(chain)) {
    return NextResponse.json({ error: "chain must be skale, starknet, or local" }, { status: 400 });
  }
  if (chain !== "local" && (typeof txHash !== "string" || !txHash)) {
    return NextResponse.json({ error: "txHash required for on-chain credentials" }, { status: 400 });
  }
  if (score != null && (typeof score !== "number" || score < 0 || score > 1)) {
    return NextResponse.json({ error: "score must be 0–1" }, { status: 400 });
  }
  if (inputDigest != null && (typeof inputDigest !== "string" || !inputDigest.startsWith("sha256:"))) {
    return NextResponse.json({ error: "inputDigest must be sha256:…" }, { status: 400 });
  }

  const row = await createZkCredential({
    userId: auth.user.id,
    source: typeof source === "string" && SOURCES.has(source) ? source : "face_scan",
    modelId,
    score: typeof score === "number" ? score : null,
    healthy: typeof healthy === "boolean" ? healthy : null,
    inputDigest: typeof inputDigest === "string" ? inputDigest : null,
    prover,
    chain,
    txHash: typeof txHash === "string" ? txHash : null,
    verifiedAt: chain === "local" ? null : new Date(),
  });

  return NextResponse.json({ ok: true, id: Number(row.id) });
}
