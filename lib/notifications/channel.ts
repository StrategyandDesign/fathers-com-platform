import type { NotificationChannel, NotificationPrefsRow } from "@/lib/notifications/types";

export function pickChannel(input: {
  prefs: Pick<NotificationPrefsRow, "pushEnabled" | "emailEnabled">;
  hasPushSubscription: boolean;
}): NotificationChannel | null {
  if (input.prefs.pushEnabled && input.hasPushSubscription) return "push";
  if (input.prefs.emailEnabled) return "email";
  return null;
}
