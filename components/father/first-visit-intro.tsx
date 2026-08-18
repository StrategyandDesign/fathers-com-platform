import Link from "next/link";

import { CoverPhoto } from "@/components/brand/cover";
import { buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { getI18n } from "@/lib/i18n/server";
import { homePrimaryCtaClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

export async function FirstVisitIntro({
  href,
  trainingTitle,
  sessionTitle,
  sessionNumber,
  total,
  completed,
  percent,
  coverSrc,
  assessmentLater = false,
  profileLater = false,
}: {
  href: string;
  trainingTitle: string;
  sessionTitle: string;
  sessionNumber: number;
  total: number;
  completed: number;
  percent: number;
  coverSrc?: string | null;
  assessmentLater?: boolean;
  profileLater?: boolean;
}) {
  const { t } = await getI18n();

  return (
    <div className="min-w-0 space-y-2">
      <p className={eyebrowClassName}>{t("father.home.startHere")}</p>
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-20 overflow-hidden bg-[#101510] sm:h-32 lg:h-40">
          <CoverPhoto src={coverSrc} />
        </div>
        <div className="space-y-5 p-4 sm:p-5 lg:p-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {trainingTitle}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t("father.intro.fallbackBody", { title: trainingTitle })}
            </p>
            <p className="mt-3 text-sm font-medium text-foreground sm:text-base">
              {t("father.home.sessionOfTraining", {
                n: sessionNumber,
                total: total || sessionNumber,
                title: sessionTitle,
              })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t("father.home.startRhythm")}
            </p>
            {assessmentLater ? (
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {t("father.home.assessmentLater")}
              </p>
            ) : null}
            {profileLater ? (
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {t("father.home.profileLater")}
              </p>
            ) : null}
          </div>
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), homePrimaryCtaClassName)}
          >
            {t("father.home.startOverview")}
          </Link>
          {total > 0 ? (
            <div className="space-y-2">
              <ProgressBar value={percent} />
              <p className="text-sm text-muted-foreground">
                {t("father.home.sessionsComplete", { completed, total })}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
