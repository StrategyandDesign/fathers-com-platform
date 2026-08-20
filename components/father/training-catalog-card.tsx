import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { FilmRuntime } from "@/components/father/film-runtime";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { shouldShowCatalogOverview } from "@/lib/father/training-door";
import { sessionFilmPath, type Session, type SessionProgress } from "@/lib/father/types";
import type { Translate } from "@/lib/i18n/translate";
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
  showOverviewSlot,
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
  quiet?: boolean;
  gated?: boolean;
  gatedLabel?: string | null;
  hrefOverride?: string | null;
  sessionHref?: (sessionId: string) => string;
  hasOverview?: boolean;
  overviewHref?: string | null;
  showOverviewSlot?: boolean;
  t: Translate;
}) {
  const href = gated
    ? null
    : hrefOverride ?? (next ? sessionFilmPath(next.id) : null);
  const started =
    completed > 0 ||
    sessionInProgress(nextProgress) ||
    sessionDots.some((dot) => dot.done);
  const complete = !next && total > 0 && completed >= total;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const ctaLabel = next
    ? started
      ? t("father.trainings.openSession", { n: next.session_number })
      : t("father.trainings.startSessionN", { n: next.session_number })
    : null;
  const openLabel = next
    ? t("father.trainings.sessionLabel", { n: next.session_number, title: next.title })
    : title;
  const overviewLink = overviewHref ?? null;
  const listOverview = shouldShowCatalogOverview({
    enabled: showOverviewSlot,
    gated,
    completed,
    progress: nextProgress,
    sessionDots,
  });

  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        featured ? "border-primary/35" : "border-border",
        featured && "lg:grid lg:grid-cols-2 lg:items-stretch"
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-label={openLabel}
          className={cn(
            "relative block overflow-hidden bg-[#101510]",
            featured
              ? "h-44 sm:h-52 lg:h-auto lg:min-h-[17rem]"
              : quiet
                ? "h-32 sm:h-36"
                : "h-40 sm:h-44",
            interactiveSurfaceClassName
          )}
        >
          <CoverPhoto src={coverSrc} />
        </Link>
      ) : (
        <div
          className={cn(
            "relative overflow-hidden bg-[#101510]",
            featured ? "h-44 sm:h-52 lg:h-auto lg:min-h-[17rem]" : "h-32 sm:h-36"
          )}
        >
          <CoverPhoto src={coverSrc} />
        </div>
      )}

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
                featured ? "line-clamp-3" : "line-clamp-2"
              )}
            >
              {description}
            </p>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">{t("father.home.sessionsReady")}</p>
          ) : null}
        </div>

        {listOverview ? (
          <div
            className={cn(
              "rounded-lg px-3 py-3",
              overviewLink
                ? "border-2 border-primary bg-primary/5"
                : "border border-dashed border-border bg-black/10"
            )}
          >
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {t("father.trainings.overviewEyebrow")}
            </p>
            {overviewLink && hasOverview ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("father.trainings.overviewSlotBody")}
                </p>
                <Link
                  href={overviewLink}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-3 min-h-10 w-full sm:w-auto"
                  )}
                >
                  {t("father.trainings.watchOverview")}
                </Link>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("father.trainings.overviewMissing")}
              </p>
            )}
          </div>
        ) : null}

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
          <p className="text-sm text-muted-foreground">{t("father.trainings.trainingComplete")}</p>
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
