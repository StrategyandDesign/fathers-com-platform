export function transactionalEmailAttrs(locale?: string | null) {
  if (locale === "he") {
    return {
      lang: "he",
      dir: "rtl" as const,
      textAlign: "right" as const,
    };
  }
  return {
    lang: "en",
    dir: "ltr" as const,
    textAlign: "left" as const,
  };
}
