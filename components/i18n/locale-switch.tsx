"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useI18n } from "@/components/i18n/locale-provider";
import { setLocaleCookie } from "@/lib/i18n/set-locale-cookie";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitch({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleCookie(next);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)} role="group" aria-label={t("common.language")}>
      {compact ? null : (
        <span className="text-xs text-muted-foreground">{t("auth.languageHint")}</span>
      )}
      <div className="inline-flex overflow-hidden rounded-full border border-border">
        {LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => choose(item)}
            className={cn(
              "min-h-9 px-3 text-xs font-medium",
              item === locale
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            {LOCALE_META[item].nativeLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
