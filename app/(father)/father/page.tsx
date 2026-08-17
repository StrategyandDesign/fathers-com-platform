import { cookies } from "next/headers";
import Link from "next/link";

import { AssignedAssessmentList } from "@/components/assessments/assigned-list";
import { CoverPhoto } from "@/components/brand/cover";
import { FirstVisitIntro } from "@/components/father/first-visit-intro";
import { DimensionScores } from "@/components/profile/dimension-scores";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { loadFatherAssignments } from "@/lib/assessments/data";
import { takeHref } from "@/lib/assessments/types";
import { requireRole } from "@/lib/auth/session";
import { startProfile } from "@/lib/father/profile-actions";
import { loadFatherHome } from "@/lib/father/data";
import {
  loadFatherOrgPhotoCovers,
  resolveHomeHeroCover,
  resolveHomeProfileCover,
  resolveTrainingCardCover,
} from "@/lib/org-photos/data";
import {
  FATHERS_INTRO_SEEN_KEY,
  isFathersIntroSeenValue,
} from "@/lib/father/intro-seen";
import { PROFILE_QUESTION_COUNT, firstUnanswered } from "@/lib/father/questions";
import { continueHref, type SessionProgress } from "@/lib/father/types";
import { readStoredDimensionScores } from "@/lib/profile/score";
import { translateThemeLabel } from "@/lib/i18n/flash";
import { formatLongDate, getI18n } from "@/lib/i18n/server";
import { interactiveLinkClassName, interactiveSurfaceClassName } from "@/lib/ui";
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

export default async function FatherHomePage() {
  const { user } = await requireRole("father");
  const { t, locale } = await getI18n();
  const [{ trainingCards, next, profile, draft }, customAssignments, orgPhotos] =
    await Promise.all([
      loadFatherHome(user.id),
      loadFatherAssignments(user.id),
      loadFatherOrgPhotoCovers(user.id),
    ]);
  const heroCover = next
    ? resolveHomeHeroCover(next.session.session_number, orgPhotos.heroUrl, orgPhotos.photoPack)
    : null;
  const profileCoverSrc = resolveHomeProfileCover(orgPhotos.profileUrl, orgPhotos.photoPack);

  const nextCard = next
    ? trainingCards.find((card) => card.training.id === next.training.id)
    : undefined;
  const nextCompleted = nextCard?.completed ?? 0;
  const nextTotal = nextCard?.total ?? next?.training.session_count ?? 0;
  const nextPercent =
    next && nextTotal > 0 ? Math.round((nextCompleted / nextTotal) * 100) : 0;
  const hasTraining = trainingCards.length > 0;
  const profileNeedsAction = !profile;
  const profileIsPrimary = !next && profileNeedsAction;
  const pendingAssessment = customAssignments.find(
    (item) => item.assignment.status !== "completed"
  );
  const assessmentIsPrimary = !next && !profileNeedsAction && Boolean(pendingAssessment);
  const issuedCertificates = trainingCards.filter((card) => card.certificate);
  const nextInProgress = sessionInProgress(next?.progress ?? null);
  const neverStarted = Boolean(next) && nextCompleted === 0 && !nextInProgress;
  const introSeen = isFathersIntroSeenValue(
    (await cookies()).get(FATHERS_INTRO_SEEN_KEY)?.value
  );
  const showFirstVisitIntro = neverStarted && !introSeen;
  const heroLabel = neverStarted
    ? t("father.home.startHere")
    : nextInProgress
      ? t("father.home.continueTraining")
      : t("father.home.upNext");
  const continueLabel = nextInProgress
    ? t("father.home.continueSession")
    : t("father.home.startSession");
  const profileResumeAt = draft ? firstUnanswered(draft.answers) : 1;
  const profileContinueHref = `/father/profile/take?q=${profileResumeAt}`;
  const profileScores = profile
    ? readStoredDimensionScores(profile.raw_scores, profile.full_results)
    : null;

  const emptyEyebrow = hasTraining
    ? trainingCards.length === 1
      ? trainingCards[0].training.title
      : t("father.home.allComplete")
    : t("father.home.noTraining");
  const emptyTitle = hasTraining
    ? t("father.home.caughtUp")
    : profileIsPrimary
      ? draft
        ? t("father.home.continueProfile")
        : t("father.home.takeProfile")
      : assessmentIsPrimary
        ? (pendingAssessment?.assessment.title ?? t("father.home.takeAssessment"))
        : t("father.home.waitingManager");
  const emptyBody = hasTraining
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

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        {next ? (
          <FirstVisitIntro
            eligible={showFirstVisitIntro}
            href={continueHref(next.session.id, next.progress)}
            trainingTitle={next.training.title}
            trainingDescription={next.training.description}
            sessionNumber={next.session.session_number}
            total={nextTotal}
            completed={nextCompleted}
            percent={nextPercent}
            coverSrc={heroCover}
          >
            <div className="min-w-0 space-y-2">
              <p className={eyebrowClassName}>{heroLabel}</p>
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="h-24 overflow-hidden bg-[#101510] sm:h-36 lg:h-44">
                  <CoverPhoto src={heroCover} />
                </div>
                <div className="space-y-5 p-4 sm:p-5 lg:p-6">
                  <div>
                    <p className={eyebrowClassName}>
                      {neverStarted
                        ? nextTotal > 0
                          ? t("father.home.sessionOf", {
                              n: next.session.session_number,
                              total: nextTotal,
                            })
                          : t("father.home.sessionN", { n: next.session.session_number })
                        : nextTotal > 0
                          ? t("father.home.sessionOfTraining", {
                              n: next.session.session_number,
                              total: nextTotal,
                              title: next.training.title,
                            })
                          : t("father.home.sessionTraining", {
                              n: next.session.session_number,
                              title: next.training.title,
                            })}
                    </p>
                    <h1 className="font-heading mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                      {neverStarted ? next.training.title : next.session.title}
                    </h1>
                    {neverStarted ? (
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        {t("father.home.startRhythm")}
                      </p>
                    ) : next.session.keyline ? (
                      <p className="mt-1 text-sm text-muted-foreground">{next.session.keyline}</p>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {nextTotal > 0 ? (
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
                    <Link
                      href={continueHref(next.session.id, next.progress)}
                      className={cn(
                        buttonVariants({ variant: "inverse", size: "lg" }),
                        "w-full sm:w-auto"
                      )}
                    >
                      {neverStarted ? t("father.home.startOverview") : continueLabel}
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </FirstVisitIntro>
        ) : (
          <section className="flex flex-col justify-center rounded-xl border border-border bg-card p-4 sm:p-6 lg:p-8">
            <p className={eyebrowClassName}>
              {emptyEyebrow}
            </p>
            <h1 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              {emptyTitle}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{emptyBody}</p>
            {profileIsPrimary ? (
              <div className="mt-6">
                {draft ? (
                  <Link
                    href={profileContinueHref}
                    className={cn(
                      buttonVariants({ variant: "inverse", size: "lg" }),
                      "w-full sm:w-auto"
                    )}
                  >
                    {t("father.home.continueProfile")}
                  </Link>
                ) : (
                  <form action={startProfile}>
                    <Button type="submit" variant="inverse" size="lg" className="w-full sm:w-auto">
                      {t("father.home.takeProfile")}
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
            {assessmentIsPrimary && pendingAssessment ? (
              <div className="mt-6">
                <Link
                  href={takeHref(pendingAssessment.assignment.id)}
                  className={cn(
                    buttonVariants({ variant: "inverse", size: "lg" }),
                    "w-full sm:w-auto"
                  )}
                >
                  {pendingAssessment.assignment.status === "in_progress"
                    ? t("father.home.continueAssessment")
                    : t("father.home.takeAssessment")}
                </Link>
              </div>
            ) : null}
            {!profileIsPrimary && !assessmentIsPrimary && profile ? (
              <div className="mt-6">
                <Link
                  href="/father/profile"
                  className={cn(
                    buttonVariants({ variant: "inverse", size: "lg" }),
                    "w-full sm:w-auto"
                  )}
                >
                  {t("father.home.viewProfile")}
                </Link>
              </div>
            ) : null}
          </section>
        )}

        <section className="relative flex min-h-56 flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {/* Local public photo or org override; plain img matches CoverPhoto usage. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profileCoverSrc}
              alt=""
              className="h-full w-full object-cover object-[center_62%] opacity-45"
            />
            <div className="absolute inset-0 bg-[#141414]/50" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a0a0a]/50 via-[#0a0a0a]/25 to-transparent" />
            {profile ? (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/18 via-[#1c1c1c]/70 to-[#101510]/80" />
            ) : null}
          </div>
          <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-5">
            <p className={eyebrowClassName}>
              {t("father.home.profile")}
            </p>
            {profile ? (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("father.home.primaryDetermination")}
                </p>
                <p className="font-heading mt-1 text-xl font-semibold tracking-tight uppercase">
                  {translateThemeLabel(profile.primary_determination, t)}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{t("father.home.primaryEdge")}</p>
                <p className="mt-1 font-medium uppercase">
                  {translateThemeLabel(profile.primary_edge, t)}
                </p>
                {profileScores ? (
                  <DimensionScores scores={profileScores} className="mt-5 space-y-4" />
                ) : null}
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("father.home.taken", { date: formatLongDate(profile.taken_at, locale) })}
                </p>
                <div className="mt-auto pt-5">
                  <Link
                    href="/father/profile"
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    {t("father.home.viewProfile")}
                  </Link>
                </div>
              </>
            ) : draft ? (
              <>
                <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  {t("father.home.inProgress")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("father.home.questionOf", {
                    n: firstUnanswered(draft.answers),
                    total: PROFILE_QUESTION_COUNT,
                  })}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("father.home.profileReminder")}
                </p>
                {profileIsPrimary ? null : (
                  <div className="mt-auto pt-5">
                    <Link
                      href={profileContinueHref}
                      className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                    >
                      {t("father.home.continueProfile")}
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                  {t("father.home.takeProfileTitle")}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("father.home.takeProfileBody")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("father.home.profileReminder")}
                </p>
                {profileIsPrimary ? null : (
                  <form action={startProfile} className="mt-auto pt-5">
                    <Button type="submit" variant="outline" className="w-full">
                      {t("father.home.takeProfile")}
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {trainingCards.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <p className={eyebrowClassName}>
              {t("father.home.yourTrainings")}
            </p>
            {issuedCertificates.length > 0 ? (
              <Link
                href="/father/certificates"
                className={cn("text-sm text-muted-foreground", interactiveLinkClassName)}
              >
                {t("father.home.viewCertificates")}
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {trainingCards.map(({ training, completed, total, next: trainingNext, nextProgress }) => {
              const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
              const complete = total > 0 && completed === total;
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
                          : complete
                            ? t("common.complete")
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
  );
}
