import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}

export async function peekLocaleCookie(): Promise<Locale | null> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : null;
}

export async function readLocaleCookie(): Promise<Locale> {
  return (await peekLocaleCookie()) ?? DEFAULT_LOCALE;
}

export async function writeLocaleCookie(locale: Locale) {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, localeCookieOptions());
}

export async function clearLocaleCookie() {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, "", { ...localeCookieOptions(), maxAge: 0 });
}

export function parseLocaleFormValue(value: FormDataEntryValue | null): Locale | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}
