import "server-only";

import webpush from "web-push";

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function getVapidPublicKey() {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    ""
  );
}

export function getVapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY?.trim() || "";
}

export function isPushConfigured() {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: { title: string; body: string; url: string }
) {
  if (!isPushConfigured()) return { sent: false as const, reason: "not_configured" };
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:noreply@fathers.com",
      getVapidPublicKey(),
      getVapidPrivateKey()
    );
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
      })
    );
    return { sent: true as const };
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
    if (status === 404 || status === 410) {
      return { sent: false as const, reason: "gone" as const };
    }
    console.error("[push] send failed", error);
    return { sent: false as const, reason: "provider_error" as const };
  }
}
