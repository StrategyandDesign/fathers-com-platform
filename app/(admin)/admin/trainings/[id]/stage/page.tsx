import Link from "next/link";

import { ParticipantSnapshotFrame } from "@/components/admin/participant-snapshot-frame";
import { TrainingStageBanner } from "@/components/admin/training-stage-banner";
import { TrainingStageDesk } from "@/components/admin/training-stage-desk";
import { CoverPhoto } from "@/components/brand/cover";
import { FirstVisitIntro } from "@/components/father/first-visit-intro";
import { FatherTrainingCatalogCard } from "@/components/father/training-catalog-card";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress";
import {
  stageCatalogTotal,
  stagePaths,
  requireAdminStageTraining,
} from "@/lib/admin/stage";
import { sessionCover } from "@/lib/brand/photos";
import { getI18n } from "@/lib/i18n/server";
import { resolveTrainingCardCover } from "@/lib/org-photos/data";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function AdminTrainingStagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; walked?: string; error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const training = await requireAdminStageTraining(id);
  const { t } = await getI18n();
  const paths = stagePaths(training.id);
  const view = flash.view === "catalog" ? "catalog" : "home";
  const first = training.sessions[0] ?? null;
  const total = stageCatalogTotal(training);
  const walked = training.sessions.find((session) => session.id === flash.walked);
  const coverSrc = resolveTrainingCardCover(trainingCoverSlug(training), null, "default");
  const sessionSubtitle =
    total === 1
      ? t("father.home.sessionOne")
      : t("father.home.sessionMany", { n: total });
  const heroCover = first ? sessionCover(first.session_number, "default") : coverSrc;
  const firstHref = first ? paths.session(first.id) : paths.edit;
  const sessionDots = training.sessions.map((session) => ({
    id: session.id,
    number: session.session_number,
    title: session.title,
    done: false,
    unlocked: true,
  }));

  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <Link href="/admin/trainings" className={interactiveLinkClassName}>
          Trainings
        </Link>
        <span className="text-white/20">|</span>
        <Link href={paths.edit} className={interactiveLinkClassName}>
          {training.title}
        </Link>
        <span className="text-white/20">|</span>
        <span>Staging</span>
      </p>

      <TrainingStageBanner
        trainingTitle={training.title}
        hubHref={paths.hub}
        editHref={paths.edit}
      />

      <Flash
        error={flash.error}
        notice={
          flash.notice ??
          (walked
            ? `You walked Session ${walked.session_number} as a participant. Nothing was saved.`
            : undefined)
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                What he sees
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Same Home card and Trainings card a Father gets after a Leader
                assigns this. Language follows your Account setting. Nothing
                here writes progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`${paths.hub}?view=home`}
                className={cn(
                  buttonVariants({
                    variant: view === "home" ? "default" : "outline",
                    size: "sm",
                  })
                )}
              >
                Home
              </Link>
              <Link
                href={`${paths.hub}?view=catalog`}
                className={cn(
                  buttonVariants({
                    variant: view === "catalog" ? "default" : "outline",
                    size: "sm",
                  })
                )}
              >
                Trainings
              </Link>
            </div>
          </div>

          <ParticipantSnapshotFrame hubHref={paths.hub} view={view}>
            {view === "catalog" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                    {t("father.trainings.title")}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    {t("father.trainings.lead")}
                  </p>
                </div>
                {first ? (
                  <FatherTrainingCatalogCard
                    title={training.title}
                    description={training.description}
                    subtitle={sessionSubtitle}
                    coverSrc={coverSrc}
                    completed={0}
                    total={total}
                    next={first}
                    nextProgress={null}
                    sessionDots={sessionDots}
                    featured
                    hrefOverride={firstHref}
                    sessionHref={paths.session}
                    t={t}
                  />
                ) : (
                  <EmptyState
                    title={t("father.trainings.emptyTitle")}
                    actionHref={paths.edit}
                    actionLabel="Add a session"
                  >
                    {t("father.trainings.emptyBody")}
                  </EmptyState>
                )}
              </div>
            ) : first ? (
              <div className="space-y-8">
                <FirstVisitIntro
                  href={firstHref}
                  trainingTitle={training.title}
                  sessionTitle={first.title}
                  sessionNumber={first.session_number}
                  total={total}
                  completed={0}
                  percent={0}
                  coverSrc={heroCover}
                />
                <section className="space-y-3">
                  <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]">
                    {t("father.home.yourTrainings")}
                  </p>
                  <Link
                    href={firstHref}
                    className={cn(
                      "overflow-hidden rounded-xl border border-border bg-card",
                      interactiveSurfaceClassName
                    )}
                  >
                    <div className="h-28 overflow-hidden rounded-t-xl bg-[#101510] sm:h-32">
                      <CoverPhoto src={coverSrc} />
                    </div>
                    <div className="p-4 sm:p-5">
                      <p className="font-heading text-sm font-semibold sm:text-base">
                        {training.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{sessionSubtitle}</p>
                      <div className="mt-4 space-y-2">
                        <ProgressBar value={0} />
                        <p className="text-sm text-muted-foreground">
                          {t("father.home.sessionsCount", { completed: 0, total })}
                        </p>
                      </div>
                    </div>
                  </Link>
                </section>
              </div>
            ) : (
              <EmptyState
                title={t("father.home.waitingManager")}
                actionHref={paths.edit}
                actionLabel="Add a session"
              >
                {t("father.home.waitEmpty")}
              </EmptyState>
            )}
          </ParticipantSnapshotFrame>
          <p className="text-sm text-muted-foreground">
            Every session is open so you can inspect the full path. Fathers
            finish Film, then Check-in, then Action, in order. This walk does
            not write session_progress. Covers are the platform defaults.
          </p>
        </div>

        <TrainingStageDesk training={training} />
      </div>
    </div>
  );
}
