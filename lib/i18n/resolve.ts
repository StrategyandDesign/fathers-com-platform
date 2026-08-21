import { cache } from "react";

import { DEFAULT_LOCALE, exposeLocale, isPublicLocale, type Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export type ResolvedLocaleSource = {
  locale: Locale;
  homeGroupId: string | null;
  organizationCode: string | null;
};

const empty: ResolvedLocaleSource = {
  locale: DEFAULT_LOCALE,
  homeGroupId: null,
  organizationCode: null,
};

export const resolveUserLocale = cache(async (userId: string): Promise<ResolvedLocaleSource> => {
  try {
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("locale, home_group_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) return empty;

    if (isPublicLocale(profile?.locale)) {
      return {
        locale: profile.locale,
        homeGroupId: profile.home_group_id ?? null,
        organizationCode: null,
      };
    }

    const { loadGroupsForManager } = await import("@/lib/org-staff/membership");
    const managedGroups = await loadGroupsForManager(userId, supabase);
    const managed = managedGroups[0];

    if (managed && isPublicLocale(managed.locale)) {
      return {
        locale: managed.locale,
        homeGroupId: managed.id,
        organizationCode: managed.code ?? null,
      };
    }

    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("father_id", userId)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const groupId = membership?.group_id ?? profile?.home_group_id ?? null;
    if (!groupId) {
      return {
        locale: DEFAULT_LOCALE,
        homeGroupId: profile?.home_group_id ?? null,
        organizationCode: null,
      };
    }

    const { data: group } = await supabase
      .from("groups")
      .select("id, locale, code")
      .eq("id", groupId)
      .maybeSingle();

    return {
      locale: exposeLocale(group?.locale),
      homeGroupId: group?.id ?? profile?.home_group_id ?? null,
      organizationCode: group?.code ?? null,
    };
  } catch {
    return empty;
  }
});
