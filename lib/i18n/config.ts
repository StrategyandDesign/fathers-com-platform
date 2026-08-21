export const LOCALES = ["en", "he"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "fc_locale";

export const RTL_LOCALES: readonly Locale[] = ["he"];

/** Hebrew stays in `lib/i18n/messages/he.ts`. Public UI, cookies, and mail stay English until this flips. */
export const SHOW_HEBREW = false;

export const PUBLIC_LOCALES: readonly Locale[] = SHOW_HEBREW ? LOCALES : [DEFAULT_LOCALE];

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; htmlLang: string }
> = {
  en: { label: "English", nativeLabel: "English", htmlLang: "en" },
  he: { label: "Hebrew", nativeLabel: "עברית", htmlLang: "he" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isPublicLocale(value: unknown): value is Locale {
  return isLocale(value) && (PUBLIC_LOCALES as readonly string[]).includes(value);
}

export function exposeLocale(value: unknown): Locale {
  return isPublicLocale(value) ? value : DEFAULT_LOCALE;
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export function localeFromCookie(value: string | undefined | null): Locale {
  return exposeLocale(value);
}

export function dateLocale(locale: Locale) {
  return locale === "he" ? "he-IL" : "en-US";
}
