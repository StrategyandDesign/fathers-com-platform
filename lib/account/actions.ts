"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseNotificationPreferences, type NotificationPreferences } from "@/lib/account/preferences";
import { ROLE_ACCOUNT } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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
