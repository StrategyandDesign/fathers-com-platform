import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { TrainingStageBanner } from "@/components/admin/training-stage-banner";
import { TrainingHandoutLinks } from "@/components/father/training-handout-links";
import { TrainingOverviewFilm } from "@/components/father/training-overview-film";
import { buttonVariants } from "@/components/ui/button";
import { hasTrainingOverview } from "@/lib/father/training-door";
import { requireAdminStageTraining, stagePaths } from "@/lib/admin/stage";
import { getI18n } from "@/lib/i18n/server";
import { resolveTrainingCardCover } from "@/lib/org-photos/data";
import { loadTrainingHandouts } from "@/lib/training-handouts/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { homePrimaryCtaClassName, interactiveLinkClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingStageOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const training = await requireAdminStageTraining(id);
  const { t, locale } = await getI18n();
  const handouts = await loadTrainingHandouts(training.id);
  const paths = stagePaths(training.id);
  const first = training.sessions[0] ?? null;

  if (!hasTrainingOverview(training)) {
    redirect(first ? paths.session(first.id) : paths.hub);
  }

  const coverSrc = resolveTrainingCardCover(trainingCoverSlug(training), null, "default");

  return (
    <div className="space-y-6">
      <TrainingStageBanner
        trainingTitle={training.title}
        hubHref={paths.hub}
        editHref={paths.edit}
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={paths.hub}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground",
            interactiveLinkClassName
          )}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
          {t("father.trainings.backToTrainings")}
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase sm:text-xs sm:tracking-[0.18em]">
            {t("father.trainings.overviewEyebrow")}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {training.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("father.trainings.overviewLead")}
          </p>
        </header>

        <TrainingOverviewFilm
          url={training.overview_video_url}
          title={t("father.trainings.overviewTitle", { title: training.title })}
          coverSrc={coverSrc}
          language={locale}
          badge={t("father.trainings.overviewBadge")}
          notSession={t("father.trainings.overviewNotSession")}
        />

        <TrainingHandoutLinks handouts={handouts} t={t} layout="card" />

        {training.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {training.description}
          </p>
        ) : null}

        {first ? (
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {t("father.trainings.overviewThen")}
            </p>
            <p className="font-heading text-lg font-semibold tracking-tight">
              {t("father.trainings.nextSession", { title: first.title })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("father.trainings.sessionOf", {
                n: first.session_number,
                total: training.sessions.length,
              })}
            </p>
            <Link
              href={paths.session(first.id)}
              className={cn(buttonVariants({ size: "lg" }), homePrimaryCtaClassName)}
            >
              {t("father.trainings.startSessionN", { n: first.session_number })}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
