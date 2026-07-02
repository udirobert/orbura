import { NextRequest } from "next/server";
import { runHealthCoach, buildFallbackPrompt } from "@/lib/qvac";
import type { HealthCoachInput } from "@/lib/qvac";
import { ai } from "@/lib/sdk/eazo-client";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  let body: HealthCoachInput;
  try {
    body = await request.json();
  } catch {
    return new Response(
      'event: error\ndata: {"error":"Invalid request body"}\n\n',
      { headers: { "Content-Type": "text/event-stream" }, status: 400 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // ── Run edge and cloud in parallel, track individual timings ──
      const startTime = Date.now();
      let edgeDurationMs: number | null = null;
      let cloudDurationMs: number | null = null;

      // Edge: QVAC local LLM via child_process.fork()
      const edgePromise = runHealthCoach(body, (progress) => {
        send("progress", progress);
      }).then((result) => {
        edgeDurationMs = Date.now() - startTime;
        return result;
      });

      // Cloud: Eazo AI gateway -> AWS Bedrock (runs in parallel for benchmark)
      const cloudPromise = (async () => {
        try {
          ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });
          const response = await ai.chat({
            model: "deepseek.v3.1",
            messages: [
              { role: "system", content: "Health recovery coach. Direct, specific, no caveats." },
              { role: "user", content: buildFallbackPrompt(body) },
            ],
            max_tokens: 200,
          });
          cloudDurationMs = Date.now() - startTime;
          return response.choices[0]?.message?.content ?? null;
        } catch {
          cloudDurationMs = Date.now() - startTime;
          return null;
        }
      })();

      // Wait for both
      const [qvacResult, cloudResult] = await Promise.allSettled([edgePromise, cloudPromise]);

      // Edge result is primary — send it with both timings
      if (qvacResult.status === "fulfilled" && qvacResult.value) {
        send("result", {
          advice: qvacResult.value,
          source: "qvac-local",
          model: "qwen3-1.7b-inst-q4",
          edgeDurationMs,
          cloudDurationMs,
        });
        controller.close();
        return;
      }

      // Edge failed — send progress notification then try cloud fallback
      send("progress", { status: "fallback", percent: 0 });

      const cloudAdvice = cloudResult.status === "fulfilled" ? cloudResult.value : null;
      if (cloudAdvice) {
        send("result", {
          advice: cloudAdvice,
          source: "eazo-cloud",
          model: "deepseek.v3.1",
          cloudDurationMs,
        });
        controller.close();
        return;
      }

      // Both failed
      send("result", {
        advice: "Focus on hydration and rest. Your body needs recovery time.",
        source: "fallback",
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
