"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseNotificationPreferences, type NotificationPreferences } from "@/lib/account/preferences";
import { ROLE_ACCOUNT, ROLE_HOME, resolveRole } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { allowActionRateLimit } from "@/lib/security/rate-limit";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  AVATARS_BUCKET,
  avatarObjectPath,
} from "@/lib/storage";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function ok(path: string, notice: string): never {
  redirect(`${path}?notice=${encodeURIComponent(notice)}`);
}

export async function saveNotificationPreferences(input: NotificationPreferences) {
  const { user } = await getAuthContext();
  if (!user) {
    return { error: "Sign in required." };
  }

  const prefs = parseNotificationPreferences(input);
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    ...prefs,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  const role = resolveRole(user);
  revalidatePath(ROLE_ACCOUNT[role]);
  return { ok: true as const };
}

export async function uploadAvatar(formData: FormData) {
  const { user, role } = await getAuthContext();
  if (!user || !role) {
    redirect("/login");
  }

  const path = ROLE_ACCOUNT[role];
  if (!(await allowActionRateLimit("account.avatar"))) {
    fail(path, "Too many photo uploads. Wait a few minutes and try again.");
  }
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    fail(path, "Choose a photo to upload.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    fail(path, "Photo must be 2 MB or smaller.");
  }
  if (!AVATAR_MIME_TYPES.includes(file.type as (typeof AVATAR_MIME_TYPES)[number])) {
    fail(path, "Use a JPEG, PNG, WebP, or GIF.");
  }

  const supabase = await createClient();
  const objectPath = avatarObjectPath(user.id);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(objectPath, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    fail(path, uploadError.message);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: objectPath })
    .eq("id", user.id);

  if (error) {
    fail(path, error.message);
  }

  revalidatePath(path);
  revalidatePath(ROLE_HOME[role]);
  ok(path, "Photo updated.");
}
