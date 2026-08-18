import { dateLocale, type Locale } from "@/lib/i18n/config";

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(value: string | Date, locale: Locale) {
  const date = asDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(value: string | Date | null | undefined, locale: Locale) {
  const date = asDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDateTime(value: string | Date | null | undefined, locale: Locale) {
  const date = asDate(value);
  if (!date) return "—";
  return date.toLocaleString(dateLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
