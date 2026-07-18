import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { terraConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAction, isMemoryEnabled } from "@/lib/supermemory";
import { verifyTerraWebhookSignature } from "@/lib/terra/webhook";

export const maxDuration = 30;

/**
 * POST /api/terra/webhook
 *
 * Receives Terra push payloads. We handle SLEEP events — extracting HRV,
 * resting HR, and sleep stages — then store them against the terra_user_id
 * for retrieval by /api/terra/data.
 *
 * Also logs structured wearable data to Supermemory so the AI coach can
 * reference it in prescriptions ("your HRV dropped 8ms this week").
 *
 * Terra signs payloads with a signature header — we verify it when the
 * TERRA_SIGNING_SECRET env var is present.
 */
export async function POST(request: NextRequest) {
  // Read the raw body first; Terra's HMAC is computed over the unaltered
  // request text. We parse JSON only after verification.
  const rawBody = await request.text();

  // Verify Terra signature if signing secret is configured
  const signingSecret = process.env.TERRA_SIGNING_SECRET;
  if (signingSecret) {
    const terraSignature = request.headers.get("terra-signature");
    if (!terraSignature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const valid = verifyTerraWebhookSignature(rawBody, terraSignature, signingSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = payload.type as string;
  const terraUser = payload.user as { user_id?: string } | undefined;
  const terraUserId = terraUser?.user_id;

  if (!terraUserId) {
    return NextResponse.json({ status: "ignored", reason: "no user_id" });
  }

  // Only process SLEEP payloads — that's where HRV lives
  if (type === "SLEEP") {
    const dataArray = (payload.data as unknown[]) ?? [];
    const sleepEntry = dataArray[0] as Record<string, unknown> | undefined;

    if (sleepEntry) {
      // Extract the fields Body Debt needs
      const hrData = sleepEntry.heart_rate_data as Record<string, unknown> | undefined;
      const sleepData = sleepEntry.sleep_durations_data as Record<string, unknown> | undefined;
      const asleepData = sleepData?.asleep as Record<string, unknown> | undefined;

      const avgHrvRmssd = hrData?.avg_hrv_rmssd as number | undefined;
      const avgRestingHr = hrData?.avg_resting_heart_rate as number | undefined;
      const deepSecs = asleepData?.duration_deep_sleep_state_seconds as number | undefined;
      const remSecs = asleepData?.duration_REM_sleep_state_seconds as number | undefined;
      const lightSecs = asleepData?.duration_light_sleep_state_seconds as number | undefined;

      if (avgHrvRmssd !== undefined || avgRestingHr !== undefined) {
        try {
          // Look up the Body Debt user ID for this Terra connection
          const [conn] = await db
            .select()
            .from(terraConnections)
            .where(eq(terraConnections.terraUserId, terraUserId))
            .limit(1);

          // Store on the connection record so /api/terra/data can serve it
          await db
            .update(terraConnections)
            .set({
              lastSyncAt: new Date(),
            })
            .where(eq(terraConnections.terraUserId, terraUserId));

          // Log structured wearable data to Supermemory so the AI coach
          // can reference it in future prescriptions
          if (isMemoryEnabled && conn?.userId) {
            const deepMins = deepSecs ? Math.round(deepSecs / 60) : null;
            const remMins = remSecs ? Math.round(remSecs / 60) : null;
            const lightMins = lightSecs ? Math.round(lightSecs / 60) : null;

            const summary = [
              `Wearable sleep data synced from Terra.`,
              avgHrvRmssd !== undefined && `Average HRV (RMSSD): ${avgHrvRmssd}ms`,
              avgRestingHr !== undefined && `Average resting heart rate: ${avgRestingHr}bpm`,
              deepMins && `Deep sleep: ${deepMins}min`,
              remMins && `REM sleep: ${remMins}min`,
              lightMins && `Light sleep: ${lightMins}min`,
            ].filter(Boolean).join("\n");

            logAction(conn.userId, summary, {
              type: "wearable_sleep_data",
              hrvRmssd: avgHrvRmssd ?? "",
              restingHr: avgRestingHr ?? "",
            }).catch(() => {});
          }

          console.log("[terra/webhook] SLEEP data received:", {
            terraUserId,
            avgHrvRmssd,
            avgRestingHr,
            deepMins: deepSecs ? Math.round(deepSecs / 60) : undefined,
            remMins: remSecs ? Math.round(remSecs / 60) : undefined,
            lightMins: lightSecs ? Math.round(lightSecs / 60) : undefined,
          });
        } catch (err) {
          console.error("[terra/webhook] DB update failed:", err);
        }
      }
    }
  }

  // Always return 200 to Terra — otherwise they retry
  return NextResponse.json({ status: "received" });
}
