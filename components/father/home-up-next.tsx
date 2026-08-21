import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { FilmRuntimeChip } from "@/components/father/film-runtime";
import { HomeQuietProgress } from "@/components/father/home-quiet-progress";
import { buttonVariants } from "@/components/ui/button";
import type { Translate } from "@/lib/i18n/translate";
import { homePrimaryCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export function HomeUpNextCard({
  href,
  trainingTitle,
  sessionTitle,
  subtitle,
  durationSeconds,
  continueSession,
  startWithOverview,
  completed,
  total,
  justFinished,
  coverSrc,
  className,
  t,
}: {
  href: string;
  trainingTitle: string;
  sessionTitle: string;
  subtitle?: string | null;
  durationSeconds?: number | null;
  continueSession: boolean;
  startWithOverview?: boolean;
  completed: number;
  total: number;
  justFinished?: boolean;
  coverSrc?: string | null;
  className?: string;
  t: Translate;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const from =
    justFinished && total > 0
      ? Math.round((Math.max(0, completed - 1) / total) * 100)
      : undefined;

  return (
    <div className={cn("flex h-full min-w-0 flex-col gap-3", className)}>
      <p className={eyebrowClassName}>{t("father.home.upNext")}</p>
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card",
          startWithOverview ? "border-2 border-primary" : "border-border"
        )}
      >
        {startWithOverview ? (
          <div className="h-36 shrink-0 overflow-hidden border-b-2 border-primary bg-[#101510] sm:h-44 lg:h-48">
            <CoverPhoto src={coverSrc} />
          </div>
        ) : (
          <div className="h-36 shrink-0 overflow-hidden bg-[#101510] sm:h-44 lg:h-48">
            <CoverPhoto src={coverSrc} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-3 px-3.5 py-3.5 sm:px-5 sm:py-5">
          <p className="text-sm text-muted-foreground">{trainingTitle}</p>
          <h1 className="font-heading text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {sessionTitle}
          </h1>
          {subtitle ? (
            <p className="line-clamp-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          <FilmRuntimeChip seconds={durationSeconds} t={t} />
          <Link
            href={href}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              homePrimaryCtaClassName,
              "mt-auto"
            )}
          >
            {startWithOverview
              ? t("father.trainings.watchOverview")
              : continueSession
                ? t("father.home.continueSession")
                : t("father.home.start")}
          </Link>
        </div>
        {total > 0 ? (
          <div className="space-y-1.5 px-3.5 pb-3.5 sm:px-5 sm:pb-5">
            <HomeQuietProgress
              value={percent}
              from={from}
              label={t("father.home.sessionsComplete", { completed, total })}
            />
            <p className="text-sm text-muted-foreground">
              {t("father.home.sessionsComplete", { completed, total })}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
