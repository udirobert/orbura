"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notifications } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

import { sendTestNotification } from "@/lib/api";

/** Subscribe toggle + "Send test" button. Dark-theme variant for the dashboard. */
export function NotificationsToggle() {
  const user = useEazo((s) => s.auth.user);
  const platform = useEazo((s) => s.device.platform);
  const isMobileHost = platform === "mobile";

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    notifications
      .isSubscribed()
      .then((r) => {
        if (!cancelled) setSubscribed(r.subscribed);
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    const wantOn = subscribed !== true;
    setSubscribed(wantOn); // optimistic
    try {
      const result = wantOn
        ? await notifications.subscribe()
        : await notifications.unsubscribe();
      setSubscribed(result.subscribed);
      if (!isMobileHost) {
        toast.info("Notifications only deliver inside the Eazo mobile app.");
      } else if (result.subscribed) {
        toast.success("Subscribed — you'll receive system notifications.");
      } else {
        toast.success("Unsubscribed.");
      }
    } catch (err) {
      console.error("[notifications] toggle failed", err);
      setSubscribed(!wantOn); // revert
      toast.error("Couldn't update subscription. Try again.");
    } finally {
      setToggling(false);
    }
  }

  async function handleSendTest() {
    if (sending) return;
    setSending(true);
    try {
      const data = await sendTestNotification();
      if (data.delivered > 0) {
        toast.success(
          `Sent! Delivered to ${data.delivered} subscriber${data.delivered === 1 ? "" : "s"}.`,
        );
      } else {
        toast.info(
          "No subscribers yet — turn on notifications above and try again.",
        );
      }
    } catch (err) {
      console.error("[notifications] test publish failed", err);
      toast.error(
        `Test failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSending(false);
    }
  }

  const showHint = subscribed !== null && !isMobileHost;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border p-3"
      style={{
        backgroundColor: "#141416",
        borderColor: "rgba(168,162,158,0.08)",
      }}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: "rgba(168,162,158,0.08)" }}>
          {subscribed ? (
            <Bell className="h-4 w-4" style={{ color: "#EA580C" }} />
          ) : (
            <BellOff className="h-4 w-4" style={{ color: "#524F4C" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: "#F5F5F4" }}>
            Push notifications
          </p>
          <p className="text-[12px]" style={{ color: "#A8A29E" }}>
            {showHint
              ? "Open this app inside Eazo Mobile to receive system pushes."
              : subscribed === null
                ? "Loading…"
                : subscribed
                  ? "On — you'll receive system pushes from this app."
                  : "Off — turn on to receive system pushes."}
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || subscribed === null}
          className="flex h-8 items-center justify-center rounded-[10px] px-3 text-[12px] font-semibold transition-all duration-200 disabled:opacity-50"
          style={
            subscribed
              ? {
                  backgroundColor: "#EA580C",
                  color: "#F5F5F4",
                  boxShadow: "0 4px 10px rgba(234,88,12,0.32)",
                }
              : {
                  backgroundColor: "#141416",
                  color: "#A8A29E",
                  border: "1px solid rgba(168,162,158,0.15)",
                }
          }
          onMouseEnter={(e) => {
            if (subscribed) e.currentTarget.style.filter = "brightness(1.05)";
            else e.currentTarget.style.backgroundColor = "rgba(168,162,158,0.12)";
          }}
          onMouseLeave={(e) => {
            if (subscribed) e.currentTarget.style.filter = "none";
            else e.currentTarget.style.backgroundColor = "#141416";
          }}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : subscribed ? (
            "On"
          ) : (
            "Off"
          )}
        </button>
      </div>
      <button
        onClick={handleSendTest}
        disabled={sending}
        className="self-end h-7 rounded-lg px-3 text-[11px] font-semibold transition-colors disabled:opacity-50"
        style={{
          backgroundColor: "rgba(168,162,158,0.06)",
          color: "#524F4C",
          border: "1px solid rgba(168,162,158,0.08)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#EA580C";
          e.currentTarget.style.backgroundColor = "rgba(234,88,12,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#524F4C";
          e.currentTarget.style.backgroundColor = "rgba(168,162,158,0.06)";
        }}
      >
        {sending ? "Sending…" : "Send test notification"}
      </button>
    </div>
  );
}
