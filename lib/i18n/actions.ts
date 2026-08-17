"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ROLE_ACCOUNT } from "@/lib/auth/roles";
import { getAuthContext } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/cookie";
import { resolveUserLocale } from "@/lib/i18n/resolve";
import { createClient } from "@/lib/supabase/server";

export async function setLocaleCookie(locale: Locale) {
  if (!isLocale(locale)) return;
  await writeLocaleCookie(locale);
  revalidatePath("/", "layout");
}

export async function saveLocalePreference(formData: FormData) {
  const { user, role } = await getAuthContext();
  const path = role ? ROLE_ACCOUNT[role] : "/login";
  const raw = String(formData.get("locale") ?? "").trim();
  const locale = raw === "" ? null : isLocale(raw) ? raw : null;

  if (!user || !role) {
    redirect(`/login?error=${encodeURIComponent("flash.badCredentials")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) {
    redirect(`${path}?error=${encodeURIComponent("flash.localeFailed")}`);
  }

  if (locale) {
    await writeLocaleCookie(locale);
  } else {
    const resolved = await resolveUserLocale(user.id);
    await writeLocaleCookie(resolved.locale);
  }

  revalidatePath("/", "layout");
  redirect(`${path}?notice=${encodeURIComponent("flash.localeSaved")}`);
}
