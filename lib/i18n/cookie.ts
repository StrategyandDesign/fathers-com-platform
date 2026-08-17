import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  localeFromCookie,
  type Locale,
} from "@/lib/i18n/config";

export function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}

export async function readLocaleCookie(): Promise<Locale> {
  const jar = await cookies();
  return localeFromCookie(jar.get(LOCALE_COOKIE)?.value);
}

export async function writeLocaleCookie(locale: Locale) {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, localeCookieOptions());
}

export function parseLocaleFormValue(value: FormDataEntryValue | null): Locale | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}
