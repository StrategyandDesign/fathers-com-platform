import { cache } from "react";

import { peekLocaleCookie } from "@/lib/i18n/cookie";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { DEFAULT_LOCALE, dateLocale, localeDir, type Locale } from "@/lib/i18n/config";

export type I18n = {
  locale: Locale;
  t: Translate;
  dir: "ltr" | "rtl";
  dateLocale: string;
};

function makeI18n(locale: Locale): I18n {
  return {
    locale,
    t: createTranslator(locale),
    dir: localeDir(locale),
    dateLocale: dateLocale(locale),
  };
}

export const getI18n = cache(async (): Promise<I18n> => {
  const cookieLocale = await peekLocaleCookie();
  if (cookieLocale) return makeI18n(cookieLocale);

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { resolveUserLocale } = await import("@/lib/i18n/resolve");
      const resolved = await resolveUserLocale(user.id);
      return makeI18n(resolved.locale);
    }
  } catch {
    // Cookie and session are best-effort; fall back to English.
  }

  return makeI18n(DEFAULT_LOCALE);
});

export function formatLongDate(value: string | Date, locale: Locale) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDateTime(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
