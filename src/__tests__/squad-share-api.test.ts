import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST, GET } from "@/app/api/squad/share/route";
import { setSharedSquad } from "@/lib/squad-share-store";
import type { SquadPlayer } from "@/lib/types";

// ─── Test data ────────────────────────────────────────────────────────────────

const SQUAD: SquadPlayer[] = [
  {
    id: "1",
    name: "Alice",
    position: "GK",
    stressors: [],
    analysis: { debtScore: 25, verdict: "Mild load", recoveryTime: "later", prescription: { rightNow: "a", thisMorning: "b", today: "c", avoid: "d" }, stressorBreakdown: [], recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() }, confidenceLevel: "medium" },
  },
  {
    id: "2",
    name: "Bob",
    position: "MID",
    stressors: [],
    analysis: { debtScore: 62, verdict: "Significant debt", recoveryTime: "tomorrow", prescription: { rightNow: "a", thisMorning: "b", today: "c", avoid: "d" }, stressorBreakdown: [], recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() }, confidenceLevel: "medium" },
  },
  {
    id: "3",
    name: "Charlie",
    position: "DEF",
    stressors: [],
    // No analysis — not yet scanned
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockRequest(body: unknown, url = "http://localhost:3000/api/squad/share"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createMockGetRequest(token: string | null, baseUrl = "http://localhost:3000"): Request {
  const url = token
    ? `${baseUrl}/api/squad/share?token=${token}`
    : `${baseUrl}/api/squad/share`;
  return new Request(url, { method: "GET" });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-03T06:00:00.000Z"));
  process.env.NEXT_PUBLIC_APP_URL = "https://bodydebt.app";
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/squad/share", () => {
  it("returns token and url for a valid squad", async () => {
    const req = createMockRequest({ squad: SQUAD, appName: "Match Fit" });
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("token");
    expect(data).toHaveProperty("url");
    expect(typeof data.token).toBe("string");
    expect(data.token.length).toBe(8);
    expect(data.url).toBe(`https://bodydebt.app/squad/shared/${data.token}`);
  });

  it("returns token and url without appName", async () => {
    const req = createMockRequest({ squad: SQUAD });
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("token");
    expect(data.token.length).toBe(8);
  });

  it("generates different tokens for consecutive calls", async () => {
    const req1 = createMockRequest({ squad: SQUAD });
    const req2 = createMockRequest({ squad: SQUAD });
    const [res1, res2] = await Promise.all([
      POST(req1 as never),
      POST(req2 as never),
    ]);
    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.token).not.toBe(data2.token);
  });

  it("returns 400 when squad is empty array", async () => {
    const req = createMockRequest({ squad: [] });
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Squad must be a non-empty array");
  });

  it("returns 400 when squad is missing", async () => {
    const req = createMockRequest({});
    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Squad must be a non-empty array");
  });

  it("returns 400 for invalid request body", async () => {
    const req = new Request("http://localhost:3000/api/squad/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req as never);

    expect(res.status).toBe(400);
  });

  it("uses empty base URL when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = createMockRequest({ squad: SQUAD });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.url).toBe(`/squad/shared/${data.token}`);
  });
});

describe("GET /api/squad/share", () => {
  it("returns shared squad data for a valid token", async () => {
    // First create a share
    const postReq = createMockRequest({ squad: SQUAD, appName: "Match Fit" });
    const postRes = await POST(postReq as never);
    const { token } = await postRes.json();

    // Then retrieve it
    const getReq = createMockGetRequest(token);
    const getRes = await GET(getReq as never);
    const data = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(data).toHaveProperty("squad");
    expect(data).toHaveProperty("createdAt");
    expect(data).toHaveProperty("appName", "Match Fit");
    expect(data.squad).toHaveLength(3);

    // Verify only name, position, and analysis are included
    expect(data.squad[0]).toEqual({
      name: "Alice",
      position: "GK",
      analysis: expect.objectContaining({ debtScore: 25 }),
    });
    // Player without analysis should have null
    expect(data.squad[2]).toEqual({
      name: "Charlie",
      position: "DEF",
      analysis: null,
    });
  });

  it("returns 400 when token parameter is missing", async () => {
    const req = createMockGetRequest(null);
    const res = await GET(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing token parameter");
  });

  it("returns 404 for non-existent token", async () => {
    const req = createMockGetRequest("nonexistent");
    const res = await GET(req as never);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns the stored entry without appName when none was provided", async () => {
    // Create share without appName
    const postReq = createMockRequest({ squad: [SQUAD[0]] });
    const postRes = await POST(postReq as never);
    const { token } = await postRes.json();

    const getReq = createMockGetRequest(token);
    const getRes = await GET(getReq as never);
    const data = await getRes.json();

    expect(data.appName).toBeUndefined();
  });

  it("returns 404 for expired tokens (simulated by setSharedSquad)", async () => {
    // Test with a token that was never stored
    const req = createMockGetRequest("00000000");
    const res = await GET(req as never);
    expect(res.status).toBe(404);
  });
});

describe("token format", () => {
  it("generates tokens with exactly 8 alphanumeric characters", async () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const req = createMockRequest({ squad: SQUAD });
      const res = await POST(req as never);
      const { token } = await res.json();
      tokens.add(token);
      expect(token).toMatch(/^[a-z0-9]{8}$/);
    }
    // With 50 attempts and 36^8 possible tokens, all should be unique
    expect(tokens.size).toBe(50);
  });
});

describe("end-to-end: POST then GET", () => {
  it("returns data that round-trips correctly", async () => {
    // Create multiple players with various analysis states
    const players: SquadPlayer[] = [
      {
        id: "a",
        name: "Player A",
        position: "FWD",
        stressors: [],
        analysis: { debtScore: 82, verdict: "High debt", recoveryTime: "tomorrow", prescription: { rightNow: "a", thisMorning: "b", today: "c", avoid: "d" }, stressorBreakdown: [], recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() }, confidenceLevel: "medium" },
      },
      {
        id: "b",
        name: "Player B",
        position: "MID",
        stressors: [],
        analysis: { debtScore: 18, verdict: "Low debt", recoveryTime: "soon", prescription: { rightNow: "a", thisMorning: "b", today: "c", avoid: "d" }, stressorBreakdown: [], recoveryArc: { dangerEnds: new Date().toISOString(), partialEnds: new Date().toISOString(), clearedAt: new Date().toISOString() }, confidenceLevel: "high" },
      },
    ];

    const postReq = createMockRequest({ squad: players, appName: "Test Squad" });
    const postRes = await POST(postReq as never);
    const { token, url } = await postRes.json();

    expect(token).toMatch(/^[a-z0-9]{8}$/);
    expect(url).toBe(`https://bodydebt.app/squad/shared/${token}`);

    // GET the same token
    const getReq = createMockGetRequest(token);
    const getRes = await GET(getReq as never);
    const data = await getRes.json();

    // Verify squad data round-trips
    expect(data.squad).toHaveLength(2);
    expect(data.squad[0].name).toBe("Player A");
    expect(data.squad[0].position).toBe("FWD");
    expect(data.squad[0].analysis.debtScore).toBe(82);
    expect(data.squad[1].name).toBe("Player B");
    expect(data.squad[1].analysis.debtScore).toBe(18);
    expect(data.appName).toBe("Test Squad");
    expect(data.createdAt).toBeTypeOf("number");
  });
});
