import { Check } from "lucide-react";

import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function SessionCompleteMark({ className }: { className?: string }) {
  const { t } = await getI18n();

  return (
    <p
      role="status"
      className={cn("flex items-center gap-2.5 text-sm font-medium text-foreground", className)}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary">
        <Check className="size-3.5 text-white" strokeWidth={2.5} />
      </span>
      {t("father.home.sessionComplete")}
    </p>
  );
}
