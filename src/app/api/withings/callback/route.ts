import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { exchangeWithingsCode } from "@/lib/wearables/withings";
import { saveWithingsToken } from "@/lib/db/queries";

export const maxDuration = 20;

function postMessageHtml(payload: { status: "success" | "error"; message?: string }) {
  const data = JSON.stringify(payload).replace(/</g, "\\u003c");
  return new NextResponse(
    `<!doctype html>
<html>
  <body>
    <script>
      window.opener?.postMessage({ type: "WITHINGS_AUTH", ...${data} }, "*");
      setTimeout(() => window.close(), 250);
    </script>
    <p style="font-family:sans-serif;text-align:center;margin-top:40vh">${payload.status === "success" ? "Withings connected." : `Connection failed: ${payload.message ?? ""}`}</p>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

/**
 * GET /api/withings/callback
 *
 * Withings OAuth callback. Exchanges the authorization code, saves the
 * encrypted refresh token, and posts a message back to the opener popup.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return postMessageHtml({ status: "error", message: "Not signed in" });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieState = request.cookies.get("withings_oauth_state")?.value;
  const cookieUid = request.cookies.get("withings_oauth_uid")?.value;

  if (!code) {
    return postMessageHtml({ status: "error", message: "No authorization code" });
  }

  if (!state || !cookieState || state !== cookieState || cookieUid !== auth.user.id) {
    return postMessageHtml({ status: "error", message: "Invalid OAuth state" });
  }

  const token = await exchangeWithingsCode(code);
  if (!token) {
    return postMessageHtml({ status: "error", message: "Withings token exchange failed" });
  }

  token.userId = auth.user.id;
  await saveWithingsToken({
    userId: token.userId,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    withingsUserId: token.withingsUserId,
    scope: token.scope,
    expiresAt: token.expiresAt,
  });

  const response = postMessageHtml({ status: "success" });
  response.cookies.set("withings_oauth_state", "", { maxAge: 0, path: "/" });
  response.cookies.set("withings_oauth_uid", "", { maxAge: 0, path: "/" });
  return response;
}
