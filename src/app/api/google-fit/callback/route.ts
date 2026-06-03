import { NextRequest } from "next/server";

/**
 * GET /api/google-fit/callback?code=...&state=...
 *
 * Exchanges the authorization code for tokens, then self-closes the popup
 * and postMessages the access_token back to the opener.
 * The access_token is short-lived (1hr) — enough for a single session pull.
 * We never store it server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${appBaseUrl}/api/google-fit/callback`;

  if (error || !code || !clientId || !clientSecret) {
    return selfClosingPopup(null, "Connection cancelled or not configured.");
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return selfClosingPopup(null, "Failed to exchange authorization code.");
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token as string | undefined;

  if (!accessToken) {
    return selfClosingPopup(null, "No access token returned.");
  }

  // Pass token back to opener — client uses it to call /api/google-fit/data
  return selfClosingPopup(accessToken, null);
}

function selfClosingPopup(accessToken: string | null, errorMsg: string | null) {
  const payload = JSON.stringify({
    type: "GOOGLE_FIT_AUTH",
    status: accessToken ? "success" : "failure",
    accessToken,
    error: errorMsg,
  });

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body style="background:#0A0A0B;color:#F5F5F4;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <p style="font-size:14px;opacity:0.5;">${accessToken ? "Connected. Closing..." : "Failed. Closing..."}</p>
  <script>
    try { if (window.opener) window.opener.postMessage(${payload}, "*"); } catch(e) {}
    setTimeout(() => window.close(), 800);
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}
