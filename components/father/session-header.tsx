import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import type { Session, Training } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { interactiveIconClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export async function SessionHeader({
  training,
  session,
  current,
  completedCount,
  sessionTotal,
  backHref,
}: {
  training: Training;
  session: Session;
  current: "film" | "checkin" | "action";
  completedCount?: number;
  sessionTotal?: number;
  backHref: string;
}) {
  const { t } = await getI18n();
  const detail = session.keyline ?? session.title;
  const total = sessionTotal ?? training.session_count;
  const stepLabel = t(`father.session.${current}`);
  const sessionLine = detail
    ? t("father.session.sessionDetail", { n: session.session_number, detail })
    : t("father.session.sessionN", { n: session.session_number });

  return (
    <div className="flex items-start gap-1">
      <Link
        href={backHref}
        aria-label={t("common.back")}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground lg:hidden",
          interactiveIconClassName
        )}
      >
        <ChevronLeft className="size-6 rtl:rotate-180" />
      </Link>
      <div className="min-w-0 flex-1 pt-2 lg:pt-0">
        <div className="lg:hidden">
          <p className="truncate text-xs text-muted-foreground">{training.title}</p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{sessionLine}</p>
          <p className="mt-1 text-sm text-muted-foreground">{stepLabel}</p>
        </div>
        <p className="hidden text-center text-sm text-muted-foreground lg:block">
          <Link href="/father/trainings" className={interactiveLinkClassName}>
            {training.title}
          </Link>
          <span className="px-2 text-white/20">|</span>
          <span>{sessionLine}</span>
          <span className="px-2 text-white/20">|</span>
          <span className="text-foreground">{stepLabel}</span>
          {typeof completedCount === "number" ? (
            <>
              <span className="px-2 text-white/20">|</span>
              <span>
                {t("father.session.sessionsCount", { completed: completedCount, total })}
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export async function SessionCrumbNote({ className }: { className?: string }) {
  const { t } = await getI18n();
  return (
    <p className={cn("text-center text-sm text-muted-foreground", className)}>
      {t("father.session.crumb")}
    </p>
  );
}
