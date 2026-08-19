"use client";

import { useT } from "@/components/i18n/locale-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { headerIconClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function HeaderPaletteSwitch() {
  const t = useT();
  const { palette, setPalette } = useTheme();

  return (
    <div
      className="flex h-10 items-center gap-0.5 rounded-lg border border-header-border bg-header-accent p-0.5"
      role="group"
      aria-label={t("account.palette")}
    >
      {(["dark", "light"] as const).map((option) => {
        const active = palette === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-2.5 text-xs whitespace-nowrap",
              headerIconClassName,
              active
                ? "bg-white/15 text-header-foreground"
                : "text-header-muted hover:text-header-foreground"
            )}
            onClick={() => setPalette(option)}
          >
            {option === "dark" ? t("account.paletteDark") : t("account.paletteLight")}
          </button>
        );
      })}
    </div>
  );
}
