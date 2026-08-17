import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

type GroupLocaleFields = { locale?: string | null; code?: string | null };

export function localeFromGroup(group: GroupLocaleFields | null | undefined): Locale | null {
  if (isLocale(group?.locale)) return group.locale;
  if (group?.code?.trim().toUpperCase() === "IL") return "he";
  return null;
}

/** Official export language follows the organization. Mixed or unknown groups stay English. */
export function localeFromGroups(groups: GroupLocaleFields[]): Locale {
  if (groups.length === 0) return DEFAULT_LOCALE;
  const resolved = groups.map((group) => localeFromGroup(group));
  if (resolved.every((locale) => locale === "he")) return "he";
  return DEFAULT_LOCALE;
}

export async function resolveManagerExportLocale(managerId: string): Promise<Locale> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase
      .from("groups")
      .select("locale, code")
      .eq("manager_id", managerId);
    return localeFromGroups(data ?? []);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function resolveGroupsExportLocale(groupIds: string[]): Promise<Locale> {
  const ids = [...new Set(groupIds.filter(Boolean))];
  if (ids.length === 0) return DEFAULT_LOCALE;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("groups").select("locale, code").in("id", ids);
    return localeFromGroups(data ?? []);
  } catch {
    return DEFAULT_LOCALE;
  }
}
