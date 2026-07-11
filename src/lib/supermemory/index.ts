import Supermemory from "supermemory";

// ─── Client (singleton) ──────────────────────────────────────────────────────

const apiKey = process.env.SUPERMEMORY_API_KEY ?? "";
const baseURL = process.env.SUPERMEMORY_BASE_URL ?? "http://localhost:6767";

export const isMemoryEnabled = !!apiKey;

const client = isMemoryEnabled
  ? new Supermemory({ apiKey, baseURL })
  : null;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryContext {
  /** Static + dynamic profile facts joined */
  profile: string;
  /** Relevant past memories matching the query */
  memories: string;
}

interface SearchResult {
  memory?: string;
  content?: string;
  score?: number;
}

// ─── Write: store an action / event ──────────────────────────────────────────

export async function logAction(
  containerTag: string,
  content: string,
  metadata?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!client) return;
  try {
    await client.add({ content, containerTag, metadata });
  } catch (e) {
    console.warn("[supermemory] logAction failed:", e);
  }
}

// ─── Read: user profile + relevant memories for agent context ────────────────

export async function getMemoryContext(
  containerTag: string,
  query: string,
): Promise<MemoryContext | null> {
  if (!client) return null;
  try {
    const result = await client.profile({ containerTag, q: query });
    const staticFacts = result.profile?.static ?? [];
    const dynamicFacts = result.profile?.dynamic ?? [];
    const profile = [staticFacts, dynamicFacts]
      .flat()
      .filter(Boolean)
      .join("\n");

    const results = (result.searchResults?.results ?? []) as SearchResult[];
    const memories = results
      .map((r) => r.memory ?? r.content ?? "")
      .filter(Boolean)
      .join("\n");

    if (!profile && !memories) return null;
    return { profile, memories };
  } catch (e) {
    console.warn("[supermemory] getMemoryContext failed:", e);
    return null;
  }
}

// ─── Write: store a completed analysis session ───────────────────────────────

export async function logSession(
  containerTag: string,
  session: {
    debtScore: number;
    verdict: string;
    stressors: string[];
    prescription: {
      rightNow: string;
      thisMorning: string;
      today: string;
      avoid: string;
    };
    mode: string;
  },
): Promise<void> {
  if (!client) return;
  const content = `Body debt assessment completed.
Score: ${session.debtScore}/100
Verdict: ${session.verdict}
Mode: ${session.mode}
Stressors: ${session.stressors.join(", ") || "None"}
Prescription:
  RIGHT NOW: ${session.prescription.rightNow}
  THIS MORNING: ${session.prescription.thisMorning}
  TODAY: ${session.prescription.today}
  AVOID: ${session.prescription.avoid}`;

  logAction(containerTag, content, {
    type: "analysis_session",
    debtScore: session.debtScore,
    mode: session.mode,
  }).catch(() => {});
}

// ─── Forget: single memory by content match ──────────────────────────────────

export async function forgetMemory(
  containerTag: string,
  content: string,
): Promise<boolean> {
  if (!client) return false;
  try {
    await client.memories.forget({ containerTag, content });
    return true;
  } catch (e) {
    console.warn("[supermemory] forgetMemory failed:", e);
    return false;
  }
}

// ─── Forget: all memories for a container tag (mass-forget) ──────────────────
//
// Uses the agentic mass-forget endpoint (POST /v4/memories/forget-matching)
// which isn't in the SDK yet, so we call it directly.

export async function forgetAll(
  containerTag: string,
): Promise<{ count: number; summary: string } | null> {
  if (!client) return null;
  try {
    const res = await fetch(`${baseURL}/v4/memories/forget-matching`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "forget everything about body debt, recovery, sleep, stress, prescription, health",
        containerTag,
        maxForget: 500,
        reason: "user requested full memory reset",
      }),
    });
    if (!res.ok) {
      console.warn("[supermemory] forgetAll HTTP error:", res.status);
      return null;
    }
    const data = await res.json() as { count: number; summary: string };
    return { count: data.count, summary: data.summary };
  } catch (e) {
    console.warn("[supermemory] forgetAll failed:", e);
    return null;
  }
}
