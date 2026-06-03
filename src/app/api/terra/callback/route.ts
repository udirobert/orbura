import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { terraConnections } from "@/lib/db/schema";

/**
 * GET /api/terra/callback?status=success&user_id=...&provider=...&reference_id=...
 *
 * Terra redirects here after OAuth. We store the terra_user_id → provider
 * mapping and close the popup by returning a self-closing HTML page that
 * posts a message to the opener window.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const terraUserId = searchParams.get("user_id") ?? searchParams.get("terra_user_id");
  const provider = searchParams.get("provider") ?? "UNKNOWN";
  const referenceId = searchParams.get("reference_id");

  if (status === "success" && terraUserId) {
    // Upsert terra connection — if user reconnects same provider, update
    try {
      await db
        .insert(terraConnections)
        .values({
          terraUserId,
          provider: provider.toUpperCase(),
          referenceId: referenceId ?? null,
          lastSyncAt: new Date(),
        })
        .onConflictDoUpdate({
          target: terraConnections.terraUserId,
          set: {
            provider: provider.toUpperCase(),
            lastSyncAt: new Date(),
          },
        });
    } catch (err) {
      console.error("[terra/callback] DB upsert failed:", err);
      // Non-fatal — still return success to client
    }
  }

  // Self-closing popup page — posts result back to the opener
  const messagePayload = JSON.stringify({
    type: "TERRA_AUTH",
    status: status === "success" ? "success" : "failure",
    terraUserId: terraUserId ?? null,
    provider,
  });

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body style="background:#0A0A0B;color:#F5F5F4;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <p style="font-size:14px;opacity:0.5;">${status === "success" ? "Connected. Closing..." : "Connection failed. Closing..."}</p>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${messagePayload}, "*");
      }
    } catch(e) {}
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
