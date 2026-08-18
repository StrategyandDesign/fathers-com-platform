"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_LOCALE, localeDir, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translate } from "@/lib/i18n/translate";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Translate;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dir: "ltr",
  t: createTranslator(DEFAULT_LOCALE),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value: I18nContextValue = {
    locale,
    dir: localeDir(locale),
    t: createTranslator(locale),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}
