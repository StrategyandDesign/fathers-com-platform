import { FileText } from "lucide-react";

import type { Translate } from "@/lib/i18n/translate";
import type { TrainingHandout } from "@/lib/training-handouts/data";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function TrainingHandoutLinks({
  handouts,
  t,
  layout = "list",
}: {
  handouts: TrainingHandout[];
  t: Translate;
  layout?: "list" | "card";
}) {
  if (handouts.length === 0) return null;

  const links = handouts.map((handout) => (
    <a
      key={handout.id}
      href={handout.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-sm",
        interactiveLinkClassName
      )}
    >
      <FileText className="size-4 shrink-0" strokeWidth={1.6} />
      <span className="min-w-0 truncate">{handout.fileName}</span>
    </a>
  ));

  if (layout === "list") {
    return <div className="flex flex-col items-start gap-1">{links}</div>;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card px-4 py-3 sm:px-5">
      <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {handouts.length === 1
          ? t("father.trainings.handout")
          : t("father.trainings.handouts")}
      </p>
      <div className="flex flex-col items-start gap-1">{links}</div>
      <p className="text-xs text-muted-foreground">{t("father.trainings.openPdf")}</p>
    </div>
  );
}
