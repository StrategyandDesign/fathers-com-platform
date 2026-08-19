import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { FilmRuntime } from "@/components/father/film-runtime";
import { sessionChrome, type SessionStep } from "@/lib/father/action-commitment";
import { sessionPlaceLabel } from "@/lib/father/session-place";
import { hasTrainingOverview } from "@/lib/father/training-door";
import { trainingOverviewPath, type Session, type Training } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

type StepKey = SessionStep;

const courseEyebrowClassName =
  "min-w-0 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.16em]";

export async function SessionHeader({
  training,
  session,
  current,
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
  const chrome = sessionChrome(current);
  const catalogHref =
    trainingHref === undefined
      ? hasTrainingOverview(training)
        ? trainingOverviewPath(training.id)
        : "/father/trainings"
      : trainingHref;
  const total = sessionTotal ?? training.session_count;
  const place = sessionPlaceLabel(session.session_number, total, t);
  const subtitle =
    chrome.showKeyline && session.keyline && session.keyline !== session.title
      ? session.keyline
      : null;
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
    <div className="space-y-6">
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

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className={courseEyebrowClassName}>
            {catalogHref ? (
              <Link href={catalogHref} className={interactiveLinkClassName}>
                {training.title}
              </Link>
            ) : (
              <span>{training.title}</span>
            )}
          </p>
          {place ? (
            <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:text-xs">
              {place}
            </p>
          ) : null}
        </div>

        {chrome.showSessionHeading ? (
          <div className="space-y-1.5">
            <h1 className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">
              {session.title}
            </h1>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
            {chrome.showRuntime ? (
              <FilmRuntime seconds={session.duration_seconds} t={t} />
            ) : null}
          </div>
        ) : chrome.showRuntime ? (
          <FilmRuntime seconds={session.duration_seconds} t={t} />
        ) : null}
      </div>

      <nav aria-label={t("father.session.steps")}>
        <ol className="grid grid-cols-3 border-b border-white/10">
          {steps.map((step, index) => {
            const label = t(`father.session.${step.key}`);
            const isCurrent = step.key === current;
            const itemClassName = cn(
              "flex flex-col items-center gap-0.5 border-b-2 px-1 pb-3 pt-1 text-center",
              isCurrent
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground",
              !step.unlocked && "opacity-40"
            );
            const body = (
              <>
                <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={cn("text-sm", isCurrent && "font-medium")}>{label}</span>
              </>
            );

            return (
              <li key={step.key}>
                {step.unlocked && !isCurrent ? (
                  <Link
                    href={step.href}
                    className={cn(itemClassName, interactiveLinkClassName)}
                  >
                    {body}
                  </Link>
                ) : (
                  <span
                    className={itemClassName}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
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
