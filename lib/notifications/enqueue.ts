import "server-only";

import {
  ACTION_REMINDER_DELAY_DAYS,
  type NotificationPayload,
  type NotificationType,
} from "@/lib/notifications/types";
import { addLocalDays, applyClock } from "@/lib/notifications/schedule";
import { safePayload } from "@/lib/notifications/copy";
import { normalizeDeepLink } from "@/lib/notifications/links";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function enqueueNotification(
  supabase: Client,
  input: {
    userId: string;
    type: NotificationType;
    dedupeKey: string;
    href: string;
    payload: NotificationPayload;
    availableAt?: Date;
  }
) {
  const row = {
    user_id: input.userId,
    type: input.type,
    dedupe_key: input.dedupeKey,
    href: normalizeDeepLink(input.href),
    payload: safePayload(input.payload),
    available_at: (input.availableAt ?? new Date()).toISOString(),
    canceled_at: null,
    processed_at: null,
  };
  const { error } = await supabase.from("notification_outbox").insert(row);
  if (!error) return { ok: true as const };
  if (error.code !== "23505") {
    console.error("[notifications] enqueue failed", input.type, error.message);
    return { ok: false as const };
  }

  const { error: updateError } = await supabase
    .from("notification_outbox")
    .update({
      href: row.href,
      payload: row.payload,
      available_at: row.available_at,
      canceled_at: null,
    })
    .eq("dedupe_key", input.dedupeKey)
    .is("processed_at", null);
  if (updateError) {
    console.error("[notifications] enqueue update failed", input.type, updateError.message);
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function cancelOutbox(supabase: Client, dedupeKey: string) {
  const { error } = await supabase
    .from("notification_outbox")
    .update({ canceled_at: new Date().toISOString() })
    .eq("dedupe_key", dedupeKey)
    .is("processed_at", null);
  if (error) {
    console.error("[notifications] cancel failed", error.message);
  }
}

export function actionAvailableAt(input: {
  from: Date;
  timeZone: string;
  clock: string;
}) {
  const delayed = addLocalDays(input.from, ACTION_REMINDER_DELAY_DAYS);
  return applyClock(delayed, input.timeZone, input.clock);
}
