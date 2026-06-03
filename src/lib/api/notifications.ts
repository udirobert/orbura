import { request } from "./request";

export interface SendTestNotificationResponse {
  delivered: number;
  publishId: string;
}

/**
 * Sends a test push notification to all subscribers of this app.
 * POST /api/notifications/test
 */
export async function sendTestNotification(): Promise<SendTestNotificationResponse> {
  const res = await request("/api/notifications/test", { method: "POST" });
  const text = await res.text();

  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return body as SendTestNotificationResponse;
}
