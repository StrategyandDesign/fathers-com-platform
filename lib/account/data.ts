import { cache } from "react";

import { parseManagerDisplayTitle } from "@/lib/account/display-title";
import { parseNotificationPreferences } from "@/lib/account/preferences";
import { createClient } from "@/lib/supabase/server";
import { AVATARS_BUCKET, signStorageUrl } from "@/lib/storage";

export const loadOrganizationName = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("father_id", userId)
    .order("joined_at", { ascending: true });

  if (membershipError) throw membershipError;

  const groupIds = [
    ...new Set((memberships ?? []).map((row) => String(row.group_id))),
  ];
  if (groupIds.length === 0) return null;

  const { data: groups, error: groupError } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  if (groupError) throw groupError;

  const nameById = new Map(
    ((groups ?? []) as Array<{ id: string; name: string | null }>).map((group) => [
      group.id,
      group.name?.trim() || "",
    ])
  );
  const names = groupIds.map((id) => nameById.get(id) ?? "").filter(Boolean);
  return names.length > 0 ? names.join(", ") : null;
});

export const loadProfileFullName = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  const name = typeof data?.full_name === "string" ? data.full_name.trim() : "";
  return name || null;
});

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

export const loadManagerDisplayTitle = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_title")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return parseManagerDisplayTitle(data?.display_title);
});

export async function loadAccountState(userId: string) {
  const supabase = await createClient();
  const [profileRes, prefsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, locale, display_title, share_anonymous_admin")
      .eq("id", userId)
      .maybeSingle(),
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
    locale: typeof profileRes.data?.locale === "string" ? profileRes.data.locale : null,
    displayTitle: parseManagerDisplayTitle(profileRes.data?.display_title),
    shareAnonymousAdmin: profileRes.data?.share_anonymous_admin === true,
  };
}
