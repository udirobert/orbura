import { type NextRequest, NextResponse } from "next/server";
import { notifications, EazoNotificationPublishError } from "@/lib/sdk/eazo-server";

/**
 * Daily digest with streak-aware messaging.
 *
 * Rotates through a set of message variants to keep the notification
 * feeling fresh. On Mondays, references the weekend. Runs daily at 17:00
 * UTC by default (configurable in vercel.json).
 *
 * Scheduled by `vercel.json#crons`. Authenticated via `CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Day-aware messaging — rotate through variants to avoid staleness
  const now = new Date();
  const dayOfWeek = now.getDay();       // 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfMonth = now.getDate();

  // Pick a message variant based on the day of the month to rotate
  const variantIndex = dayOfMonth % 5;

  interface MessageVariant {
    title: string;
    body: string;
  }

  const baseMessages: MessageVariant[] = [
    {
      title: "Daily body debt check-in",
      body: "How are you feeling today? Your body is waiting.",
    },
    {
      title: "Recovery check-in",
      body: "Your body keeps the score. What hit you yesterday?",
    },
    {
      title: "Morning debt assessment",
      body: "One quick log takes the guesswork out of your day.",
    },
    {
      title: "How's the body today?",
      body: "Log your stressors and see your real recovery state.",
    },
    {
      title: "Don't lose the picture",
      body: "A daily log builds your personal recovery baseline.",
    },
  ];

  // Monday has a weekend recovery angle
  const mondayMessage: MessageVariant = {
    title: "Weekend recovery report",
    body: "How did your body handle the weekend? Log in to see your baseline.",
  };

  // Saturday has a pre-weekend nudge
  const saturdayMessage: MessageVariant = {
    title: "Weekend ahead",
    body: "How are you carrying into this weekend? One log sets the tone.",
  };

  let message: MessageVariant;
  if (dayOfWeek === 1) {
    message = mondayMessage;
  } else if (dayOfWeek === 6) {
    message = saturdayMessage;
  } else {
    message = baseMessages[variantIndex];
  }

  try {
    const result = await notifications.publish({
      title: message.title,
      body: message.body,
      data: {
        source: "cron-daily-digest",
        dayOfWeek,
        variant: variantIndex,
      },
      audience: "subscribers",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof EazoNotificationPublishError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code >= 400 && err.code < 600 ? err.code : 500 },
      );
    }
    console.error("[notifications/cron] unexpected error", err);
    return NextResponse.json({ error: "publish failed" }, { status: 500 });
  }
}
