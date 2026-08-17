export const LOCALES = ["en", "he"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "fc_locale";

export const RTL_LOCALES: readonly Locale[] = ["he"];

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

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

export function localeFromCookie(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function dateLocale(locale: Locale) {
  return locale === "he" ? "he-IL" : "en-US";
}
