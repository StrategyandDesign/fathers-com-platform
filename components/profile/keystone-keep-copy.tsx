"use client";

import { useT } from "@/components/i18n/locale-provider";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function KeystoneKeepCopy() {
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "inline-flex min-h-11 items-center text-sm text-muted-foreground print:hidden",
        interactiveLinkClassName
      )}
    >
      {t("father.profile.keepCopy")}
    </button>
  );
}
