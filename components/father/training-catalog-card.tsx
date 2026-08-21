import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { FilmRuntime } from "@/components/father/film-runtime";
import { TrainingHandoutLinks } from "@/components/father/training-handout-links";
import { HostedFilmPlayer } from "@/components/media/hosted-film-player";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { hasStartedTrainingWork, shouldShowCatalogOverview } from "@/lib/father/training-door";
import { sessionFilmPath, type Session, type SessionProgress } from "@/lib/father/types";
import { hasHostedVideo } from "@/lib/media/hosted-video";
import type { Translate } from "@/lib/i18n/translate";
import type { TrainingHandout } from "@/lib/training-handouts/data";
import {
  homePrimaryCtaClassName,
  interactiveControlClassName,
  interactiveLinkClassName,
  interactiveSurfaceClassName,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

export type TrainingCatalogDot = {
  id: string;
  number: number;
  title: string;
  done: boolean;
  unlocked: boolean;
};

export function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

export function isTrainingInProgress(
  completed: number,
  next: Session | null | undefined,
  nextProgress: SessionProgress | null
) {
  return Boolean(next) && (completed > 0 || sessionInProgress(nextProgress));
}

export function FatherTrainingCatalogCard({
  title,
  description,
  subtitle,
  coverSrc,
  completed,
  total,
  next,
  nextProgress,
  sessionDots,
  certificateId,
  featured,
  quiet,
  gated,
  gatedLabel,
  hrefOverride,
  sessionHref,
  hasOverview,
  overviewHref,
  overviewUrl,
  showOverviewSlot,
  handouts,
  t,
}: {
  title: string;
  description: string | null;
  subtitle?: string | null;
  coverSrc: string | null | undefined;
  completed: number;
  total: number;
  next: Session | null | undefined;
  nextProgress: SessionProgress | null;
  sessionDots: TrainingCatalogDot[];
  certificateId?: string | null;
  featured?: boolean;
  sideBySide?: boolean;
  quiet?: boolean;
  gated?: boolean;
  gatedLabel?: string | null;
  hrefOverride?: string | null;
  sessionHref?: (sessionId: string) => string;
  hasOverview?: boolean;
  overviewHref?: string | null;
  overviewUrl?: string | null;
  showOverviewSlot?: boolean;
  handouts?: TrainingHandout[];
  t: Translate;
}) {
  const complete = !next && total > 0 && completed >= total;
  const firstSessionId = sessionDots[0]?.id;
  const watchAgainHref =
    complete && firstSessionId
      ? sessionHref?.(firstSessionId) ?? sessionFilmPath(firstSessionId)
      : null;
  const started = hasStartedTrainingWork(completed, nextProgress, sessionDots);
  const overviewLink = overviewHref ?? null;
  const showOverviewMedia = shouldShowCatalogOverview({
    enabled:
      Boolean(showOverviewSlot ?? hasOverview ?? overviewLink ?? overviewUrl) &&
      Boolean(hasOverview || hasHostedVideo(overviewUrl) || overviewLink),
    gated,
    completed,
    progress: nextProgress,
    sessionDots,
  });
  const href = gated
    ? null
    : showOverviewMedia && overviewLink
      ? overviewLink
      : hrefOverride ?? (next ? sessionFilmPath(next.id) : watchAgainHref);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const ctaLabel =
    showOverviewMedia && overviewLink
      ? t("father.trainings.watchOverview")
      : next
      ? started
        ? t("father.trainings.openSession", { n: next.session_number })
        : t("father.trainings.startSessionN", { n: next.session_number })
      : href
        ? t("father.trainings.watchAgain")
        : null;
  const landscape = showOverviewMedia;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        featured && !showOverviewMedia ? "border-primary/35" : "border-border",
        landscape && "lg:grid lg:grid-cols-2 lg:items-stretch"
      )}
    >
      {showOverviewMedia ? (
        <div className="min-w-0 border-b-2 border-primary bg-primary/5 p-3 lg:border-b-0 lg:border-e-2">
          <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
            {t("father.trainings.overviewEyebrow")}
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border-2 border-primary">
            {hasHostedVideo(overviewUrl) || (hasOverview && overviewUrl) ? (
              <HostedFilmPlayer
                url={overviewUrl}
                title={t("father.trainings.overviewTitle", { title })}
                coverSrc={coverSrc}
              />
            ) : overviewLink ? (
              <Link
                href={overviewLink}
                aria-label={t("father.trainings.watchOverview")}
                className={cn(
                  "relative block aspect-video overflow-hidden bg-[#101510]",
                  interactiveSurfaceClassName
                )}
              >
                <CoverPhoto src={coverSrc} />
              </Link>
            ) : (
              <div className="relative aspect-video overflow-hidden bg-[#101510]">
                <CoverPhoto src={coverSrc} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:p-6">
        <div className="space-y-2">
          {href ? (
            <Link href={href} className={cn("block", interactiveLinkClassName)}>
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
          )}
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          {gated ? (
            <p className="text-sm text-muted-foreground">{gatedLabel}</p>
          ) : description ? (
            <p
              className={cn(
                "text-sm text-muted-foreground",
                landscape ? "line-clamp-3" : "line-clamp-2"
              )}
            >
              {description}
            </p>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">{t("father.home.sessionsReady")}</p>
          ) : null}
        </div>

        {gated ? null : next ? (
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">
              {t("father.trainings.nextSession", { title: next.title })}
            </p>
            {total > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("father.trainings.sessionOf", { n: next.session_number, total })}
              </p>
            ) : null}
            <FilmRuntime seconds={next.duration_seconds} t={t} />
          </div>
        ) : complete ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("father.trainings.trainingComplete")}</p>
            {href ? (
              <p className="text-sm text-muted-foreground">
                {t("father.trainings.watchAgainHint")}
              </p>
            ) : null}
          </div>
        ) : null}

        {!gated && total > 0 ? (
          <div className="space-y-2">
            <p className="text-sm tabular-nums text-muted-foreground">
              {t("father.trainings.sessionsComplete", { completed, total })}
            </p>
            <ProgressBar
              value={percent}
              label={t("father.trainings.sessionsComplete", { completed, total })}
            />
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          {href && ctaLabel ? (
            <Link
              href={href}
              className={cn(
                buttonVariants({
                  size: "lg",
                  variant: quiet ? "outline" : "default",
                }),
                quiet ? "w-full min-h-12" : homePrimaryCtaClassName
              )}
            >
              {ctaLabel}
            </Link>
          ) : null}
          {certificateId ? (
            <a
              href={`/api/certificates/${certificateId}/download`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full min-h-11 sm:w-auto"
              )}
            >
              {t("father.trainings.downloadCertificate")}
            </a>
          ) : null}
          {!gated && sessionDots.length > 0 ? (
            <SessionList dots={sessionDots} nextId={next?.id} sessionHref={sessionHref} t={t} />
          ) : null}
          <TrainingHandoutLinks handouts={handouts ?? []} t={t} />
        </div>
      </div>
    </article>
  );
}

function SessionList({
  dots,
  nextId,
  sessionHref,
  t,
}: {
  dots: TrainingCatalogDot[];
  nextId?: string;
  sessionHref?: (sessionId: string) => string;
  t: Translate;
}) {
  return (
    <details className="rounded-lg border border-border bg-black/20">
      <summary
        className={cn(
          "flex min-h-11 cursor-pointer list-none items-center px-3 py-2.5 text-sm text-muted-foreground select-none",
          interactiveControlClassName,
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        {t("father.trainings.seeSessions")}
      </summary>
      <ul className="border-t border-border">
        {dots.map((dot) => {
          const label = t("father.trainings.sessionLabel", {
            n: dot.number,
            title: dot.title,
          });
          const rowClass = cn(
            "flex min-h-11 items-center justify-between gap-3 px-3 py-2.5 text-sm",
            dot.id === nextId && "text-foreground",
            !dot.unlocked && "text-muted-foreground/70"
          );
          const status = dot.done ? t("father.trainings.sessionDone") : null;

          if (!dot.unlocked) {
            return (
              <li key={dot.id} className={rowClass}>
                <span className="min-w-0 text-pretty">{label}</span>
              </li>
            );
          }

          return (
            <li key={dot.id}>
              <Link
                href={sessionHref?.(dot.id) ?? `/father/sessions/${dot.id}`}
                className={cn(rowClass, interactiveSurfaceClassName)}
                aria-label={label}
              >
                <span className="min-w-0 text-pretty">{label}</span>
                {status ? (
                  <span className="shrink-0 text-muted-foreground">{status}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
