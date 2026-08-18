"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isManagerDisplayTitle } from "@/lib/account/display-title";
import { parseNotificationPreferences, type NotificationPreferences } from "@/lib/account/preferences";
import { parseWeekday } from "@/lib/father/onboarding";
import { parseClock, parseTimeZone } from "@/lib/notifications/schedule";
import { DEFAULT_QUIET_END, DEFAULT_QUIET_START } from "@/lib/notifications/types";
import { ROLE_ACCOUNT } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function saveDisplayTitle(formData: FormData) {
  const { user, role } = await getAuthContext();
  const path = ROLE_ACCOUNT.manager;
  const title = String(formData.get("display_title") ?? "").trim();

  if (!user || role !== "manager") {
    redirect("/login");
  }
  if (!isManagerDisplayTitle(title)) {
    redirect(`${path}?error=${encodeURIComponent("flash.displayTitleFailed")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_title: title })
    .eq("id", user.id);

  if (error) {
    redirect(`${path}?error=${encodeURIComponent("flash.displayTitleFailed")}`);
  }

  revalidatePath("/", "layout");
  redirect(`${path}?notice=${encodeURIComponent("flash.displayTitleSaved")}`);
}

export async function saveAnonymousShare(enabled: boolean) {
  const { user, role } = await getAuthContext();
  if (!user || !role || role === "admin") {
    return { error: "Sign in again to save preferences." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      share_anonymous_admin: enabled,
      share_anonymous_admin_at: enabled ? new Date().toISOString() : null,
    })
    .eq("id", user.id)
    .select("share_anonymous_admin")
    .maybeSingle();

  if (error || !data || data.share_anonymous_admin !== enabled) {
    return { error: "That preference didn’t save. Try again." };
  }

  revalidatePath(ROLE_ACCOUNT[role]);
  revalidatePath("/admin/gathering");
  return { ok: true as const };
}

export async function saveNotificationPreferences(input: NotificationPreferences) {
  const { user, role } = await getAuthContext();
  if (!user || !role) {
    return { error: "Sign in again to save preferences." };
  }

  const prefs = parseNotificationPreferences(input);
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...prefs,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Preferences didn’t save. Try again." };
  }

  revalidatePath(ROLE_ACCOUNT[role]);
  return { ok: true as const };
}

export async function saveNotificationSchedule(input: {
  reminderDay: number | null;
  reminderTime: string | null;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}) {
  const { user, role } = await getAuthContext();
  if (!user || role !== "father") {
    return { error: "Sign in again to save preferences." };
  }

  const weekday = parseWeekday(input.reminderDay);
  const remindAt = parseClock(input.reminderTime);
  const timezone = parseTimeZone(input.timezone) ?? "UTC";
  const quietStart = parseClock(input.quietHoursStart) ?? DEFAULT_QUIET_START;
  const quietEnd = parseClock(input.quietHoursEnd) ?? DEFAULT_QUIET_END;

  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    reminder_day: weekday,
    reminder_time: remindAt ? `${remindAt}:00` : null,
    timezone,
    quiet_hours_start: `${quietStart}:00`,
    quiet_hours_end: `${quietEnd}:00`,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Preferences didn’t save. Try again." };

  if (weekday != null && remindAt) {
    const reminderError = (
      await supabase.from("reminder_preferences").upsert(
        {
          father_id: user.id,
          weekday,
          remind_at: `${remindAt}:00`,
        },
        { onConflict: "father_id" }
      )
    ).error;
    if (reminderError) return { error: "That reminder didn’t save. Try again." };
  }

  revalidatePath(ROLE_ACCOUNT[role]);
  return { ok: true as const };
}

export async function saveNotificationTimezone(timezone: string) {
  const { user, role } = await getAuthContext();
  if (!user || !role) return { ok: false as const };
  const zone = parseTimeZone(timezone);
  if (!zone) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    timezone: zone,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const };
  return { ok: true as const };
}

export async function uploadAvatar() {
  const { user, role } = await getAuthContext();
  if (!user || !role) {
    redirect("/login");
  }
  fail(ROLE_ACCOUNT[role], "Photo upload is not available.");
}

export async function removeAvatar() {
  const { user, role } = await getAuthContext();
  if (!user || !role) {
    redirect("/login");
  }
  fail(ROLE_ACCOUNT[role], "Photo upload is not available.");
}
