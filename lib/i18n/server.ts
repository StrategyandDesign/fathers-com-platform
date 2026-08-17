import { cache } from "react";

import { readLocaleCookie } from "@/lib/i18n/cookie";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { dateLocale } from "@/lib/i18n/config";

export type I18n = {
  locale: Locale;
  t: Translate;
  dir: "ltr" | "rtl";
  dateLocale: string;
};

export const getI18n = cache(async (): Promise<I18n> => {
  const locale = await readLocaleCookie();
  return {
    locale,
    t: createTranslator(locale),
    dir: locale === "he" ? "rtl" : "ltr",
    dateLocale: dateLocale(locale),
  };
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
