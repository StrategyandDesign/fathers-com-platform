import { parseNotificationPreferences } from "@/lib/account/preferences";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, signStorageUrl } from "@/lib/storage";

export async function loadCurrentAvatarUrl(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return signStorageUrl(supabase, AVATARS_BUCKET, data?.avatar_url);
}

export async function loadAccountState(userId: string) {
  const supabase = await createClient();
  const [profileRes, prefsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (prefsRes.error) throw prefsRes.error;

  let prefsRow = prefsRes.data;
  if (!prefsRow) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    prefsRow = data;
  }

  return {
    fullName: profileRes.data?.full_name ?? null,
    avatarUrl: await signStorageUrl(supabase, AVATARS_BUCKET, profileRes.data?.avatar_url),
    preferences: parseNotificationPreferences(prefsRow),
  };
}
