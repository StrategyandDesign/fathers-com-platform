import Link from "next/link";

import { FatherTrainingCatalogCard, isTrainingInProgress } from "@/components/father/training-catalog-card";
import { Flash } from "@/components/manager/flash";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { startLeaderAssessment } from "@/lib/assessments/actions";
import { requireRole } from "@/lib/auth/session";
import { startProfile } from "@/lib/father/profile-actions";
import { PROFILE_QUESTION_COUNT, answeredCount, firstUnanswered } from "@/lib/father/questions";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { loadManagerOrgPhotoCovers, resolveTrainingCardCover } from "@/lib/org-photos/data";
import { loadLeaderPractice } from "@/lib/practice/data";
import { hasStartedTrainingWork, hasTrainingOverview } from "@/lib/father/training-door";
import { sessionFilmPath } from "@/lib/father/types";
import { PRACTICE_ROOT } from "@/lib/practice/paths";
import { trainingCoverSlug } from "@/lib/trainings/series";
import { interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default async function LeaderPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; done?: string }>;
}) {
  const flash = await searchParams;
  const { user } = await requireRole("manager");
  const { t, locale } = await getI18n();
  const [practice, orgPhotos] = await Promise.all([
    loadLeaderPractice(user.id),
    loadManagerOrgPhotoCovers(user.id),
  ]);
  const { trainingCards, profile, draft, canStartKeystone, customAssessments } = practice;
  const resumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const answered = draft ? answeredCount(draft.answers) : 0;
  const keystoneHref = profile
    ? `${PRACTICE_ROOT}/profile/results`
    : draft
      ? `${PRACTICE_ROOT}/profile/take?q=${resumeAt}`
      : null;
  const keystoneStatus = profile
    ? t("father.assessments.completedOn", { date: formatLongDate(profile.taken_at, locale) })
    : draft
      ? t("father.profile.progress", {
          n: resumeAt,
          total: PROFILE_QUESTION_COUNT,
          answered,
        })
      : t("father.profile.takeHint");
  const showKeystone = Boolean(profile || draft || canStartKeystone);
  const showAssessments = showKeystone || customAssessments.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/manager"
          className={cn(buttonVariants({ variant: "ghost" }), "mb-3 -ms-3 text-sm text-muted-foreground")}
        >
          {t("manager.practice.backDashboard")}
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("manager.practice.title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t("manager.practice.lead")}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("manager.practice.noCertificate")}
        </p>
      </div>
      <Flash error={flash.error} notice={flash.notice} />

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{t("manager.practice.trainingsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("manager.practice.trainingsLead")}</p>
        </div>
        {trainingCards.length === 0 ? (
          <EmptyState
            title={t("manager.practice.trainingsEmptyTitle")}
            actionHref="/manager/trainings#catalog"
            actionLabel={t("manager.dashboard.openCatalog")}
          >
            {t("manager.practice.trainingsEmptyBody")}
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">
            {trainingCards.map((card) => {
              const inProgress = isTrainingInProgress(
                card.completed,
                card.next,
                card.nextProgress
              );
              return (
                <FatherTrainingCatalogCard
                  key={card.training.id}
                  title={card.training.title}
                  description={card.training.description}
                  subtitle={
                    card.total === 1
                      ? t("father.home.sessionOne")
                      : t("father.home.sessionMany", { n: card.total })
                  }
                  coverSrc={resolveTrainingCardCover(
                    trainingCoverSlug(card.training),
                    orgPhotos.trainingUrls[trainingCoverSlug(card.training)],
                    orgPhotos.photoPack
                  )}
                  completed={card.completed}
                  total={card.total}
                  next={card.next}
                  nextProgress={card.nextProgress}
                  sessionDots={card.sessionDots}
                  certificateId={null}
                  featured={inProgress}
                  hrefOverride={
                    card.next
                      ? sessionFilmPath(card.next.id, { root: PRACTICE_ROOT })
                      : null
                  }
                  sessionHref={(sessionId) => `${PRACTICE_ROOT}/sessions/${sessionId}`}
                  hasOverview={hasTrainingOverview(card.training)}
                  overviewUrl={card.training.overview_video_url}
                  showOverviewSlot={
                    hasTrainingOverview(card.training) &&
                    !hasStartedTrainingWork(card.completed, card.nextProgress, card.sessionDots)
                  }
                  t={t}
                />
              );
            })}
          </div>
        )}
      </section>

      <section id="assessments" className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            {t("manager.practice.assessmentsTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("manager.practice.assessmentsLead")}
          </p>
        </div>
        {!showAssessments ? (
          <p className="text-sm text-muted-foreground">{t("manager.practice.assessmentsEmpty")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {showKeystone ? (
                <li>
                  {keystoneHref ? (
                    <Link
                      href={keystoneHref}
                      className={cn(
                        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                        interactiveSurfaceClassName
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{t("father.profile.keystone")}</p>
                        <p className="text-sm text-muted-foreground">{keystoneStatus}</p>
                      </div>
                      <span className={cn(buttonVariants(), "pointer-events-none w-full sm:w-auto")}>
                        {profile
                          ? t("father.assessments.view")
                          : t("father.assessments.continue")}
                      </span>
                    </Link>
                  ) : (
                    <form
                      action={startProfile}
                      className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{t("father.profile.keystone")}</p>
                        <p className="text-sm text-muted-foreground">{keystoneStatus}</p>
                      </div>
                      <button type="submit" className={cn(buttonVariants(), "w-full sm:w-auto")}>
                        {t("father.assessments.take")}
                      </button>
                    </form>
                  )}
                </li>
              ) : null}
              {customAssessments.map(({ assessment, assignment }) => {
                const status = assignment?.assignment.status ?? "not_started";
                const href = assignment
                  ? `${PRACTICE_ROOT}/assessments/${assignment.assignment.id}`
                  : null;
                return (
                  <li key={assessment.id}>
                    {href ? (
                      <Link
                        href={href}
                        className={cn(
                          "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                          interactiveSurfaceClassName
                        )}
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{assessment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {t(
                              `father.assessments.${
                                status === "not_started"
                                  ? "notStarted"
                                  : status === "in_progress"
                                    ? "inProgress"
                                    : "completed"
                              }`
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "pointer-events-none w-full sm:w-auto"
                          )}
                        >
                          {status === "completed"
                            ? t("father.assessments.view")
                            : status === "in_progress"
                              ? t("father.assessments.continue")
                              : t("father.assessments.take")}
                        </span>
                      </Link>
                    ) : (
                      <form
                        action={startLeaderAssessment}
                        className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <input type="hidden" name="assessment_id" value={assessment.id} />
                        <div className="min-w-0">
                          <p className="font-medium">{assessment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("father.assessments.notStarted")}
                          </p>
                        </div>
                        <button
                          type="submit"
                          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                        >
                          {t("father.assessments.take")}
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
