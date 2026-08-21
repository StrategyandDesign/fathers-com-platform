"use client";

import { useId } from "react";

import { useT } from "@/components/i18n/locale-provider";
import { PaletteSwitcher } from "@/components/theme/palette-switcher";

export function PaletteForm() {
  const t = useT();
  const hintId = useId();

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 className="font-heading text-lg font-semibold">{t("account.palette")}</h2>
      <p id={hintId} className="mt-1 text-sm text-muted-foreground">
        {t("account.paletteHint")}
      </p>
      <div className="mt-5 max-w-sm" aria-describedby={hintId}>
        <PaletteSwitcher />
      </div>
    </section>
  );
}
