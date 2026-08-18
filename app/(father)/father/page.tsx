import Link from "next/link";

import { AssessmentHomeCard } from "@/components/assessments/home-card";
import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { CoverPhoto } from "@/components/brand/cover";
import { FirstVisitIntro } from "@/components/father/first-visit-intro";
import { SessionCompleteMark } from "@/components/father/session-complete-mark";
import { ProfileHomeCard } from "@/components/profile/home-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { loadProfileFullName } from "@/lib/account/data";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { pickFeaturedAssignment, takeHref } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { startProfile } from "@/lib/father/profile-actions";
import { loadFatherHome } from "@/lib/father/data";
import { firstUnanswered } from "@/lib/father/questions";
import {
  loadFatherOrgPhotoCovers,
  resolveHomeHeroCover,
  resolveHomeProfileCover,
  resolveTrainingCardCover,
} from "@/lib/org-photos/data";
import { continueHref, type SessionProgress } from "@/lib/father/types";
import { getI18n } from "@/lib/i18n/server";
import { homePrimaryCtaClassName, interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
import { cn } from "@/lib/utils";

const eyebrowClassName =
  "text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:text-xs sm:tracking-[0.18em]";

function sessionInProgress(progress: SessionProgress | null) {
  if (!progress) return false;
  return (
    progress.film_completed ||
    progress.checkin_completed ||
    progress.action_completed ||
    progress.status === "in_progress"
  );
}

export default async function FatherHomePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  const { user } = await requireRole("father");
  const { t } = await getI18n();
  const [{ trainingCards, next, profile, draft }, customAssignments, orgPhotos, fatherName] =
    await Promise.all([
      loadFatherHome(user.id),
      loadFatherAssignments(user.id),
      loadFatherOrgPhotoCovers(user.id),
      loadProfileFullName(user.id),
    ]);
  const heroCover = next
    ? resolveHomeHeroCover(next.session.session_number, orgPhotos.heroUrl, orgPhotos.photoPack)
    : null;
  const assessmentCoverSrc = resolveHomeProfileCover(orgPhotos.profileUrl, orgPhotos.photoPack);
  const featuredAssessment = pickFeaturedAssignment(customAssignments);
  const profileCoverSrc = assessmentCoverSrc;
  const profileNeedsAction = !profile;
  const profileIsPrimary = !next && profileNeedsAction;
  const profileContinueHref = `/father/profile/take?q=${draft ? firstUnanswered(draft.answers) : 1}`;

  const nextCard = next
    ? trainingCards.find((card) => card.training.id === next.training.id)
    : undefined;
  const finishedCard = done
    ? trainingCards.find((card) => card.sessionDots.some((dot) => dot.id === done && dot.done))
    : undefined;
  const justFinished = Boolean(finishedCard);
  const celebrateSameTraining = Boolean(
    justFinished && next && finishedCard && next.training.id === finishedCard.training.id
  );
  const nextCompleted = nextCard?.completed ?? 0;
  const nextTotal = nextCard?.total ?? next?.training.session_count ?? 0;
  const nextPercent =
    next && nextTotal > 0 ? Math.round((nextCompleted / nextTotal) * 100) : 0;
  const hasTraining = trainingCards.length > 0;
  const pendingAssessment = customAssignments.find(
    (item) => item.assignment.status !== "completed" && item.questionCount > 0
  );
  const assessmentIsPrimary = !next && !profileNeedsAction && Boolean(pendingAssessment);
  const nextInProgress = sessionInProgress(next?.progress ?? null);
  const neverStarted = Boolean(next) && nextCompleted === 0 && !nextInProgress;
  const firstSession =
    nextCard?.sessions.find((session) => session.session_number === 1) ??
    nextCard?.sessions[0] ??
    next?.session;
  const firstSessionHref = firstSession ? `/father/sessions/${firstSession.id}` : "";
  const heroLabel = nextInProgress
    ? t("father.home.continueTraining")
    : t("father.home.upNext");
  const continueLabel = nextInProgress
    ? t("father.home.continueSession")
    : t("father.home.startSession");

  const emptyEyebrow = hasTraining
    ? trainingCards.length === 1
      ? trainingCards[0].training.title
      : t("father.home.allComplete")
    : t("father.home.noTraining");
  const emptyTitle = justFinished
    ? t("father.home.doneForNow")
    : hasTraining
      ? t("father.home.caughtUp")
      : profileIsPrimary
        ? draft
          ? t("father.home.continueProfile")
          : t("father.home.takeProfile")
        : assessmentIsPrimary
          ? (pendingAssessment?.assessment.title ?? t("father.home.takeAssessment"))
          : t("father.home.waitingManager");
  const emptyBody = justFinished
    ? profileIsPrimary
      ? t("father.home.everyCompleteProfile")
      : assessmentIsPrimary
        ? t("father.home.everyCompleteAssessment")
        : t("father.home.doneForNowBody")
    : hasTraining
      ? profileIsPrimary
        ? t("father.home.everyCompleteProfile")
        : assessmentIsPrimary
          ? t("father.home.everyCompleteAssessment")
          : t("father.home.everyComplete")
      : profileIsPrimary
        ? t("father.home.waitProfile")
        : assessmentIsPrimary
          ? t("father.home.waitAssessment")
          : t("father.home.waitEmpty");
  const finishedTotal = finishedCard?.total ?? 0;
  const finishedCompleted = finishedCard?.completed ?? 0;
  const finishedPercent =
    finishedTotal > 0 ? Math.round((finishedCompleted / finishedTotal) * 100) : 0;

  const primaryCtaClassName = cn(
    buttonVariants({ variant: "default", size: "lg" }),
    homePrimaryCtaClassName
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)] lg:gap-8">
      {next ? (
        <div
          className={cn(
            "order-1 lg:col-start-1 lg:row-start-1",
            neverStarted && "max-lg:min-h-[calc(100svh-8.75rem)]"
          )}
        >
          {neverStarted && firstSession ? (
            <FirstVisitIntro
              href={firstSessionHref}
              trainingTitle={next.training.title}
              sessionTitle={firstSession.title}
              sessionNumber={firstSession.session_number}
              total={nextTotal}
              completed={nextCompleted}
              percent={nextPercent}
              coverSrc={heroCover}
              assessmentLater={Boolean(pendingAssessment)}
              profileLater={!profile}
            />
          ) : (
            <div className="min-w-0 space-y-2">
              {justFinished ? (
                <SessionCompleteMark />
              ) : (
                <p className={eyebrowClassName}>{heroLabel}</p>
              )}
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-20 overflow-hidden bg-[#101510] sm:h-32 lg:h-40">
                  <CoverPhoto src={heroCover} />
                </div>
                <div className="space-y-5 p-4 sm:p-5 lg:p-6">
                  {celebrateSameTraining && nextTotal > 0 ? (
                    <div className="space-y-2">
                      <ProgressBar value={nextPercent} />
                      <p className="text-sm text-muted-foreground">
                        {t("father.home.sessionsComplete", {
                          completed: nextCompleted,
                          total: nextTotal,
                        })}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                      {next.session.title}
                    </h1>
                    {next.session.keyline ? (
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        {next.session.keyline}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={continueHref(next.session.id, next.progress)}
                    className={primaryCtaClassName}
                  >
                    {continueLabel}
                  </Link>
                  {!celebrateSameTraining && nextTotal > 0 ? (
                    <div className="space-y-2">
                      <ProgressBar value={nextPercent} />
                      <p className="text-sm text-muted-foreground">
                        {t("father.home.sessionsComplete", {
                          completed: nextCompleted,
                          total: nextTotal,
                        })}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </div>
      ) : (
        <section className="order-1 flex flex-col justify-center rounded-xl border border-border bg-card p-4 sm:p-6 lg:col-start-1 lg:row-start-1 lg:p-8">
          {justFinished ? (
            <SessionCompleteMark />
          ) : (
            <p className={eyebrowClassName}>{emptyEyebrow}</p>
          )}
          <h1 className="font-heading mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {emptyTitle}
          </h1>
          {justFinished && finishedTotal > 0 ? (
            <div className="mt-4 space-y-2">
              <ProgressBar value={finishedPercent} />
              <p className="text-sm text-muted-foreground">
                {t("father.home.sessionsComplete", {
                  completed: finishedCompleted,
                  total: finishedTotal,
                })}
              </p>
            </div>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{emptyBody}</p>
          {profileIsPrimary ? (
            <div className="mt-6">
              {draft ? (
                <Link href={profileContinueHref} className={primaryCtaClassName}>
                  {t("father.home.continueProfile")}
                </Link>
              ) : (
                <form action={startProfile}>
                  <Button type="submit" variant="default" size="lg" className={homePrimaryCtaClassName}>
                    {t("father.home.takeProfile")}
                  </Button>
                </form>
              )}
            </div>
          ) : null}
          {assessmentIsPrimary && pendingAssessment ? (
            <div className="mt-6">
              <Link href={takeHref(pendingAssessment.assignment.id)} className={primaryCtaClassName}>
                {pendingAssessment.assignment.status === "in_progress"
                  ? t("father.home.continueAssessment")
                  : t("father.home.takeAssessment")}
              </Link>
            </div>
          ) : null}
          {!justFinished && !profileIsPrimary && !assessmentIsPrimary && profile ? (
            <div className="mt-6">
              <Link href="/father/profile/results" className={primaryCtaClassName}>
                {t("father.home.viewProfile")}
              </Link>
            </div>
          ) : null}
        </section>
      )}

      <div className="order-2 space-y-6 lg:col-start-2 lg:row-start-1">
        <AssessmentHomeCard
          card={featuredAssessment}
          coverSrc={assessmentCoverSrc}
          fatherName={fatherName}
        />
        <ProfileHomeCard
          profile={profile}
          draft={draft}
          coverSrc={profileCoverSrc}
          neverStarted={neverStarted}
          hideActions={profileIsPrimary}
        />
      </div>

      {trainingCards.length > 0 || customAssignments.length > 0 ? (
        <div className="order-4 space-y-8 lg:col-span-2">
          {trainingCards.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <p className={eyebrowClassName}>{t("father.home.yourTrainings")}</p>
                <Link
                  href="/father/certificates"
                  className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
                >
                  {t("father.home.viewCertificates")}
                </Link>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {trainingCards.map(({ training, completed, total, next: trainingNext, nextProgress }) => {
                  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
                  return (
                    <Link
                      key={training.id}
                      href={
                        trainingNext
                          ? continueHref(trainingNext.id, nextProgress)
                          : "/father/trainings"
                      }
                      className={cn(
                        "overflow-hidden rounded-xl border border-border bg-card",
                        interactiveSurfaceClassName
                      )}
                    >
                      <div className="h-28 overflow-hidden rounded-t-xl bg-[#101510] sm:h-32">
                        <CoverPhoto
                          src={resolveTrainingCardCover(
                            training.slug,
                            orgPhotos.trainingUrls[training.slug],
                            orgPhotos.photoPack
                          )}
                        />
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="font-heading text-sm font-semibold sm:text-base">
                          {training.title}
                        </p>
                        <div className="mt-4 space-y-2">
                          <ProgressBar value={percent} />
                          <p className="text-sm text-muted-foreground">
                            {total === 0
                              ? t("father.home.sessionsReady")
                              : t("father.home.sessionsCount", { completed, total })}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <AssignedAssessmentList
            assignments={customAssignments}
            title={t("father.home.assessments")}
            quiet
          />
        </div>
      ) : null}
    </div>
  );
}
