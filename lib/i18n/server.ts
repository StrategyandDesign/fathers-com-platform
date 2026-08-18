import "server-only";

import { cache } from "react";

import { peekLocaleCookie } from "@/lib/i18n/cookie";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { DEFAULT_LOCALE, dateLocale, localeDir, type Locale } from "@/lib/i18n/config";

export { formatLongDate, formatShortDate, formatShortDateTime } from "@/lib/i18n/dates";

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
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const cookieLocale = await peekLocaleCookie();
      if (cookieLocale) return makeI18n(cookieLocale);
      const { resolveUserLocale } = await import("@/lib/i18n/resolve");
      const resolved = await resolveUserLocale(user.id);
      return makeI18n(resolved.locale);
    }
  } catch {
    // Session is best-effort; signed-out screens stay English.
  }

  return makeI18n(DEFAULT_LOCALE);
});
