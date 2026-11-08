import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/credentials/route";

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/db/queries/zk-credentials", () => ({ createZkCredential: vi.fn() }));

import { requireAuth } from "@/lib/auth";
import { createZkCredential } from "@/lib/db/queries/zk-credentials";

function req(body: unknown) {
  return new Request("http://localhost/api/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const valid = {
  source: "face_scan",
  modelId: "orbura-stress-v1",
  score: 0.2,
  healthy: true,
  inputDigest: "sha256:abc",
  prover: "ezkl",
  chain: "skale",
  txHash: "0x123",
};

describe("POST /api/credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, user: { id: "user-1" } });
    (createZkCredential as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });
  });

  it("rejects guests", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "authentication required" }, { status: 401 }),
    });
    const res = await POST(req(valid));
    expect(res.status).toBe(401);
  });

  it("requires txHash for on-chain credentials", async () => {
    const res = await POST(req({ ...valid, txHash: undefined }));
    expect(res.status).toBe(400);
  });

  it("allows local credentials without txHash", async () => {
    const res = await POST(req({ ...valid, chain: "local", txHash: undefined }));
    expect(res.status).toBe(200);
    expect(createZkCredential).toHaveBeenCalledWith(
      expect.objectContaining({ chain: "local", txHash: null, verifiedAt: null })
    );
  });

  it("stores a confirmed skale credential", async () => {
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(createZkCredential).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", prover: "ezkl", chain: "skale", txHash: "0x123" })
    );
  });
});
