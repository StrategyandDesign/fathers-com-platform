"use client";

import { useEffect, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { saveNotificationTimezone } from "@/lib/account/actions";
import { interactiveUnderlineClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

async function subscribePush() {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { ok: true as const, skipped: true as const };
  }
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!vapid) return { ok: true as const, skipped: true as const };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: true as const, skipped: true as const };

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await registration.update();
  const ready = await navigator.serviceWorker.ready;
  const existing = await ready.pushManager.getSubscription();
  const subscription =
    existing ??
    (await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    return { ok: true as const, skipped: true as const };
  }
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }),
  });
  if (!response.ok) return { ok: true as const, skipped: true as const };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (zone) await saveNotificationTimezone(zone);
  return { ok: true as const, skipped: false as const };
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushPermissionCard() {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY));
  }, []);

  if (!ready || hidden) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="font-medium">{t("notify.pushTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("notify.pushBody")}</p>
      <Button
        type="button"
        variant="outline"
        className="w-full min-h-12"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await subscribePush();
          setHidden(true);
          setPending(false);
        }}
      >
        {t("notify.pushAllow")}
      </Button>
      <button
        type="button"
        className={cn("block w-full text-center text-sm text-muted-foreground", interactiveUnderlineClassName)}
        onClick={() => setHidden(true)}
      >
        {t("notify.pushSkip")}
      </button>
    </div>
  );
}

export function PushDeviceButton() {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full min-h-12"
        disabled={pending || done}
        onClick={async () => {
          setPending(true);
          await subscribePush();
          setDone(true);
          setPending(false);
        }}
      >
        {done ? t("notify.pushSaved") : t("notify.pushDevice")}
      </Button>
      <p className="text-sm text-muted-foreground">{t("notify.pushDeviceHint")}</p>
    </div>
  );
}
