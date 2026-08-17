import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { en } from "@/lib/i18n/messages/en";
import { he } from "@/lib/i18n/messages/he";
import type { Messages } from "@/lib/i18n/messages/types";

export type { Messages };

const CATALOG: Record<Locale, Messages> = {
  en,
  he,
};

export type TranslateVars = Record<string, string | number>;

export type Translate = (key: string, vars?: TranslateVars) => string;

function readPath(source: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export function messagesFor(locale: Locale): Messages {
  return CATALOG[locale] ?? CATALOG[DEFAULT_LOCALE];
}

export function createTranslator(locale: Locale): Translate {
  const primary = messagesFor(locale);
  const fallback = messagesFor(DEFAULT_LOCALE);

  return (key, vars) => {
    const text = readPath(primary, key) ?? readPath(fallback, key) ?? key;
    return interpolate(text, vars);
  };
}
