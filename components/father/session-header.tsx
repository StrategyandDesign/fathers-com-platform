import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { FilmRuntime } from "@/components/father/film-runtime";
import type { Session, Training } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type StepKey = "film" | "checkin" | "action";

export async function SessionHeader({
  training,
  session,
  current,
  completedCount,
  sessionTotal,
  backHref,
  filmCompleted = false,
  checkinCompleted = false,
  filmHref,
  checkinHref,
  actionHref,
  trainingHref,
  unlockAll = false,
}: {
  training: Training;
  session: Session;
  current: StepKey;
  completedCount?: number;
  sessionTotal?: number;
  backHref: string;
  filmCompleted?: boolean;
  checkinCompleted?: boolean;
  filmHref?: string;
  checkinHref?: string;
  actionHref?: string;
  trainingHref?: string | null;
  unlockAll?: boolean;
}) {
  const { t } = await getI18n();
  const catalogHref = trainingHref === undefined ? "/father/trainings" : trainingHref;
  const total = sessionTotal ?? training.session_count;
  const subtitle =
    session.keyline && session.keyline !== session.title ? session.keyline : null;
  const steps: Array<{ key: StepKey; href: string; unlocked: boolean }> = [
    {
      key: "film",
      href: filmHref ?? `/father/sessions/${session.id}`,
      unlocked: true,
    },
    {
      key: "checkin",
      href: checkinHref ?? `/father/sessions/${session.id}/checkin`,
      unlocked: unlockAll || filmCompleted,
    },
    {
      key: "action",
      href: actionHref ?? `/father/sessions/${session.id}/action`,
      unlocked: unlockAll || checkinCompleted,
    },
  ];

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className={cn(
          "inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground",
          interactiveLinkClassName
        )}
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {t("common.back")}
      </Link>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {catalogHref ? (
            <Link href={catalogHref} className={interactiveLinkClassName}>
              {training.title}
            </Link>
          ) : (
            <span>{training.title}</span>
          )}
        </p>
        {training.part_number && training.part_total ? (
          <p className="text-xs text-muted-foreground">
            {total === 1
              ? t("father.trainings.partSubtitleOne", {
                  n: training.part_number,
                  total: training.part_total,
                })
              : t("father.trainings.partSubtitle", {
                  n: training.part_number,
                  total: training.part_total,
                  sessions: total,
                })}
          </p>
        ) : null}
        <h1 className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">
          {session.title}
        </h1>
        <FilmRuntime seconds={session.duration_seconds} t={t} />
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <nav
          aria-label={t("father.session.steps")}
          className="flex flex-wrap items-center text-sm"
        >
          {steps.map((step, index) => {
            const label = t(`father.session.${step.key}`);
            const isCurrent = step.key === current;
            const className = cn(
              isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
              step.unlocked && !isCurrent && interactiveLinkClassName
            );

            return (
              <span key={step.key} className="inline-flex items-center">
                {index > 0 ? (
                  <span className="px-2 text-white/20" aria-hidden>
                    ·
                  </span>
                ) : null}
                {step.unlocked && !isCurrent ? (
                  <Link href={step.href} className={className}>
                    {label}
                  </Link>
                ) : (
                  <span
                    className={className}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
        {typeof completedCount === "number" ? (
          <p className="text-xs text-muted-foreground">
            {t("father.session.sessionsCount", { completed: completedCount, total })}
          </p>
        ) : null}
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
